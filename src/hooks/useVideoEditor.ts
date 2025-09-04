import { useState, useEffect, useRef, useCallback } from "react";
import { useAVCanvas } from "./useAVCanvas";
import { TextStyle } from "@/types";
import { TimelineAction } from "@xzdarcy/react-timeline-editor";
import { useActionSpriteManager } from "./useActionSpriteManager";

/**
 * 视频编辑器 Hook
 * 负责管理视频剪辑服务、AVCanvas 实例及其生命周期
 */
export function useVideoEditor() {
  const {
    initialize: initializeAVCanvas,
    addVideoClip: addVideoClipToCanvas,
    addAudioClip: addAudioClipToCanvas,
    addImageClip: addImageClipToCanvas,
    addTextClip: addTextClipToCanvas,
    removeSprite: removeSpriteFromCanvas,
    onTimeUpdate: onTimeUpdateAVCanvas,
    onPlayingStateChange: onPlayingStateChangeAVCanvas,
    onSpriteChange: onSpriteChangeAVCanvas,
    play: playAVCanvas,
    pause: pauseAVCanvas,
    seekTo: seekToAVCanvas,
    exportVideo: exportVideoAVCanvas,
    captureImage: captureImageAVCanvas,
    splitSprite: splitSpriteFromCanvas,
  } = useAVCanvas();

  const {
    register,
    unregister,
    addListener,
    getSpriteByActionId: getSpriteByActionIdManager,
    getActionBySpriteId: getActionBySpriteIdManager,
    ...managerApi
  } = useActionSpriteManager();

  // 使用 useState 管理状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // 内部检查函数
  const ensureInitialized = useCallback(() => {
    if (!isInitialized) {
      throw new Error("视频剪辑服务未初始化，请先调用 initialize()");
    }
  }, [isInitialized]);

  // 初始化 AVCanvas
  const initialize = useCallback(
    async (container: HTMLElement) => {
      if (!container) return;

      try {
        const settings = {
          width: 1920,
          height: 1080,
          fps: 30,
          sampleRate: 44100,
          channels: 2,
          quality: "high",
        };

        await initializeAVCanvas(container, {
          width: settings.width,
          height: settings.height,
          bgColor: "#000000",
        });

        setIsInitialized(true);
        console.log("视频剪辑服务初始化成功", settings);
      } catch (error) {
        console.error("初始化视频剪辑服务失败:", error);
        setIsInitialized(false);
        throw error;
      }
    },
    [] // 依赖为空数组，只在组件初次渲染时创建
  );

  // 使用 useEffect 注册和注销事件监听器
  useEffect(() => {
    // 监听时间更新
    const onTimeUpdate = (time: number) => setCurrentTime(time);
    onTimeUpdateAVCanvas(onTimeUpdate);

    // 监听播放状态
    const onPlayingStateChange = (state: boolean) => setIsPlaying(state);
    onPlayingStateChangeAVCanvas(onPlayingStateChange);
  }, []);

  // 将所有功能性方法封装成独立的 useCallback

  /**
   * 添加视频片段
   */
  const addVideoSprite = useCallback(
    async (file: File, startTime = 0, duration = 10e6) => {
      ensureInitialized();
      return addVideoClipToCanvas(file, startTime, duration);
    },
    [ensureInitialized]
  );

  /**
   * 添加音频片段
   */
  const addAudioSprite = useCallback(
    async (file: File, duration = 10e6) => {
      ensureInitialized();
      return addAudioClipToCanvas(file, duration);
    },
    [ensureInitialized]
  );

  /**
   * 添加图片片段
   */
  const addImageSprite = useCallback(
    async (file: File, duration = 10e6) => {
      ensureInitialized();
      return addImageClipToCanvas(file, duration);
    },
    [ensureInitialized]
  );

  /**
   * 添加文本片段
   */
  const addTextSprite = useCallback(
    async (text: string, style: TextStyle, duration = 5e6) => {
      ensureInitialized();
      return addTextClipToCanvas(text, style, duration);
    },
    [ensureInitialized]
  );

  /**
   * 移除精灵
   */
  const removeSprite = useCallback(
    async (action: TimelineAction) => {
      ensureInitialized();
      const sprite = getSpriteByActionIdManager(action.id);
      if (sprite) {
        await removeSpriteFromCanvas(sprite);
        unregister(action);
      }
    },
    [ensureInitialized]
  );

  /**
   * 播放
   */
  const play = useCallback(
    (startTime: number) => {
      ensureInitialized();
      playAVCanvas(startTime);
    },
    [ensureInitialized]
  );

  /**
   * 暂停
   */
  const pause = useCallback(() => {
    ensureInitialized();
    pause();
  }, [ensureInitialized]);

  /**
   * 跳转
   */
  const seekTo = useCallback(
    (time: number) => {
      ensureInitialized();
      seekToAVCanvas(time);
    },
    [ensureInitialized]
  );

  /**
   * 更新精灵时间
   */
  const updateSpriteTime = useCallback(
    (action: TimelineAction) => {
      ensureInitialized();
      const sprite = getSpriteByActionIdManager(action.id);
      if (sprite) {
        return managerApi.syncActionToSprite(action);
      }
    },
    [ensureInitialized]
  );

  /**
   * 分割精灵
   */
  const splitSprite = useCallback(
    async (action: TimelineAction, splitTime: number) => {
      ensureInitialized();
      const newActions = await splitSpriteFromCanvas(action, splitTime);
      return newActions;
    },
    [ensureInitialized]
  );

  /**
   * 导出视频
   */
  const exportVideo = useCallback(async () => {
    ensureInitialized();
    return exportVideoAVCanvas();
  }, [ensureInitialized]);

  /**
   * 捕获图片
   */
  const captureImage = useCallback(() => {
    ensureInitialized();
    return captureImageAVCanvas();
  }, [ensureInitialized]);

  /**
   * 通过 Action ID 获取精灵
   */
  const getSpriteByActionId = useCallback((actionId: string) => {
    return getSpriteByActionIdManager(actionId);
  }, []);

  /**
   * 通过 Sprite ID 获取 Action
   */
  const getActionBySpriteId = useCallback((spriteId: string) => {
    return getActionBySpriteIdManager(spriteId);
  }, []);

  // 暴露给组件的 API
  return {
    isInitialized,
    isPlaying,
    currentTime,
    initialize,
    addVideoSprite,
    addAudioSprite,
    addImageSprite,
    addTextSprite,
    removeSprite,
    updateSpriteTime,
    splitSprite,
    play,
    pause,
    seekTo,
    exportVideo,
    captureImage,
    getSpriteByActionId,
    getActionBySpriteId,
  };
}
