import { useRef, useCallback } from "react";
import { VisibleSprite } from "@webav/av-cliper";
import { TimelineAction } from "@xzdarcy/react-timeline-editor";
import { generateId } from "@/lib/utils";
import { ActionSpriteManagerEvent, ActionSpriteManagerListener } from "@/types";

/**
 * Action 与 Sprite 映射关系管理器 Hooks
 * 负责维护 TimelineAction 与 VisibleSprite 之间的双向映射关系
 */
export function useActionSpriteManager() {
  // 使用 useRef 存储映射数据，确保在重新渲染时不会丢失
  const actionToSpriteRef = useRef(new WeakMap());
  const spriteToActionRef = useRef(new WeakMap());
  const actionIdMapRef = useRef(new Map());
  const spriteIdMapRef = useRef(new Map());

  // 使用 useRef 存储事件监听器
  const listenersRef = useRef<Set<ActionSpriteManagerListener>>(new Set());

  // 内部辅助函数：获取 Sprite 唯一标识
  const getSpriteId = useCallback((sprite: VisibleSprite) => {
    // @ts-expect-error
    let id = sprite._id ?? "";
    // 确保 Sprite 有一个内部 ID
    if (!id) {
      id = generateId();
    }
    return id;
  }, []);

  // 内部辅助函数：通知监听器
  const notifyListeners = useCallback(
    (
      event: ActionSpriteManagerEvent,
      action: TimelineAction,
      sprite: VisibleSprite
    ) => {
      listenersRef.current.forEach((listener: ActionSpriteManagerListener) => {
        try {
          listener(event, action, sprite);
        } catch (error) {
          console.error("监听器执行失败:", error);
        }
      });
    },
    [] // 依赖为空，确保该函数引用稳定
  );

  /**
   * 注册映射关系
   */
  const register = useCallback(
    (action: TimelineAction, sprite: VisibleSprite) => {
      actionToSpriteRef.current.set(action, sprite);
      spriteToActionRef.current.set(sprite, action);
      actionIdMapRef.current.set(action.id, action);
      spriteIdMapRef.current.set(getSpriteId(sprite), sprite);

      notifyListeners("register", action, sprite);

      console.log("注册映射关系:", {
        actionId: action.id,
        spriteId: getSpriteId(sprite),
      });
    },
    [getSpriteId, notifyListeners]
  );

  /**
   * 取消注册映射关系
   */
  const unregister = useCallback(
    (action: TimelineAction) => {
      const sprite = actionToSpriteRef.current.get(action);
      if (!sprite) return;

      actionToSpriteRef.current.delete(action);
      spriteToActionRef.current.delete(sprite);
      actionIdMapRef.current.delete(action.id);
      spriteIdMapRef.current.delete(getSpriteId(sprite));

      notifyListeners("unregister", action, sprite);

      console.log("取消注册映射关系:", {
        actionId: action.id,
        spriteId: getSpriteId(sprite),
      });
    },
    [getSpriteId, notifyListeners]
  );

  /**
   * 通过 Action 获取 Sprite
   */
  const getSpriteByAction = useCallback((action: TimelineAction) => {
    return actionToSpriteRef.current.get(action);
  }, []);

  /**
   * 通过 Sprite 获取 Action
   */
  const getActionBySprite = useCallback((sprite: VisibleSprite) => {
    return spriteToActionRef.current.get(sprite);
  }, []);

  /**
   * 通过 Action ID 获取 Sprite
   */
  const getSpriteByActionId = useCallback(
    (actionId: string): VisibleSprite | undefined => {
      const action = actionIdMapRef.current.get(actionId);
      return action ? actionToSpriteRef.current.get(action) : undefined;
    },
    []
  );

  /**
   * 通过 Sprite ID 获取 Action
   */
  const getActionBySpriteId = useCallback(
    (spriteId: string): TimelineAction | undefined => {
      const sprite = spriteIdMapRef.current.get(spriteId);
      return sprite ? spriteToActionRef.current.get(sprite) : undefined;
    },
    []
  );

  /**
   * 同步 Action 到 Sprite
   */
  const syncActionToSprite = useCallback(
    (action: TimelineAction) => {
      const sprite = getSpriteByActionId(action.id);
      if (!sprite) {
        console.warn("同步失败: 未找到对应的 Sprite:", action.id);
        return false;
      }

      try {
        sprite.time.offset = action.start * 1e6;
        sprite.time.duration = (action.end - action.start) * 1e6;
        notifyListeners("syncActionToSprite", action, sprite);
        console.log("同步 Action 到 Sprite 成功:", { actionId: action.id });
        return true;
      } catch (error) {
        console.error("同步 Action 到 Sprite 失败:", error);
        return false;
      }
    },
    [getSpriteByActionId, notifyListeners]
  );

  /**
   * 同步 Sprite 到 Action
   */
  const syncSpriteToAction = useCallback(
    (sprite: VisibleSprite) => {
      const action = getActionBySpriteId(getSpriteId(sprite));
      if (!action) {
        console.warn("同步失败: 未找到对应的 Action");
        return false;
      }

      try {
        action.start = sprite.time.offset / 1e6;
        action.end = (sprite.time.offset + sprite.time.duration) / 1e6;
        notifyListeners("syncSpriteToAction", action, sprite);
        console.log("同步 Sprite 到 Action 成功:", { actionId: action.id });
        return true;
      } catch (error) {
        console.error("同步 Sprite 到 Action 失败:", error);
        return false;
      }
    },
    [getActionBySpriteId, getSpriteId, notifyListeners]
  );

  /**
   * 批量同步 Actions
   */
  const batchSyncActionToSprite = useCallback(
    (actions: TimelineAction[]) => {
      let successCount = 0;
      actions.forEach((action) => {
        if (syncActionToSprite(action)) {
          successCount++;
        }
      });
      console.log(`批量同步完成: ${successCount}/${actions.length} 成功`);
      return successCount;
    },
    [syncActionToSprite]
  );

  /**
   * 清除所有映射关系
   */
  const clear = useCallback(() => {
    actionToSpriteRef.current = new WeakMap();
    spriteToActionRef.current = new WeakMap();
    actionIdMapRef.current.clear();
    spriteIdMapRef.current.clear();
    console.log("清除所有映射关系");
  }, []);

  /**
   * 添加事件监听器
   */
  const addListener = useCallback((listener: ActionSpriteManagerListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  /**
   * 暴露给外部的 API
   */
  return {
    register,
    unregister,
    getSpriteByAction,
    getActionBySprite,
    getSpriteByActionId,
    getActionBySpriteId,
    syncActionToSprite,
    syncSpriteToAction,
    batchSyncActionToSprite,
    clear,
    addListener,
  };
}
