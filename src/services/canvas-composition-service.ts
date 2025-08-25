import { AVCanvas, VideoSprite, AudioSprite, ImgSprite, TextSprite } from '@webav/av-canvas';
import { TextClip, Transform, TextStyle } from '@/types';

/**
 * 画布合成服务类
 * 封装 WebAV av-canvas 的功能，用于实时预览和画面合成
 */
export class CanvasCompositionService {
  private avCanvas: AVCanvas | null = null;
  private containerElement: HTMLElement | null = null;
  private isInitialized = false;
  private sprites: Map<string, any> = new Map();

  /**
   * 初始化画布合成器
   */
  async initialize(container: HTMLElement, width: number = 1920, height: number = 1080): Promise<void> {
    try {
      this.containerElement = container;
      this.avCanvas = new AVCanvas(container, {
        width,
        height,
        bgColor: '#000000',
      });

      this.isInitialized = true;
      console.log('CanvasCompositionService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CanvasCompositionService:', error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.avCanvas) {
      throw new Error('CanvasCompositionService not initialized. Call initialize() first.');
    }
  }

  /**
   * 添加视频精灵
   */
  async addVideoSprite(file: File, id?: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const spriteId = id || this.generateId();
      const videoSprite = new VideoSprite(file);
      
      await this.avCanvas!.addSprite(videoSprite);
      this.sprites.set(spriteId, videoSprite);
      
      return spriteId;
    } catch (error) {
      console.error('Failed to add video sprite:', error);
      throw error;
    }
  }

  /**
   * 添加音频精灵
   */
  async addAudioSprite(file: File, id?: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const spriteId = id || this.generateId();
      const audioSprite = new AudioSprite(file);
      
      await this.avCanvas!.addSprite(audioSprite);
      this.sprites.set(spriteId, audioSprite);
      
      return spriteId;
    } catch (error) {
      console.error('Failed to add audio sprite:', error);
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
      const imgSprite = new ImgSprite(file);
      
      await this.avCanvas!.addSprite(imgSprite);
      this.sprites.set(spriteId, imgSprite);
      
      return spriteId;
    } catch (error) {
      console.error('Failed to add image sprite:', error);
      throw error;
    }
  }

  /**
   * 添加文字精灵
   */
  async addTextSprite(text: string, style: TextStyle, id?: string): Promise<string> {
    this.ensureInitialized();
    
    try {
      const spriteId = id || this.generateId();
      
      // 转换样式格式
      const textStyle = {
        fontSize: style.fontSize || 32,
        fontFamily: style.fontFamily || 'Arial',
        fontWeight: style.fontWeight || 'normal',
        color: style.color || '#ffffff',
        backgroundColor: style.backgroundColor || 'transparent',
        textAlign: style.textAlign || 'left',
        lineHeight: style.lineHeight || 1.2,
        letterSpacing: style.letterSpacing || 0,
      };

      const textSprite = new TextSprite(text, textStyle);
      
      await this.avCanvas!.addSprite(textSprite);
      this.sprites.set(spriteId, textSprite);
      
      return spriteId;
    } catch (error) {
      console.error('Failed to add text sprite:', error);
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
      const file = new File([blob], 'video', { type: blob.type });
      
      return await this.addVideoSprite(file, id);
    } catch (error) {
      console.error('Failed to add video sprite from URL:', error);
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
      const file = new File([blob], 'image', { type: blob.type });
      
      return await this.addImageSprite(file, id);
    } catch (error) {
      console.error('Failed to add image sprite from URL:', error);
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
        await this.avCanvas!.removeSprite(sprite);
        this.sprites.delete(spriteId);
      }
    } catch (error) {
      console.error('Failed to remove sprite:', error);
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
      if (transform.x !== undefined) sprite.x = transform.x;
      if (transform.y !== undefined) sprite.y = transform.y;
      
      // 更新大小
      if (transform.width !== undefined) sprite.width = transform.width;
      if (transform.height !== undefined) sprite.height = transform.height;
      
      // 更新旋转
      if (transform.rotation !== undefined) sprite.rotation = transform.rotation;
      
      // 更新缩放
      if (transform.scaleX !== undefined) sprite.scaleX = transform.scaleX;
      if (transform.scaleY !== undefined) sprite.scaleY = transform.scaleY;
      
      // 更新锚点
      if (transform.anchorX !== undefined) sprite.anchorX = transform.anchorX;
      if (transform.anchorY !== undefined) sprite.anchorY = transform.anchorY;
      
    } catch (error) {
      console.error('Failed to update sprite transform:', error);
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
      console.error('Failed to update sprite opacity:', error);
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
      console.error('Failed to update sprite visibility:', error);
    }
  }

  /**
   * 更新文字精灵内容
   */
  updateTextSprite(spriteId: string, text?: string, style?: Partial<TextStyle>): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite || !(sprite instanceof TextSprite)) return;

    try {
      if (text !== undefined) {
        sprite.text = text;
      }
      
      if (style) {
        if (style.fontSize !== undefined) sprite.fontSize = style.fontSize;
        if (style.fontFamily !== undefined) sprite.fontFamily = style.fontFamily;
        if (style.color !== undefined) sprite.color = style.color;
        if (style.backgroundColor !== undefined) sprite.backgroundColor = style.backgroundColor;
        // 其他样式属性...
      }
    } catch (error) {
      console.error('Failed to update text sprite:', error);
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
      console.error('Failed to set sprite z-index:', error);
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
      console.error('Failed to get media stream:', error);
      return null;
    }
  }

  /**
   * 播放
   */
  async play(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.avCanvas!.play();
    } catch (error) {
      console.error('Failed to play:', error);
      throw error;
    }
  }

  /**
   * 暂停
   */
  async pause(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.avCanvas!.pause();
    } catch (error) {
      console.error('Failed to pause:', error);
      throw error;
    }
  }

  /**
   * 停止
   */
  async stop(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.avCanvas!.stop();
    } catch (error) {
      console.error('Failed to stop:', error);
      throw error;
    }
  }

  /**
   * 跳转到指定时间
   */
  async seekTo(time: number): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.avCanvas!.seek(time);
    } catch (error) {
      console.error('Failed to seek:', error);
      throw error;
    }
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.ensureInitialized();
    
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.avCanvas!.volume = clampedVolume;
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }

  /**
   * 获取当前播放时间
   */
  getCurrentTime(): number {
    this.ensureInitialized();
    
    try {
      return this.avCanvas!.currentTime;
    } catch (error) {
      console.error('Failed to get current time:', error);
      return 0;
    }
  }

  /**
   * 获取总时长
   */
  getDuration(): number {
    this.ensureInitialized();
    
    try {
      return this.avCanvas!.duration;
    } catch (error) {
      console.error('Failed to get duration:', error);
      return 0;
    }
  }

  /**
   * 设置画布大小
   */
  setSize(width: number, height: number): void {
    this.ensureInitialized();
    
    try {
      this.avCanvas!.setSize(width, height);
    } catch (error) {
      console.error('Failed to set canvas size:', error);
    }
  }

  /**
   * 截取当前画面
   */
  async captureFrame(): Promise<Blob | null> {
    this.ensureInitialized();
    
    try {
      return await this.avCanvas!.captureFrame();
    } catch (error) {
      console.error('Failed to capture frame:', error);
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
      for (const [spriteId, sprite] of this.sprites) {
        await this.avCanvas!.removeSprite(sprite);
      }
      this.sprites.clear();
    } catch (error) {
      console.error('Failed to clear canvas:', error);
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
        await this.avCanvas.destroy();
        this.avCanvas = null;
        this.containerElement = null;
        this.isInitialized = false;
        this.sprites.clear();
      } catch (error) {
        console.error('Failed to destroy CanvasCompositionService:', error);
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
    const supportedVideoFormats = ['video/mp4', 'video/webm'];
    const supportedAudioFormats = ['audio/mp3', 'audio/wav', 'audio/ogg'];
    const supportedImageFormats = ['image/jpeg', 'image/png', 'image/gif'];
    
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
  static getFileType(file: File): 'video' | 'audio' | 'image' | 'unknown' {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('image/')) return 'image';
    return 'unknown';
  }
}

// 创建单例实例
export const canvasCompositionService = new CanvasCompositionService();