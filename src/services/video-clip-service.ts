import { Combinator, MP4Clip, AudioClip, ImgClip, OffscreenSprite } from '@webav/av-cliper';
import { ProjectData, VideoClip, AudioClip as AudioClipType, ImageClip, ExportSettings } from '@/types';

/**
 * 视频剪辑服务类
 * 封装 WebAV av-cliper 的功能
 */
export class VideoClipService {
  private combinator: Combinator | null = null;
  private isInitialized = false;

  /**
   * 初始化视频合成器
   */
  async initialize(width: number = 1920, height: number = 1080, fps: number = 30): Promise<void> {
    try {
      this.combinator = new Combinator({
        width,
        height,
        fps,
        bgColor: 'transparent',
      });
      this.isInitialized = true;
      console.log('VideoClipService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize VideoClipService:', error);
      throw error;
    }
  }

  /**
   * 检查是否已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.combinator) {
      throw new Error('VideoClipService not initialized. Call initialize() first.');
    }
  }

  /**
   * 添加视频片段到合成器
   */
  async addVideoClip(file: File, startTime: number, duration?: number): Promise<string> {
    this.ensureInitialized();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mp4Clip = new MP4Clip(arrayBuffer);
      await mp4Clip.ready;

      const sprite = new OffscreenSprite(mp4Clip);
      
      // 设置时间信息
      sprite.time = {
        offset: startTime * 1000000, // 转换为微秒
        duration: duration ? duration * 1000000 : mp4Clip.duration,
      };

      // 设置位置和大小
      sprite.rect.x = 0;
      sprite.rect.y = 0;
      sprite.rect.w = this.combinator!.width;
      sprite.rect.h = this.combinator!.height;

      await this.combinator!.addSprite(sprite);
      
      return sprite.id;
    } catch (error) {
      console.error('Failed to add video clip:', error);
      throw error;
    }
  }

  /**
   * 添加音频片段到合成器
   */
  async addAudioClip(file: File, startTime: number, duration?: number): Promise<string> {
    this.ensureInitialized();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioClip = new AudioClip(arrayBuffer);
      await audioClip.ready;

      const sprite = new OffscreenSprite(audioClip);
      
      sprite.time = {
        offset: startTime * 1000000,
        duration: duration ? duration * 1000000 : audioClip.duration,
      };

      await this.combinator!.addSprite(sprite);
      
      return sprite.id;
    } catch (error) {
      console.error('Failed to add audio clip:', error);
      throw error;
    }
  }

  /**
   * 添加图片片段到合成器
   */
  async addImageClip(file: File, startTime: number, duration: number): Promise<string> {
    this.ensureInitialized();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const imgClip = new ImgClip(arrayBuffer);
      await imgClip.ready;

      const sprite = new OffscreenSprite(imgClip);
      
      sprite.time = {
        offset: startTime * 1000000,
        duration: duration * 1000000,
      };

      // 设置位置和大小
      sprite.rect.x = 0;
      sprite.rect.y = 0;
      sprite.rect.w = this.combinator!.width;
      sprite.rect.h = this.combinator!.height;

      await this.combinator!.addSprite(sprite);
      
      return sprite.id;
    } catch (error) {
      console.error('Failed to add image clip:', error);
      throw error;
    }
  }

  /**
   * 从项目数据构建合成器
   */
  async buildFromProject(project: ProjectData): Promise<void> {
    this.ensureInitialized();
    
    try {
      // 清除现有的 sprites
      await this.clear();

      // 重新初始化合成器
      await this.initialize(
        project.settings.width,
        project.settings.height,
        project.settings.fps
      );

      // 按时间轴顺序添加所有片段
      for (const track of project.tracks) {
        if (!track.isVisible) continue;

        for (const clip of track.clips) {
          if (!clip.source.url) continue;

          // 根据片段类型添加到合成器
          switch (clip.type) {
            case 'video':
              await this.addVideoClipFromUrl(
                clip.source.url,
                clip.startTime / 1000,
                clip.duration / 1000,
                clip as VideoClip
              );
              break;
            case 'audio':
              await this.addAudioClipFromUrl(
                clip.source.url,
                clip.startTime / 1000,
                clip.duration / 1000,
                clip as AudioClipType
              );
              break;
            case 'image':
              await this.addImageClipFromUrl(
                clip.source.url,
                clip.startTime / 1000,
                clip.duration / 1000,
                clip as ImageClip
              );
              break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to build from project:', error);
      throw error;
    }
  }

  /**
   * 从URL添加视频片段
   */
  private async addVideoClipFromUrl(
    url: string, 
    startTime: number, 
    duration: number, 
    clip: VideoClip
  ): Promise<string> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const mp4Clip = new MP4Clip(arrayBuffer);
      await mp4Clip.ready;

      const sprite = new OffscreenSprite(mp4Clip);
      
      // 应用片段设置
      sprite.time = {
        offset: startTime * 1000000,
        duration: duration * 1000000,
      };

      // 应用变换
      sprite.rect.x = clip.transform.x;
      sprite.rect.y = clip.transform.y;
      sprite.rect.w = clip.transform.width;
      sprite.rect.h = clip.transform.height;

      // 应用音量
      if (clip.volume !== undefined) {
        sprite.audioVolume = clip.volume;
      }

      // 应用透明度
      if (clip.opacity !== undefined) {
        sprite.opacity = clip.opacity;
      }

      await this.combinator!.addSprite(sprite);
      
      return sprite.id;
    } catch (error) {
      console.error('Failed to add video clip from URL:', error);
      throw error;
    }
  }

  /**
   * 从URL添加音频片段
   */
  private async addAudioClipFromUrl(
    url: string, 
    startTime: number, 
    duration: number, 
    clip: AudioClipType
  ): Promise<string> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioClip = new AudioClip(arrayBuffer);
      await audioClip.ready;

      const sprite = new OffscreenSprite(audioClip);
      
      sprite.time = {
        offset: startTime * 1000000,
        duration: duration * 1000000,
      };

      if (clip.volume !== undefined) {
        sprite.audioVolume = clip.volume;
      }

      await this.combinator!.addSprite(sprite);
      
      return sprite.id;
    } catch (error) {
      console.error('Failed to add audio clip from URL:', error);
      throw error;
    }
  }

  /**
   * 从URL添加图片片段
   */
  private async addImageClipFromUrl(
    url: string, 
    startTime: number, 
    duration: number, 
    clip: ImageClip
  ): Promise<string> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const imgClip = new ImgClip(arrayBuffer);
      await imgClip.ready;

      const sprite = new OffscreenSprite(imgClip);
      
      sprite.time = {
        offset: startTime * 1000000,
        duration: duration * 1000000,
      };

      sprite.rect.x = clip.transform.x;
      sprite.rect.y = clip.transform.y;
      sprite.rect.w = clip.transform.width;
      sprite.rect.h = clip.transform.height;

      if (clip.opacity !== undefined) {
        sprite.opacity = clip.opacity;
      }

      await this.combinator!.addSprite(sprite);
      
      return sprite.id;
    } catch (error) {
      console.error('Failed to add image clip from URL:', error);
      throw error;
    }
  }

  /**
   * 移除片段
   */
  async removeSprite(spriteId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.combinator!.removeSprite(spriteId);
    } catch (error) {
      console.error('Failed to remove sprite:', error);
      throw error;
    }
  }

  /**
   * 更新片段属性
   */
  async updateSprite(spriteId: string, updates: any): Promise<void> {
    this.ensureInitialized();
    
    try {
      // 这里需要根据 WebAV 的实际API来实现
      // 由于 WebAV 的 API 可能不支持直接更新，可能需要重新创建 sprite
      console.warn('updateSprite not fully implemented');
    } catch (error) {
      console.error('Failed to update sprite:', error);
      throw error;
    }
  }

  /**
   * 导出视频
   */
  async exportVideo(settings?: Partial<ExportSettings>): Promise<ReadableStream> {
    this.ensureInitialized();
    
    try {
      const stream = this.combinator!.output();
      return stream;
    } catch (error) {
      console.error('Failed to export video:', error);
      throw error;
    }
  }

  /**
   * 获取指定时间的预览帧
   */
  async getPreviewFrame(time: number): Promise<ImageBitmap | null> {
    this.ensureInitialized();
    
    try {
      // 这里需要根据 WebAV 的实际API来实现预览帧获取
      // 可能需要使用 render 方法来获取特定时间的帧
      console.warn('getPreviewFrame not implemented');
      return null;
    } catch (error) {
      console.error('Failed to get preview frame:', error);
      throw error;
    }
  }

  /**
   * 获取项目总时长
   */
  getDuration(): number {
    this.ensureInitialized();
    
    // 这里需要计算所有片段的最大结束时间
    // 由于 WebAV 可能没有直接的API，需要自己维护
    return 0;
  }

  /**
   * 清除所有片段
   */
  async clear(): Promise<void> {
    if (this.combinator) {
      try {
        // 移除所有 sprites
        // 这里需要根据 WebAV 的实际API来实现
        console.warn('clear method needs implementation');
      } catch (error) {
        console.error('Failed to clear combinator:', error);
      }
    }
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    if (this.combinator) {
      try {
        await this.clear();
        this.combinator = null;
        this.isInitialized = false;
      } catch (error) {
        console.error('Failed to destroy VideoClipService:', error);
      }
    }
  }

  /**
   * 检查是否支持指定的文件格式
   */
  static isSupportedFormat(file: File): boolean {
    const supportedVideoFormats = ['video/mp4', 'video/webm', 'video/quicktime'];
    const supportedAudioFormats = ['audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg'];
    const supportedImageFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
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
export const videoClipService = new VideoClipService();