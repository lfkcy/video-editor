import {
  MediaFile,
  MediaMetadata,
  MediaType,
  MediaProcessingTask,
  MediaProcessingResult,
} from "@/types";
import { FileUtils } from "@/utils/file-utils";
import { videoClipService } from "./video-clip-service";

/**
 * 媒体处理服务类
 * 处理媒体文件的上传、元数据提取、缩略图生成等功能
 */
export class MediaProcessingService {
  private static instance: MediaProcessingService;
  private processingTasks: Map<string, MediaProcessingTask> = new Map();

  /**
   * 获取单例实例
   */
  static getInstance(): MediaProcessingService {
    if (!MediaProcessingService.instance) {
      MediaProcessingService.instance = new MediaProcessingService();
    }
    return MediaProcessingService.instance;
  }

  /**
   * 处理媒体文件
   */
  async processMediaFile(file: File): Promise<MediaFile> {
    const taskId = this.generateId();
    const task: MediaProcessingTask = {
      id: taskId,
      fileId: this.generateId(),
      status: "processing",
      progress: 0,
      startTime: new Date(),
    };

    this.processingTasks.set(taskId, task);

    try {
      // 更新进度
      this.updateTaskProgress(taskId, 10);

      // 提取基础信息
      const mediaFile: MediaFile = {
        id: task.fileId,
        name: FileUtils.sanitizeFileName(file.name),
        type: FileUtils.getMediaType(file),
        size: file.size,
        url: FileUtils.createObjectURL(file),
        createdAt: new Date(),
        lastModified: new Date(file.lastModified),
        metadata: {} as any,
      };

      // 更新进度
      this.updateTaskProgress(taskId, 30);

      // 提取元数据
      mediaFile.metadata = await this.extractMetadata(file);

      // 更新进度
      this.updateTaskProgress(taskId, 60);

      // 生成缩略图
      if (mediaFile.type === "video" || mediaFile.type === "image") {
        mediaFile.thumbnailUrl = await this.generateThumbnail(
          file,
          mediaFile.type
        );
      }

      // 更新进度
      this.updateTaskProgress(taskId, 90);

      // 处理完成
      task.status = "completed";
      task.progress = 100;
      task.endTime = new Date();
      task.result = {
        thumbnails: mediaFile.thumbnailUrl ? [mediaFile.thumbnailUrl] : [],
        keyframes: [],
        analysis: {
          hasAudio: mediaFile.metadata.channels
            ? mediaFile.metadata.channels > 0
            : false,
          hasVideo: mediaFile.type === "video",
        },
      };

      // 更新进度
      this.updateTaskProgress(taskId, 100);

      return mediaFile;
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "处理失败";
      task.endTime = new Date();
      throw error;
    }
  }

  /**
   * 批量处理媒体文件
   */
  async processMediaFiles(files: File[]): Promise<MediaFile[]> {
    const results: MediaFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.processMediaFile(files[i]);
        results.push(result);
      } catch (error) {
        errors.push(
          `${files[i].name}: ${
            error instanceof Error ? error.message : "处理失败"
          }`
        );
      }
    }

    if (errors.length > 0) {
      console.warn("Some files failed to process:", errors);
    }

    return results;
  }

  /**
   * 提取媒体元数据
   */
  private async extractMetadata(file: File): Promise<MediaMetadata> {
    const metadata: MediaMetadata = {
      format: file.type,
    };

    try {
      if (file.type.startsWith("video/")) {
        return await this.extractVideoMetadata(file);
      } else if (file.type.startsWith("audio/")) {
        return await this.extractAudioMetadata(file);
      } else if (file.type.startsWith("image/")) {
        return await this.extractImageMetadata(file);
      }
    } catch (error) {
      console.error("Failed to extract metadata:", error);
    }

    return metadata;
  }

  /**
   * 提取视频元数据
   */
  private async extractVideoMetadata(file: File): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        const metadata: MediaMetadata = {
          duration: video.duration * 1000, // 转换为毫秒
          width: video.videoWidth,
          height: video.videoHeight,
          format: file.type,
        };

        // 尝试获取帧率（需要更高级的分析）
        if (video.videoWidth && video.videoHeight) {
          metadata.fps = 30; // 默认值，实际需要更复杂的分析
        }

        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error("Failed to load video metadata"));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * 提取音频元数据
   */
  private async extractAudioMetadata(file: File): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement("audio");
      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        const metadata: MediaMetadata = {
          duration: audio.duration * 1000, // 转换为毫秒
          format: file.type,
          sampleRate: 44100, // 默认值
          channels: 2, // 默认值
        };

        URL.revokeObjectURL(audio.src);
        resolve(metadata);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        reject(new Error("Failed to load audio metadata"));
      };

      audio.src = URL.createObjectURL(file);
    });
  }

  /**
   * 提取图片元数据
   */
  private async extractImageMetadata(file: File): Promise<MediaMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const metadata: MediaMetadata = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: file.type,
        };

        URL.revokeObjectURL(img.src);
        resolve(metadata);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to load image metadata"));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnail(
    file: File,
    type: MediaType
  ): Promise<string> {
    if (type === "image") {
      return await this.generateImageThumbnail(file);
    } else if (type === "video") {
      return await this.generateVideoThumbnail(file);
    }
    throw new Error("Unsupported file type for thumbnail generation");
  }

  /**
   * 生成图片缩略图
   */
  private async generateImageThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      img.onload = () => {
        // 计算缩略图尺寸
        const maxSize = 200;
        let { width, height } = img;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // 绘制缩略图
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为 Base64
        const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(img.src);
        resolve(thumbnailUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error("Failed to load image for thumbnail"));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 生成视频缩略图
   */
  private async generateVideoThumbnail(file: File): Promise<string> {
    const thumbnails = await videoClipService.getVideoThumbnail(file);
    const url = URL.createObjectURL(thumbnails[0].img);
    return url;
  }

  /**
   * 生成音频波形图
   */
  async generateWaveform(file: File): Promise<number[]> {
    // 这里需要使用 Web Audio API 来分析音频
    // 由于比较复杂，先返回模拟数据
    const sampleCount = 1000;
    const waveform: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      waveform.push(Math.random() * 0.8 - 0.4);
    }

    return waveform;
  }

  /**
   * 获取媒体类型
   */
  private getMediaType(file: File): MediaType {
    return FileUtils.getMediaType(file);
  }

  /**
   * 更新任务进度
   */
  private updateTaskProgress(taskId: string, progress: number): void {
    const task = this.processingTasks.get(taskId);
    if (task) {
      task.progress = progress;
      // 这里可以触发进度更新事件
    }
  }

  /**
   * 获取处理任务
   */
  getProcessingTask(taskId: string): MediaProcessingTask | undefined {
    return this.processingTasks.get(taskId);
  }

  /**
   * 获取所有处理任务
   */
  getAllProcessingTasks(): MediaProcessingTask[] {
    return Array.from(this.processingTasks.values());
  }

  /**
   * 清除已完成的任务
   */
  clearCompletedTasks(): void {
    for (const [taskId, task] of Array.from(this.processingTasks.entries())) {
      if (task.status === "completed" || task.status === "failed") {
        this.processingTasks.delete(taskId);
      }
    }
  }

  /**
   * 验证文件格式
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    return FileUtils.validateFile(file);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建单例实例
export const mediaProcessingService = MediaProcessingService.getInstance();
