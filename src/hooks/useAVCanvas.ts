import { useState, useEffect, useRef, useCallback } from "react";
import { AVCanvas } from "@webav/av-canvas";
import {
  AudioClip,
  ImgClip,
  MP4Clip,
  VisibleSprite,
  renderTxt2ImgBitmap,
} from "@webav/av-cliper";

// 导入类型定义
import { AVCanvasOptions, TextStyle } from "@/types";
import { useActionSpriteManager } from "./useActionSpriteManager";
import { TimelineAction } from "@xzdarcy/react-timeline-editor";

/**
 * AVCanvas Hook
 * 负责管理 AVCanvas 实例、其生命周期和核心操作
 */
export function useAVCanvas() {
  const { getSpriteByActionId: getSpriteByActionIdManager, ...managerApi } =
    useActionSpriteManager();

  // 使用 useRef 存储 AVCanvas 实例，避免重新渲染时丢失
  const avCanvasRef = useRef<AVCanvas | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  // 使用 useState 跟踪状态
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeSprite, setActiveSprite] = useState<VisibleSprite | null>(null);

  // 使用 useRef 存储回调函数，避免 useEffect 依赖数组中的频繁变动
  const timeUpdateListeners = useRef<Set<(time: number) => void>>(new Set());
  const playingStateListeners = useRef<Set<(isPlaying: boolean) => void>>(
    new Set()
  );
  const spriteChangeListeners = useRef<Set<(sprite: VisibleSprite) => void>>(
    new Set()
  );

  // 内部检查函数
  const ensureInitialized = useCallback(() => {
    if (!isInitialized || !avCanvasRef.current) {
      throw new Error("AVCanvas 管理器未初始化，请先调用 initialize()");
    }
  }, [isInitialized]);

  // 主要的初始化和销毁逻辑
  useEffect(() => {
    const canvas = avCanvasRef.current;
    if (!canvas) return;

    // 事件监听器
    const handleTimeUpdate = (time: number) => {
      setCurrentTime(time / 1e6);
      timeUpdateListeners.current.forEach((cb) => cb(time / 1e6));
    };

    /**
     * 播放状态变化
     */
    const handlePlaying = () => {
      setIsPlaying(true);
      playingStateListeners.current.forEach((cb) => cb(true));
    };

    /**
     * 暂停状态变化
     */
    const handlePaused = () => {
      setIsPlaying(false);
      playingStateListeners.current.forEach((cb) => cb(false));
    };

    /**
     * 活动精灵变化
     */
    const handleActiveSpriteChange = (sprite: VisibleSprite | null) => {
      if (sprite) {
        setActiveSprite(sprite);
        spriteChangeListeners.current.forEach((cb) => cb(sprite));
      }
    };

    canvas.on("timeupdate", handleTimeUpdate);
    canvas.on("playing", handlePlaying);
    canvas.on("paused", handlePaused);
    canvas.on("activeSpriteChange", handleActiveSpriteChange);

    // 清理函数
    return () => {
      // 销毁实例
      canvas.destroy();
      avCanvasRef.current = null;
      setIsInitialized(false);
    };
  }, []);

  // 暴露给外部的初始化函数
  const initialize = useCallback(
    async (container: HTMLElement, options: AVCanvasOptions = {}) => {
      if (isInitialized) return;

      const { width = 1920, height = 1080, bgColor = "#000" } = options;
      containerRef.current = container;
      const canvas = new AVCanvas(container, { width, height, bgColor });
      avCanvasRef.current = canvas;
      setIsInitialized(true);

      console.log("AVCanvas 管理器初始化完成", { width, height, bgColor });
    },
    [isInitialized]
  );

  // 核心功能方法

  /**
   * 添加视频片段
   */
  const addVideoClip = useCallback(
    async (file: File, startTime: number, duration: number = 10e6) => {
      ensureInitialized();
      const stream = file.stream();
      const clip = new MP4Clip(stream);
      await clip.ready;
      const sprite = new VisibleSprite(clip);
      sprite.time.offset = startTime * 1e6;
      sprite.time.duration = duration;
      await avCanvasRef.current?.addSprite(sprite);
      return sprite;
    },
    [ensureInitialized]
  );

  /**
   * 添加音频片段
   */
  const addAudioClip = useCallback(
    async (file: File, duration: number = 5e6) => {
      ensureInitialized();
      const stream = file.stream();
      const clip = new AudioClip(stream);
      await clip.ready;
      const sprite = new VisibleSprite(clip);
      sprite.time.duration = duration;
      await avCanvasRef.current?.addSprite(sprite);
      return sprite;
    },
    [ensureInitialized]
  );

  /**
   * 添加图片片段
   */
  const addImageClip = useCallback(
    async (file: File, duration: number = 10e6) => {
      ensureInitialized();
      const stream = file.stream();
      const clip = new ImgClip(stream);
      await clip.ready;
      const sprite = new VisibleSprite(clip);
      sprite.time.duration = duration;
      await avCanvasRef.current?.addSprite(sprite);
      return sprite;
    },
    [ensureInitialized]
  );

  /**
   * 添加文本片段
   */
  const addTextClip = useCallback(
    async (text: string, style: TextStyle, duration: number = 5e6) => {
      ensureInitialized();
      const defaultStyle = {
        fontSize: 80,
        color: "red",
        fontFamily: "Arial",
        ...style,
      };
      const styleString = `font-size: ${defaultStyle.fontSize}px; color: ${defaultStyle.color}; font-family: ${defaultStyle.fontFamily};`;
      const bitmap = await renderTxt2ImgBitmap(text, styleString);
      const clip = new ImgClip(bitmap);
      await clip.ready;
      const sprite = new VisibleSprite(clip);
      sprite.time.duration = duration;
      await avCanvasRef.current?.addSprite(sprite);
      return sprite;
    },
    [ensureInitialized]
  );

  /**
   * 移除精灵
   */
  const removeSprite = useCallback(
    async (sprite: VisibleSprite) => {
      ensureInitialized();
      if (!sprite) return;
      await avCanvasRef.current?.removeSprite(sprite);
    },
    [ensureInitialized]
  );

  /**
   * 更新精灵
   */
  const updateSprite = useCallback(
    (sprite: VisibleSprite) => {
      ensureInitialized();
      // 这里可以实现更细粒度的属性更新
      // 例如：sprite.time.offset = newOffset;
      // sprite.time.duration = newDuration;
      // avCanvasRef.current.updateSprite(sprite); // 如果 AVCanvas 有这个方法的话
    },
    [ensureInitialized]
  );

  /**
   * 分割精灵
   */
  const splitSprite = useCallback(
    async (action: TimelineAction, splitTime: number) => {
      ensureInitialized();
      const sprite = getSpriteByActionIdManager(action.id);
      if (!sprite) {
        throw new Error("未找到对应的精灵");
      }
      const clip = sprite.getClip();
      if (!clip.split) {
        throw new Error("此片段类型不支持分割");
      }
      const newClips = await clip.split(splitTime * 1e6);
      await removeSprite(sprite); // 移除旧的 sprite
      const newSprites = newClips.map((newClip) => new VisibleSprite(newClip));
      // 添加新 sprites 到 canvas，并返回它们
      // 注意：这里需要更复杂的逻辑来设置新 sprites 的时间偏移
      // 为简化起见，这里只返回新的 sprites 数组
      for (const newSprite of newSprites) {
        await avCanvasRef.current?.addSprite(newSprite);
      }
      return newSprites;
    },
    [ensureInitialized, removeSprite]
  );

  /**
   * 播放
   */
  const play = useCallback(
    (startTime: number) => {
      ensureInitialized();
      avCanvasRef.current?.play({ start: startTime * 1e6 });
    },
    [ensureInitialized]
  );

  /**
   * 暂停
   */
  const pause = useCallback(() => {
    ensureInitialized();
    avCanvasRef.current?.pause();
  }, [ensureInitialized]);

  /**
   * 跳转
   */
  const seekTo = useCallback(
    (time: number) => {
      ensureInitialized();
      avCanvasRef.current?.previewFrame(time * 1e6);
    },
    [ensureInitialized]
  );

  /**
   * 导出视频
   */
  const exportVideo = useCallback(async () => {
    ensureInitialized();
    const combinator = await avCanvasRef.current?.createCombinator();
    return combinator?.output();
  }, [ensureInitialized]);

  /**
   * 捕获图片
   */
  const captureImage = useCallback(() => {
    ensureInitialized();
    return avCanvasRef.current?.captureImage();
  }, [ensureInitialized]);

  /**
   * 时间更新事件监听器
   */
  const onTimeUpdate = useCallback((callback: (time: number) => void) => {
    timeUpdateListeners.current.add(callback);
    return () => timeUpdateListeners.current.delete(callback);
  }, []);

  /**
   * 播放状态变化事件监听器
   */
  const onPlayingStateChange = useCallback(
    (callback: (isPlaying: boolean) => void) => {
      playingStateListeners.current.add(callback);
      return () => playingStateListeners.current.delete(callback);
    },
    []
  );

  /**
   * 精灵变化事件监听器
   */
  const onSpriteChange = useCallback(
    (callback: (sprite: VisibleSprite) => void) => {
      spriteChangeListeners.current.add(callback);
      return () => spriteChangeListeners.current.delete(callback);
    },
    []
  );

  // 暴露给组件的 API
  return {
    isInitialized,
    isPlaying,
    currentTime,
    activeSprite,
    initialize,
    addVideoClip,
    addAudioClip,
    addImageClip,
    addTextClip,
    removeSprite,
    updateSprite,
    splitSprite,
    play,
    pause,
    seekTo,
    exportVideo,
    captureImage,
    onTimeUpdate,
    onPlayingStateChange,
    onSpriteChange,
  };
}
