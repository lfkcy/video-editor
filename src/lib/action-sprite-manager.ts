import { VisibleSprite } from "@webav/av-cliper";
import { TimelineAction } from "@xzdarcy/react-timeline-editor";

/**
 * Action 与 Sprite 映射关系管理器
 * 负责维护 TimelineAction 与 VisibleSprite 之间的双向映射关系
 */
export class ActionSpriteManager {
  private actionToSprite = new WeakMap<TimelineAction, VisibleSprite>();
  private spriteToAction = new WeakMap<VisibleSprite, TimelineAction>();
  private actionIdMap = new Map<string, TimelineAction>();
  private spriteIdMap = new Map<string, VisibleSprite>();
  private listeners: ActionSpriteManagerListener[] = [];

  /**
   * 注册映射关系
   */
  register(action: TimelineAction, sprite: VisibleSprite): void {
    // 建立双向映射
    this.actionToSprite.set(action, sprite);
    this.spriteToAction.set(sprite, action);

    // 建立 ID 映射便于查找
    this.actionIdMap.set(action.id, action);
    this.spriteIdMap.set(this.getSpriteId(sprite), sprite);

    // 通知监听器
    this.notifyListeners("register", action, sprite);

    console.log("注册映射关系:", {
      actionId: action.id,
      spriteId: this.getSpriteId(sprite),
    });
  }

  /**
   * 取消注册映射关系
   */
  unregister(action: TimelineAction): void {
    const sprite = this.actionToSprite.get(action);

    if (sprite) {
      // 清除映射关系
      this.actionToSprite.delete(action);
      this.spriteToAction.delete(sprite);
      this.actionIdMap.delete(action.id);
      this.spriteIdMap.delete(this.getSpriteId(sprite));

      // 通知监听器
      this.notifyListeners("unregister", action, sprite);

      console.log("取消注册映射关系:", {
        actionId: action.id,
        spriteId: this.getSpriteId(sprite),
      });
    }
  }

  /**
   * 通过 Action 获取 Sprite
   */
  getSpriteByAction(action: TimelineAction): VisibleSprite | undefined {
    return this.actionToSprite.get(action);
  }

  /**
   * 通过 Sprite 获取 Action
   */
  getActionBySprite(sprite: VisibleSprite): TimelineAction | undefined {
    return this.spriteToAction.get(sprite);
  }

  /**
   * 通过 Action ID 获取 Sprite
   */
  getSpriteByActionId(actionId: string): VisibleSprite | undefined {
    const action = this.actionIdMap.get(actionId);
    return action ? this.actionToSprite.get(action) : undefined;
  }

  /**
   * 通过 Sprite ID 获取 Action
   */
  getActionBySpriteId(spriteId: string): TimelineAction | undefined {
    const sprite = this.spriteIdMap.get(spriteId);
    return sprite ? this.spriteToAction.get(sprite) : undefined;
  }

  /**
   * 获取所有映射关系
   */
  getAllMappings(): { action: TimelineAction; sprite: VisibleSprite }[] {
    const mappings: { action: TimelineAction; sprite: VisibleSprite }[] = [];

    this.actionIdMap.forEach((action) => {
      const sprite = this.actionToSprite.get(action);
      if (sprite) {
        mappings.push({ action, sprite });
      }
    });

    return mappings;
  }

  /**
   * 同步 Action 到 Sprite
   * 当时间轴上的 Action 发生变化时，同步更新对应的 Sprite
   */
  syncActionToSprite(action: TimelineAction): boolean {
    // 查找必须从 getSpriteByActionId 获取，直接从 actionToSprite 获取，由于WeakMap和实例重新加载的原因，action对象在内存中的地址会发生更改，与WeakMap中的对象地址不一致，导致无法获取到对应的Sprite对象
    const sprite = this.getSpriteByActionId(action.id);
    if (!sprite) {
      console.warn("同步失败: 未找到对应的 Sprite:", action.id);
      return false;
    }

    try {
      // 更新时间属性
      sprite.time.offset = action.start * 1e6; // 转换为微秒
      sprite.time.duration = (action.end - action.start) * 1e6;

      // 通知监听器
      this.notifyListeners("syncActionToSprite", action, sprite);

      console.log("同步 Action 到 Sprite 成功:", {
        actionId: action.id,
        start: action.start,
        end: action.end,
        offset: sprite.time.offset,
        duration: sprite.time.duration,
      });

      return true;
    } catch (error) {
      console.error("同步 Action 到 Sprite 失败:", error);
      return false;
    }
  }

  /**
   * 同步 Sprite 到 Action
   * 当 Sprite 属性发生变化时，同步更新对应的 Action
   */
  syncSpriteToAction(sprite: VisibleSprite): boolean {
    const action = this.spriteToAction.get(sprite);
    if (!action) {
      console.warn("同步失败: 未找到对应的 Action");
      return false;
    }

    try {
      // 更新时间属性
      action.start = sprite.time.offset / 1e6; // 转换为秒
      action.end = (sprite.time.offset + sprite.time.duration) / 1e6;

      // 通知监听器
      this.notifyListeners("syncSpriteToAction", action, sprite);

      console.log("同步 Sprite 到 Action 成功:", {
        actionId: action.id,
        start: action.start,
        end: action.end,
        offset: sprite.time.offset,
        duration: sprite.time.duration,
      });

      return true;
    } catch (error) {
      console.error("同步 Sprite 到 Action 失败:", error);
      return false;
    }
  }

  /**
   * 批量同步 Actions 到 Sprites
   */
  batchSyncActionToSprite(actions: TimelineAction[]): number {
    let successCount = 0;

    actions.forEach((action) => {
      if (this.syncActionToSprite(action)) {
        successCount++;
      }
    });

    console.log(`批量同步完成: ${successCount}/${actions.length} 成功`);
    return successCount;
  }

  /**
   * 验证映射关系一致性
   */
  validateMappings(): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let valid = true;

    // 检查双向映射一致性
    this.actionIdMap.forEach((action, actionId) => {
      const sprite = this.actionToSprite.get(action);
      if (sprite) {
        const backAction = this.spriteToAction.get(sprite);
        if (backAction !== action) {
          errors.push(`双向映射不一致: Action ${actionId}`);
          valid = false;
        }
      } else {
        errors.push(`缺少 Sprite 映射: Action ${actionId}`);
        valid = false;
      }
    });

    // 检查时间属性一致性
    this.getAllMappings().forEach(({ action, sprite }) => {
      const actionStart = action.start * 1e6;
      const actionDuration = (action.end - action.start) * 1e6;

      if (Math.abs(sprite.time.offset - actionStart) > 1000) {
        // 1ms 容差
        errors.push(`时间偏移不一致: Action ${action.id}`);
        valid = false;
      }

      if (Math.abs(sprite.time.duration - actionDuration) > 1000) {
        // 1ms 容差
        errors.push(`时长不一致: Action ${action.id}`);
        valid = false;
      }
    });

    return { valid, errors };
  }

  /**
   * 获取 Sprite 唯一标识
   */
  private getSpriteId(sprite: VisibleSprite): string {
    // 尝试从 Sprite 获取唯一标识，如果没有则创建一个
    if (!(sprite as any)._id) {
      (sprite as any)._id = Math.random().toString(36).substr(2, 9);
    }
    return (sprite as any)._id;
  }

  /**
   * 添加事件监听器
   */
  addListener(listener: ActionSpriteManagerListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知监听器
   */
  private notifyListeners(
    event: ActionSpriteManagerEvent,
    action: TimelineAction,
    sprite: VisibleSprite
  ): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, action, sprite);
      } catch (error) {
        console.error("监听器执行失败:", error);
      }
    });
  }

  /**
   * 清除所有映射关系
   */
  clear(): void {
    this.actionToSprite = new WeakMap();
    this.spriteToAction = new WeakMap();
    this.actionIdMap.clear();
    this.spriteIdMap.clear();

    console.log("清除所有映射关系");
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    mappingCount: number;
    actionCount: number;
    spriteCount: number;
  } {
    return {
      mappingCount: this.actionIdMap.size,
      actionCount: this.actionIdMap.size,
      spriteCount: this.spriteIdMap.size,
    };
  }
}

/**
 * 事件类型
 */
export type ActionSpriteManagerEvent =
  | "register"
  | "unregister"
  | "syncActionToSprite"
  | "syncSpriteToAction";

/**
 * 事件监听器类型
 */
export type ActionSpriteManagerListener = (
  event: ActionSpriteManagerEvent,
  action: TimelineAction,
  sprite: VisibleSprite
) => void;

/**
 * 创建 ActionSprite 映射管理器实例
 */
export const actionSpriteManager = new ActionSpriteManager();
