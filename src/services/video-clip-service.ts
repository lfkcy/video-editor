import { AVCanvas } from "@webav/av-canvas";
import { TextStyle, AVCanvasOptions } from "@/types/editor";
import { ProjectSettings, Track } from "@/types/project";
import { MP4Clip, VisibleSprite } from "@webav/av-cliper";
import { AVCanvasManager, avCanvasManager } from "@/lib/av-canvas-manager";
import {
  actionSpriteManager,
  ActionSpriteManager,
} from "@/lib/action-sprite-manager";
import { TimelineAction } from "@xzdarcy/react-timeline-editor";

/**
 * 重构的视频剪辑服务类
 * 集成 AVCanvas 管理器，提供完整的视频编辑功能
 * 基于示例代码模式实现与时间轴的完美结合
 */
export class VideoClipService {
  private avCanvasManager: AVCanvasManager;
  private actionSpriteManager: ActionSpriteManager;
  private isInitialized = false;
  private containerElement: HTMLElement | null = null;
  private projectSettings: ProjectSettings | null = null;

  // 事件监听器
  private spriteAddedListeners: ((
    action: TimelineAction,
    sprite: VisibleSprite
  ) => void)[] = [];
  private spriteRemovedListeners: ((actionId: string) => void)[] = [];
  private timeUpdateListeners: ((time: number) => void)[] = [];
  private playStateListeners: ((isPlaying: boolean) => void)[] = [];

  constructor() {
    this.avCanvasManager = avCanvasManager;
    this.actionSpriteManager = actionSpriteManager;
    this.setupManagerIntegration();
  }

  /**
   * 设置管理器集成
   */
  private setupManagerIntegration(): void {
    // 监听 AVCanvas 管理器事件
    this.avCanvasManager.onTimeUpdate((time) => {
      this.timeUpdateListeners.forEach((listener) => listener(time));
    });

    this.avCanvasManager.onPlayingStateChange((isPlaying) => {
      this.playStateListeners.forEach((listener) => listener(isPlaying));
    });

    // 监听 ActionSprite 管理器事件
    this.actionSpriteManager.addListener((event, action, sprite) => {
      console.log("映射事件:", event, action.id);

      if (event === "register") {
        this.spriteAddedListeners.forEach((listener) =>
          listener(action, sprite)
        );
      } else if (event === "unregister") {
        this.spriteRemovedListeners.forEach((listener) => listener(action.id));
      }
    });
  }

  /**
   * 初始化视频剪辑服务
   */
  async initialize(
    container: HTMLElement,
    settings?: ProjectSettings,
    options?: AVCanvasOptions
  ): Promise<void> {
    try {
      this.containerElement = container;
      this.projectSettings = settings || {
        width: 1920,
        height: 1080,
        fps: 30,
        sampleRate: 44100,
        channels: 2,
        quality: "high",
      };

      // 初始化 AVCanvas 管理器
      await this.avCanvasManager.initialize(container, {
        width: this.projectSettings?.width || 1920,
        height: this.projectSettings?.height || 1080,
        bgColor: "#000000",
        ...options,
      });

      this.isInitialized = true;

      console.log("视频剪辑服务初始化成功", this.projectSettings);
    } catch (error) {
      console.error("初始化视频剪辑服务失败:", error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.avCanvasManager.getInitialized()) {
      throw new Error("视频剪辑服务未初始化，请先调用 initialize()");
    }
  }

  /**
   * 添加视频精灵到指定轨道
   */
  async addVideoSpriteToTrack(
    file: File,
    trackId: string,
    autoSetStartTime = true,
    startTime: number
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
      // 使用 AVCanvas 管理器添加视频精灵
      const { action, sprite } = await this.avCanvasManager.addVideoClip(
        file,
        startTime
      );

      // 设置轨道信息
      (action as any).trackId = trackId;

      // 自动设置开始时间（如果需要）
      if (autoSetStartTime) {
        // 这里可以根据轨道现有内容计算合适的开始时间
        // 暂时使用默认值
      }

      // 注册映射关系
      this.actionSpriteManager.register(action, sprite);

      console.log("添加视频精灵成功:", {
        actionId: action.id,
        trackId,
        duration: sprite.time.duration / 1e6,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加视频精灵失败:", error);
      throw error;
    }
  }

  /**
   * 添加音频精灵到指定轨道
   */
  async addAudioSpriteToTrack(
    file: File,
    trackId: string,
    autoSetStartTime = true
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
      const { action, sprite } = await this.avCanvasManager.addAudioClip(file);

      (action as any).trackId = trackId;

      this.actionSpriteManager.register(action, sprite);

      console.log("添加音频精灵成功:", {
        actionId: action.id,
        trackId,
        duration: sprite.time.duration / 1e6,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加音频精灵失败:", error);
      throw error;
    }
  }

  /**
   * 添加图片精灵到指定轨道
   */
  async addImageSpriteToTrack(
    file: File,
    trackId: string,
    duration: number = 10, // 默认 10 秒
    autoSetStartTime = true
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
      const { action, sprite } = await this.avCanvasManager.addImageClip(file);

      (action as any).trackId = trackId;

      // 设置图片时长
      sprite.time.duration = duration * 1e6;
      action.end = action.start + duration;

      this.actionSpriteManager.register(action, sprite);

      console.log("添加图片精灵成功:", {
        actionId: action.id,
        trackId,
        duration,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加图片精灵失败:", error);
      throw error;
    }
  }

  /**
   * 添加文字精灵到指定轨道
   */
  async addTextSpriteToTrack(
    text: string,
    trackId: string,
    style?: Partial<TextStyle>,
    duration: number = 5 // 默认 5 秒
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
      const { action, sprite } = await this.avCanvasManager.addTextClip(
        text,
        style as any
      );

      (action as any).trackId = trackId;
      (action as any).name = `文字: ${text.substring(0, 10)}${
        text.length > 10 ? "..." : ""
      }`;

      // 设置文字时长
      sprite.time.duration = duration * 1e6;
      action.end = action.start + duration;

      this.actionSpriteManager.register(action, sprite);

      console.log("添加文字精灵成功:", {
        actionId: action.id,
        trackId,
        text: text.substring(0, 20),
        duration,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加文字精灵失败:", error);
      throw error;
    }
  }

  /**
   * 获取视频缩略图
   */
  async getVideoThumbnail(file: File): Promise<
    {
      ts: number;
      img: Blob;
    }[]
  > {
    try {
      const videoStream = file.stream();
      const videoClip = new MP4Clip(videoStream);
      await videoClip.ready;

      const totalDuration = videoClip.meta.duration;
      const thumbnailsData = await videoClip.thumbnails(200, {
        start: 0,
        end: totalDuration,
        step: 1e6,
      });

      return thumbnailsData;
    } catch (error) {
      console.error("获取视频缩略图失败:", error);
      throw error;
    }
  }

  /**
   * 移除精灵
   */
  async removeSprite(action: TimelineAction): Promise<void> {
    this.ensureInitialized();

    try {
      // 使用 AVCanvas 管理器移除精灵
      await this.avCanvasManager.removeSprite(action);

      // 取消注册映射关系
      this.actionSpriteManager.unregister(action);

      console.log("移除精灵成功:", action.id);
    } catch (error) {
      console.error("移除精灵失败:", error);
      throw error;
    }
  }

  /**
   * 更新精灵时间属性
   */
  updateSpriteTime(action: TimelineAction): boolean {
    this.ensureInitialized();

    console.log("更新精灵时间属性:", action.id);

    try {
      // 同步 Action 到 Sprite
      const success = this.actionSpriteManager.syncActionToSprite(action);

      if (success) {
        console.log("更新精灵时间成功:", {
          actionId: action.id,
          start: action.start,
          end: action.end,
        });
      }

      return success;
    } catch (error) {
      console.error("更新精灵时间失败:", error);
      return false;
    }
  }

  /**
   * 分割精灵
   */
  async splitSprite(
    action: TimelineAction,
    splitTime: number
  ): Promise<TimelineAction[]> {
    this.ensureInitialized();

    try {
      // 使用 AVCanvas 管理器分割精灵
      const newActions = await this.avCanvasManager.splitSprite(
        action,
        splitTime
      );

      // 注册新的映射关系
      for (const newAction of newActions) {
        const sprite = this.avCanvasManager.getSprite(newAction);
        if (sprite) {
          this.actionSpriteManager.register(newAction, sprite);
        }
      }

      console.log("分割精灵成功:", {
        originalId: action.id,
        newActionsCount: newActions.length,
      });

      return newActions;
    } catch (error) {
      console.error("分割精灵失败:", error);
      throw error;
    }
  }

  /**
   * 播放控制
   */
  play(startTime?: number): void {
    this.ensureInitialized();
    this.avCanvasManager.play(startTime);
  }

  pause(): void {
    this.ensureInitialized();
    this.avCanvasManager.pause();
  }

  seekTo(time: number): void {
    this.ensureInitialized();
    this.avCanvasManager.seekTo(time);
  }

  /**
   * 导出功能
   */
  async exportVideo(): Promise<ReadableStream> {
    this.ensureInitialized();
    return await this.avCanvasManager.exportVideo();
  }

  /**
   * 截图功能
   */
  captureImage(): string {
    this.ensureInitialized();
    return this.avCanvasManager.captureImage();
  }
  /**
   * 事件监听器管理
   */
  onSpriteAdded(
    callback: (action: TimelineAction, sprite: VisibleSprite) => void
  ): () => void {
    this.spriteAddedListeners.push(callback);
    return () => {
      const index = this.spriteAddedListeners.indexOf(callback);
      if (index > -1) {
        this.spriteAddedListeners.splice(index, 1);
      }
    };
  }

  onSpriteRemoved(callback: (actionId: string) => void): () => void {
    this.spriteRemovedListeners.push(callback);
    return () => {
      const index = this.spriteRemovedListeners.indexOf(callback);
      if (index > -1) {
        this.spriteRemovedListeners.splice(index, 1);
      }
    };
  }

  onTimeUpdate(callback: (time: number) => void): () => void {
    this.timeUpdateListeners.push(callback);
    return () => {
      const index = this.timeUpdateListeners.indexOf(callback);
      if (index > -1) {
        this.timeUpdateListeners.splice(index, 1);
      }
    };
  }

  onPlayStateChange(callback: (isPlaying: boolean) => void): () => void {
    this.playStateListeners.push(callback);
    return () => {
      const index = this.playStateListeners.indexOf(callback);
      if (index > -1) {
        this.playStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取管理器实例（用于高级操作）
   */
  getAVCanvasManager(): AVCanvasManager {
    return this.avCanvasManager;
  }

  getActionSpriteManager(): ActionSpriteManager {
    return this.actionSpriteManager;
  }

  /**
   * 获取精灵和动作
   */
  getSprite(action: TimelineAction): VisibleSprite | undefined {
    return this.actionSpriteManager.getSpriteByAction(action);
  }

  getAction(sprite: VisibleSprite): TimelineAction | undefined {
    return this.actionSpriteManager.getActionBySprite(sprite);
  }

  getSpriteByActionId(actionId: string): VisibleSprite | undefined {
    return this.actionSpriteManager.getSpriteByActionId(actionId);
  }

  getActionBySpriteId(spriteId: string): TimelineAction | undefined {
    return this.actionSpriteManager.getActionBySpriteId(spriteId);
  }

  /**
   * 批量操作
   */
  batchUpdateActions(actions: TimelineAction[]): number {
    return this.actionSpriteManager.batchSyncActionToSprite(actions);
  }

  /**
   * 验证映射关系
   */
  validateMappings(): { valid: boolean; errors: string[] } {
    return this.actionSpriteManager.validateMappings();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    spriteCount: number;
    actionCount: number;
    isInitialized: boolean;
    projectSettings: ProjectSettings | null;
  } {
    const managerStats = this.actionSpriteManager.getStats();
    return {
      spriteCount: managerStats.spriteCount,
      actionCount: managerStats.actionCount,
      isInitialized: this.isInitialized,
      projectSettings: this.projectSettings,
    };
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    try {
      // 清除事件监听器
      this.spriteAddedListeners = [];
      this.spriteRemovedListeners = [];
      this.timeUpdateListeners = [];
      this.playStateListeners = [];

      // 销毁管理器
      await this.avCanvasManager.destroy();
      this.actionSpriteManager.clear();

      // 重置状态
      this.isInitialized = false;
      this.containerElement = null;
      this.projectSettings = null;

      console.log("视频剪辑服务已销毁");
    } catch (error) {
      console.error("销毁视频剪辑服务失败:", error);
      throw error;
    }
  }
}

/**
 * 单例实例（向后兼容）
 */
export const videoClipService = new VideoClipService();

/**
 * 检查是否支持指定的文件格式
 */
export function isSupportedFormat(file: File): boolean {
  const supportedVideoFormats = ["video/mp4", "video/webm", "video/mov"];
  const supportedAudioFormats = [
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/m4a",
  ];
  const supportedImageFormats = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  const allSupportedFormats = [
    ...supportedVideoFormats,
    ...supportedAudioFormats,
    ...supportedImageFormats,
  ];

  return allSupportedFormats.includes(file.type);
}

/**
 * 获取文件类型
 */
export function getFileType(
  file: File
): "video" | "audio" | "image" | "unknown" {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  return "unknown";
}
