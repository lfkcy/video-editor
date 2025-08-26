import { AVCanvas } from "@webav/av-canvas";
import { TextClip, Transform, TextStyle } from "@/types";
import {
  AudioClip,
  EmbedSubtitlesClip,
  ImgClip,
  MP4Clip,
  VisibleSprite,
} from "@webav/av-cliper";

/**
 * 画布剪辑服务类
 * 封装 WebAV av-canvas 的功能，用于实时预览和画面合成
 */
export class VideoClipService {
  private avCanvas: AVCanvas | null = null;
  private videoWidth: number = 1920;
  private videoHeight: number = 1080;
  private containerElement: HTMLElement | null = null;
  private isInitialized = false;
  private currentTime: number = 0;
  private duration: number = 0; // 视频总时长
  private sprites: Map<string, VisibleSprite> = new Map();

  /**
   * 初始化画布合成器
   */
  async initialize(
    container: HTMLElement,
    width: number = 1920,
    height: number = 1080,
    duration: number = 0
  ): Promise<void> {
    try {
      this.containerElement = container;
      this.videoWidth = width;
      this.videoHeight = height;
      this.duration = duration;
      this.avCanvas = new AVCanvas(container, {
        width,
        height,
        bgColor: "#000000",
      });

      this.isInitialized = true;
      console.log("CanvasCompositionService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize CanvasCompositionService:", error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.avCanvas) {
      throw new Error(
        "CanvasCompositionService not initialized. Call initialize() first."
      );
    }
  }

  /**
   * 添加视频精灵
   */
  async addVideoSprite(file: File, id?: string): Promise<string> {
    this.ensureInitialized();

    try {
      const spriteId = id || this.generateId();

      const videoStream = file.stream();

      const videoClip = new MP4Clip(videoStream);

      await videoClip.ready;

      const videoSprite = new VisibleSprite(videoClip);

      await this.avCanvas!.addSprite(videoSprite);
      this.sprites.set(spriteId, videoSprite);

      return spriteId;
    } catch (error) {
      console.error("Failed to add video sprite:", error);
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
    return new Promise(async (resolve, reject) => {
      const videoStream = file.stream();

      const videoClip = new MP4Clip(videoStream);

      await videoClip.ready;

      const totalDuration = videoClip.meta.duration;

      const thumbnailsData = await videoClip.thumbnails(200, {
        start: 0,
        end: totalDuration,
        step: 1e6,
      });

      resolve(thumbnailsData);
    });
  }

  /**
   * 添加音频精灵
   */
  async addAudioSprite(file: File, id?: string): Promise<string> {
    this.ensureInitialized();

    try {
      const spriteId = id || this.generateId();

      const audioStream = file.stream();

      const audioClip = new AudioClip(audioStream);

      await audioClip.ready;

      const audioSprite = new VisibleSprite(audioClip);

      await this.avCanvas!.addSprite(audioSprite);

      this.sprites.set(spriteId, audioSprite);

      return spriteId;
    } catch (error) {
      console.error("Failed to add audio sprite:", error);
      throw error;
    }
  }

  /**
   * 添加图片精灵
   */
  async addImageSprite(file: File, id?: string): Promise<string> {
    this.ensureInitialized();

    try {
      const spriteId = id || this.generateId();

      const imgStream = file.stream();

      const imgClip = new ImgClip(imgStream);

      await imgClip.ready;

      const imgSprite = new VisibleSprite(imgClip);

      await this.avCanvas!.addSprite(imgSprite);
      this.sprites.set(spriteId, imgSprite);

      return spriteId;
    } catch (error) {
      console.error("Failed to add image sprite:", error);
      throw error;
    }
  }

  /**
   * 添加文字精灵
   */
  async addTextSprite(
    text: string,
    style: TextStyle,
    id?: string
  ): Promise<string> {
    this.ensureInitialized();

    try {
      const spriteId = id || this.generateId();

      // 转换样式格式
      const textStyle = {
        fontSize: style.fontSize || 32,
        fontFamily: style.fontFamily || "Arial",
        fontWeight: style.fontWeight || "normal",
        color: style.color || "#ffffff",
        backgroundColor: style.backgroundColor || "transparent",
        textAlign: style.textAlign || "left",
        lineHeight: style.lineHeight || 1.2,
        letterSpacing: style.letterSpacing || "0px",
      };

      const textClip = new EmbedSubtitlesClip(text, {
        videoWidth: this.videoWidth,
        videoHeight: this.videoHeight,
        ...textStyle,
      });

      await textClip.ready;

      const textSprite = new VisibleSprite(textClip);

      await this.avCanvas!.addSprite(textSprite);
      this.sprites.set(spriteId, textSprite);

      return spriteId;
    } catch (error) {
      console.error("Failed to add text sprite:", error);
      throw error;
    }
  }

  /**
   * 从URL添加视频精灵
   */
  async addVideoSpriteFromUrl(url: string, id?: string): Promise<string> {
    this.ensureInitialized();

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], "video", { type: blob.type });

      return await this.addVideoSprite(file, id);
    } catch (error) {
      console.error("Failed to add video sprite from URL:", error);
      throw error;
    }
  }

  /**
   * 从URL添加图片精灵
   */
  async addImageSpriteFromUrl(url: string, id?: string): Promise<string> {
    this.ensureInitialized();

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], "image", { type: blob.type });

      return await this.addImageSprite(file, id);
    } catch (error) {
      console.error("Failed to add image sprite from URL:", error);
      throw error;
    }
  }

  /**
   * 移除精灵
   */
  async removeSprite(spriteId: string): Promise<void> {
    this.ensureInitialized();

    try {
      const sprite = this.sprites.get(spriteId);
      if (sprite) {
        this.avCanvas!.removeSprite(sprite);
        this.sprites.delete(spriteId);
      }
    } catch (error) {
      console.error("Failed to remove sprite:", error);
      throw error;
    }
  }

  /**
   * 更新精灵变换属性
   */
  updateSpriteTransform(spriteId: string, transform: Partial<Transform>): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;

    try {
      // 更新位置
      if (transform.x !== undefined) sprite.rect.x = transform.x;
      if (transform.y !== undefined) sprite.rect.y = transform.y;

      // 更新大小
      if (transform.width !== undefined) sprite.rect.w = transform.width;
      if (transform.height !== undefined) sprite.rect.h = transform.height;

      // 更新旋转
      if (transform.rotation !== undefined)
        sprite.rect.angle = transform.rotation;

      // 更新缩放
      if (transform.scaleX !== undefined) {
        sprite.rect.x = sprite.rect.x * transform.scaleX;
        sprite.rect.w = sprite.rect.w * transform.scaleX;
      }
      if (transform.scaleY !== undefined) {
        sprite.rect.y = sprite.rect.y * transform.scaleY;
        sprite.rect.h = sprite.rect.h * transform.scaleY;
      }

      // 更新锚点
      // if (transform.anchorX !== undefined) sprite.rect.anchorX = transform.anchorX;
      // if (transform.anchorY !== undefined) sprite.rect.anchorY = transform.anchorY;
    } catch (error) {
      console.error("Failed to update sprite transform:", error);
    }
  }

  /**
   * 更新精灵透明度
   */
  updateSpriteOpacity(spriteId: string, opacity: number): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;

    try {
      sprite.opacity = Math.max(0, Math.min(1, opacity));
    } catch (error) {
      console.error("Failed to update sprite opacity:", error);
    }
  }

  /**
   * 更新精灵可见性
   */
  updateSpriteVisibility(spriteId: string, visible: boolean): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;

    try {
      sprite.visible = visible;
    } catch (error) {
      console.error("Failed to update sprite visibility:", error);
    }
  }

  /**
   * 更新文字精灵内容
   */
  updateTextSprite(spriteId: string, style: TextStyle, text?: string): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite || !(sprite instanceof VisibleSprite)) return;

    if (this.avCanvas) {
      this.avCanvas.removeSprite(sprite); // 移除旧的片段
    }
    try {
      if (text) {
        this.addTextSprite(text, style);
      }
    } catch (error) {
      console.error("Failed to update text sprite:", error);
    }
  }

  /**
   * 设置精灵层级
   */
  setSpriteZIndex(spriteId: string, zIndex: number): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;

    try {
      sprite.zIndex = zIndex;
    } catch (error) {
      console.error("Failed to set sprite z-index:", error);
    }
  }

  /**
   * 获取画布的MediaStream
   */
  getMediaStream(): MediaStream | null {
    this.ensureInitialized();

    try {
      return this.avCanvas!.captureStream();
    } catch (error) {
      console.error("Failed to get media stream:", error);
      return null;
    }
  }

  /**
   * 播放
   */
  async play(
    startTime: number = 0,
    endTime: number = 0,
    playbackRate?: number
  ): Promise<void> {
    this.ensureInitialized();

    try {
      this.avCanvas!.play({
        start: startTime,
        end: endTime,
        playbackRate: playbackRate || 1,
      });
    } catch (error) {
      console.error("Failed to play:", error);
      throw error;
    }
  }

  /**
   * 暂停
   */
  async pause(): Promise<void> {
    this.ensureInitialized();

    try {
      this.avCanvas!.pause();
    } catch (error) {
      console.error("Failed to pause:", error);
      throw error;
    }
  }

  /**
   * 停止
   */
  async stop(): Promise<void> {
    this.ensureInitialized();

    try {
      this.avCanvas!.pause();
    } catch (error) {
      console.error("Failed to stop:", error);
      throw error;
    }
  }

  /**
   * 跳转到指定时间
   */
  async seekTo(time: number): Promise<void> {
    this.ensureInitialized();

    try {
      await this.avCanvas!.previewFrame(time);
    } catch (error) {
      console.error("Failed to seek:", error);
      throw error;
    }
  }

  /**
   * 设置音量
   */
  // setVolume(volume: number): void {
  //   this.ensureInitialized();

  //   try {
  //     const clampedVolume = Math.max(0, Math.min(1, volume));
  //     this.avCanvas!.volume = clampedVolume;
  //   } catch (error) {
  //     console.error("Failed to set volume:", error);
  //   }
  // }

  /**
   * 获取当前播放时间
   */
  getCurrentTime(): number {
    this.ensureInitialized();

    try {
      return this.currentTime;
    } catch (error) {
      console.error("Failed to get current time:", error);
      return 0;
    }
  }

  /**
   * 获取总时长
   */
  getDuration(): number {
    this.ensureInitialized();

    try {
      return this.duration;
    } catch (error) {
      console.error("Failed to get duration:", error);
      return 0;
    }
  }

  /**
   * 设置画布大小
   */
  setSize(width: number, height: number): void {
    this.ensureInitialized();

    try {
      // 暂时这样获取画布元素
      const canvasDom = document.querySelector("canvas") as HTMLCanvasElement;
      canvasDom.width = width;
      canvasDom.height = height;
      // this.avCanvas!.setSize(width, height);
    } catch (error) {
      console.error("Failed to set canvas size:", error);
    }
  }

  /**
   * 截取当前画面
   */
  async captureFrame(): Promise<Blob | null> {
    this.ensureInitialized();

    try {
      const imageBase64 = this.avCanvas!.captureImage();
      const blob = await fetch(imageBase64).then((res) => res.blob());
      return blob;
    } catch (error) {
      console.error("Failed to capture frame:", error);
      return null;
    }
  }

  /**
   * 清除所有精灵
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    try {
      // 移除所有精灵
      for (const [spriteId, sprite] of Array.from(this.sprites.entries())) {
        this.avCanvas!.removeSprite(sprite);
      }
      this.sprites.clear();
    } catch (error) {
      console.error("Failed to clear canvas:", error);
    }
  }

  /**
   * 获取精灵列表
   */
  getSprites(): Map<string, any> {
    return new Map(this.sprites);
  }

  /**
   * 获取精灵
   */
  getSprite(spriteId: string): any | null {
    return this.sprites.get(spriteId) || null;
  }

  /**
   * 检查精灵是否存在
   */
  hasSprite(spriteId: string): boolean {
    return this.sprites.has(spriteId);
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    if (this.avCanvas) {
      try {
        await this.clear();
        this.avCanvas.destroy();
        this.avCanvas = null;
        this.containerElement = null;
        this.isInitialized = false;
        this.sprites.clear();
      } catch (error) {
        console.error("Failed to destroy CanvasCompositionService:", error);
      }
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查是否支持指定的文件格式
   */
  static isSupportedFormat(file: File): boolean {
    const supportedVideoFormats = ["video/mp4", "video/webm"];
    const supportedAudioFormats = ["audio/mp3", "audio/wav", "audio/ogg"];
    const supportedImageFormats = ["image/jpeg", "image/png", "image/gif"];

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
  static getFileType(file: File): "video" | "audio" | "image" | "unknown" {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("image/")) return "image";
    return "unknown";
  }
}

// 创建单例实例
export const videoClipService = new VideoClipService();
