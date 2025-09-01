import { AVCanvas } from "@webav/av-canvas";
import {
  AudioClip,
  ImgClip,
  MP4Clip,
  VisibleSprite,
  renderTxt2ImgBitmap,
} from "@webav/av-cliper";
import { TimelineAction } from "@xzdarcy/react-timeline-editor";
import { TextStyle } from "@/types";

/**
 * AVCanvas 管理器
 * 负责管理 AVCanvas 实例和 ActionSprite 映射关系
 * 基于示例代码模式实现视频编辑核心功能
 */
export class AVCanvasManager {
  private avCanvas: AVCanvas | null = null;
  private actionSpriteMap = new WeakMap<TimelineAction, VisibleSprite>();
  private spriteActionMap = new WeakMap<VisibleSprite, TimelineAction>();
  private container: HTMLElement | null = null;
  private isInitialized = false;

  // 事件监听器
  private timeUpdateListeners: ((time: number) => void)[] = [];
  private playingStateListeners: ((isPlaying: boolean) => void)[] = [];
  private spriteChangeListeners: ((sprite: VisibleSprite | null) => void)[] =
    [];

  /**
   * 初始化 AVCanvas
   */
  async initialize(
    container: HTMLElement,
    options: {
      width?: number;
      height?: number;
      bgColor?: string;
    } = {}
  ): Promise<void> {
    if (this.isInitialized) {
      await this.destroy();
    }

    const { width = 1920, height = 1080, bgColor = "#000" } = options;

    this.container = container;
    this.avCanvas = new AVCanvas(container, {
      width,
      height,
      bgColor,
    });

    this.setupEventListeners();
    this.isInitialized = true;

    console.log("AVCanvas 管理器初始化完成", { width, height, bgColor });
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.avCanvas) return;

    // 时间更新事件
    this.avCanvas.on("timeupdate", (time: number) => {
      this.timeUpdateListeners.forEach((listener) => listener(time / 1e6));
    });

    // 播放状态变化事件
    this.avCanvas.on("playing", () => {
      this.playingStateListeners.forEach((listener) => listener(true));
    });

    this.avCanvas.on("paused", () => {
      this.playingStateListeners.forEach((listener) => listener(false));
    });

    // 精灵选择变化事件
    this.avCanvas.on("activeSpriteChange", (sprite: VisibleSprite | null) => {
      this.spriteChangeListeners.forEach((listener) => listener(sprite));
      console.log("活动精灵变化:", sprite);
    });
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.avCanvas) {
      throw new Error("AVCanvas 管理器未初始化，请先调用 initialize()");
    }
  }

  /**
   * 添加视频片段
   */
  async addVideoClip(
    file: File,
    startTime: number
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
      const stream = file.stream();
      const clip = new MP4Clip(stream);
      await clip.ready;

      const sprite = new VisibleSprite(clip);
      await this.avCanvas!.addSprite(sprite);

      sprite.time.offset = startTime * 1e6;

      // 创建对应的时间轴动作
      const action = this.createTimelineAction(sprite, "视频");

      // 建立映射关系
      this.actionSpriteMap.set(action, sprite);
      this.spriteActionMap.set(sprite, action);

      console.log("添加视频片段成功:", {
        actionId: action.id,
        duration: sprite.time.duration / 1e6,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加视频片段失败:", error);
      throw error;
    }
  }

  /**
   * 添加音频片段
   */
  async addAudioClip(
    file: File
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
      const stream = file.stream();
      const clip = new AudioClip(stream);
      await clip.ready;

      const sprite = new VisibleSprite(clip);
      await this.avCanvas!.addSprite(sprite);

      const action = this.createTimelineAction(sprite, "音频");

      this.actionSpriteMap.set(action, sprite);
      this.spriteActionMap.set(sprite, action);

      console.log("添加音频片段成功:", {
        actionId: action.id,
        duration: sprite.time.duration / 1e6,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加音频片段失败:", error);
      throw error;
    }
  }

  /**
   * 添加图片片段
   */
  async addImageClip(
    file: File
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
      const stream = file.stream();
      const clip = new ImgClip(stream);
      await clip.ready;

      const sprite = new VisibleSprite(clip);

      // 图片默认时长设置为 10 秒
      if (sprite.time.duration === Infinity) {
        sprite.time.duration = 10e6;
      }

      await this.avCanvas!.addSprite(sprite);

      const action = this.createTimelineAction(sprite, "图片");

      this.actionSpriteMap.set(action, sprite);
      this.spriteActionMap.set(sprite, action);

      console.log("添加图片片段成功:", {
        actionId: action.id,
        duration: sprite.time.duration / 1e6,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加图片片段失败:", error);
      throw error;
    }
  }

  /**
   * 添加文字片段
   */
  async addTextClip(
    text: string,
    style?: Partial<TextStyle>
  ): Promise<{ action: TimelineAction; sprite: VisibleSprite }> {
    this.ensureInitialized();

    try {
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

      // 文字默认时长设置为 5 秒
      sprite.time.duration = 5e6;

      await this.avCanvas!.addSprite(sprite);

      const action = this.createTimelineAction(sprite, "文字");

      this.actionSpriteMap.set(action, sprite);
      this.spriteActionMap.set(sprite, action);

      console.log("添加文字片段成功:", {
        actionId: action.id,
        text,
        duration: sprite.time.duration / 1e6,
      });

      return { action, sprite };
    } catch (error) {
      console.error("添加文字片段失败:", error);
      throw error;
    }
  }

  /**
   * 创建时间轴动作
   */
  private createTimelineAction(
    sprite: VisibleSprite,
    name: string
  ): TimelineAction {
    const start = sprite.time.offset / 1e6;
    const end = (sprite.time.offset + sprite.time.duration) / 1e6;

    return {
      id: Math.random().toString(36).substr(2, 9),
      start,
      end,
      effectId: "",
    };
  }

  /**
   * 移除精灵
   */
  async removeSprite(action: TimelineAction): Promise<void> {
    this.ensureInitialized();

    const sprite = this.actionSpriteMap.get(action);
    if (!sprite) {
      console.warn("未找到对应的精灵:", action.id);
      return;
    }

    try {
      await this.avCanvas!.removeSprite(sprite);

      // 清除映射关系
      this.actionSpriteMap.delete(action);
      this.spriteActionMap.delete(sprite);

      console.log("移除精灵成功:", action.id);
    } catch (error) {
      console.error("移除精灵失败:", error);
      throw error;
    }
  }

  /**
   * 更新精灵时间属性
   */
  updateSpriteTime(action: TimelineAction): void {
    const sprite = this.actionSpriteMap.get(action);
    if (!sprite) {
      console.warn("未找到对应的精灵:", action.id);
      return;
    }

    sprite.time.offset = action.start * 1e6;
    sprite.time.duration = (action.end - action.start) * 1e6;

    console.log("更新精灵时间:", {
      actionId: action.id,
      start: action.start,
      end: action.end,
    });
  }

  /**
   * 分割精灵
   */
  async splitSprite(
    action: TimelineAction,
    splitTime: number
  ): Promise<TimelineAction[]> {
    this.ensureInitialized();

    const sprite = this.actionSpriteMap.get(action);
    if (!sprite) {
      throw new Error("未找到对应的精灵");
    }

    try {
      const clip = sprite.getClip();
      const splitTimeMs = splitTime * 1e6;

      if (!clip.split) {
        throw new Error("没有分割方法");
      }

      // 分割剪辑
      const clips = await clip.split(splitTimeMs);

      // 移除原精灵
      await this.removeSprite(action);

      // 创建新的精灵和动作
      const newActions: TimelineAction[] = [];

      for (let i = 0; i < clips.length; i++) {
        const newClip = clips[i];
        const newSprite = new VisibleSprite(newClip);

        // 设置时间偏移
        if (i === 0) {
          newSprite.time.offset = action.start * 1e6;
        } else {
          newSprite.time.offset = splitTimeMs;
        }

        await this.avCanvas!.addSprite(newSprite);

        const newAction = this.createTimelineAction(newSprite, "split-" + i);
        this.actionSpriteMap.set(newAction, newSprite);
        this.spriteActionMap.set(newSprite, newAction);

        newActions.push(newAction);
      }

      console.log("分割精灵成功:", {
        originalId: action.id,
        newCount: newActions.length,
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
    const start = startTime !== undefined ? startTime * 1e6 : 0;
    this.avCanvas!.play({ start });
  }

  pause(): void {
    this.ensureInitialized();
    this.avCanvas!.pause();
  }

  seekTo(time: number): void {
    this.ensureInitialized();
    this.avCanvas!.previewFrame(time * 1e6);
  }

  /**
   * 获取精灵
   */
  getSprite(action: TimelineAction): VisibleSprite | undefined {
    return this.actionSpriteMap.get(action);
  }

  /**
   * 获取动作
   */
  getAction(sprite: VisibleSprite): TimelineAction | undefined {
    return this.spriteActionMap.get(sprite);
  }

  /**
   * 事件监听器管理
   */
  onTimeUpdate(callback: (time: number) => void): () => void {
    this.timeUpdateListeners.push(callback);
    return () => {
      const index = this.timeUpdateListeners.indexOf(callback);
      if (index > -1) {
        this.timeUpdateListeners.splice(index, 1);
      }
    };
  }

  onPlayingStateChange(callback: (isPlaying: boolean) => void): () => void {
    this.playingStateListeners.push(callback);
    return () => {
      const index = this.playingStateListeners.indexOf(callback);
      if (index > -1) {
        this.playingStateListeners.splice(index, 1);
      }
    };
  }

  onSpriteChange(callback: (sprite: VisibleSprite | null) => void): () => void {
    this.spriteChangeListeners.push(callback);
    return () => {
      const index = this.spriteChangeListeners.indexOf(callback);
      if (index > -1) {
        this.spriteChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * 导出功能
   */
  async exportVideo(): Promise<ReadableStream> {
    this.ensureInitialized();
    const combinator = await this.avCanvas!.createCombinator();
    return combinator.output();
  }

  /**
   * 截图功能
   */
  captureImage(): string {
    this.ensureInitialized();
    return this.avCanvas!.captureImage();
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    if (this.avCanvas) {
      this.avCanvas.destroy();
      this.avCanvas = null;
    }

    this.actionSpriteMap = new WeakMap();
    this.spriteActionMap = new WeakMap();
    this.timeUpdateListeners = [];
    this.playingStateListeners = [];
    this.spriteChangeListeners = [];
    this.container = null;
    this.isInitialized = false;

    console.log("AVCanvas 管理器已销毁");
  }

  /**
   * 获取 AVCanvas 实例（仅限内部使用）
   */
  getAVCanvas(): AVCanvas | null {
    return this.avCanvas;
  }

  /**
   * 获取初始化状态
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * 创建 AVCanvas 管理器实例
 */
export const avCanvasManager = new AVCanvasManager();
