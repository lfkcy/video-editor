import { MediaType } from '@/types';

/**
 * 文件验证和处理工具函数
 */
export class FileUtils {
  // 支持的文件格式
  static readonly SUPPORTED_VIDEO_FORMATS = [
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
  ];

  static readonly SUPPORTED_AUDIO_FORMATS = [
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/aac',
    'audio/ogg',
    'audio/flac',
  ];

  static readonly SUPPORTED_IMAGE_FORMATS = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
  ];

  // 文件大小限制（字节）
  static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  static readonly MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB（图片）

  /**
   * 验证文件是否受支持
   */
  static validateFile(file: File): { isValid: boolean; error?: string } {
    // 检查文件大小
    const maxSize = this.getMediaType(file) === 'image' 
      ? this.MAX_IMAGE_SIZE 
      : this.MAX_FILE_SIZE;
      
    if (file.size > maxSize) {
      const sizeMB = Math.round(maxSize / 1024 / 1024);
      return { 
        isValid: false, 
        error: `文件大小超过限制（${sizeMB}MB）` 
      };
    }

    // 检查文件类型
    if (!this.isSupportedFormat(file)) {
      return { 
        isValid: false, 
        error: '不支持的文件格式' 
      };
    }

    // 检查文件名
    if (!file.name || file.name.trim() === '') {
      return { 
        isValid: false, 
        error: '无效的文件名' 
      };
    }

    return { isValid: true };
  }

  /**
   * 检查文件格式是否受支持
   */
  static isSupportedFormat(file: File): boolean {
    return [
      ...this.SUPPORTED_VIDEO_FORMATS,
      ...this.SUPPORTED_AUDIO_FORMATS,
      ...this.SUPPORTED_IMAGE_FORMATS,
    ].includes(file.type.toLowerCase());
  }

  /**
   * 获取媒体类型
   */
  static getMediaType(file: File): MediaType {
    const mimeType = file.type.toLowerCase();
    
    if (this.SUPPORTED_VIDEO_FORMATS.includes(mimeType)) {
      return 'video';
    }
    if (this.SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
      return 'audio';
    }
    if (this.SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
      return 'image';
    }
    
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  /**
   * 获取文件扩展名
   */
  static getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return filename.slice(lastDotIndex + 1).toLowerCase();
  }

  /**
   * 生成安全的文件名
   */
  static sanitizeFileName(filename: string): string {
    // 移除或替换不安全的字符
    return filename
      .replace(/[<>:\"/\\\\|?*]/g, '_') // 替换不安全字符为下划线
      .replace(/\\s+/g, '_') // 替换空格为下划线
      .replace(/_{2,}/g, '_') // 合并多个下划线
      .replace(/^_+|_+$/g, '') // 移除开头和结尾的下划线
      .slice(0, 255); // 限制长度
  }

  /**
   * 检查文件是否为视频格式
   */
  static isVideo(file: File): boolean {
    return this.SUPPORTED_VIDEO_FORMATS.includes(file.type.toLowerCase());
  }

  /**
   * 检查文件是否为音频格式
   */
  static isAudio(file: File): boolean {
    return this.SUPPORTED_AUDIO_FORMATS.includes(file.type.toLowerCase());
  }

  /**
   * 检查文件是否为图片格式
   */
  static isImage(file: File): boolean {
    return this.SUPPORTED_IMAGE_FORMATS.includes(file.type.toLowerCase());
  }

  /**
   * 创建文件的对象URL
   */
  static createObjectURL(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * 释放对象URL
   */
  static revokeObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * 读取文件为ArrayBuffer
   */
  static readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 读取文件为Data URL
   */
  static readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as Data URL'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * 获取文件的MIME类型
   */
  static getMimeType(file: File): string {
    return file.type || 'application/octet-stream';
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 比较两个文件是否相同
   */
  static areFilesEqual(file1: File, file2: File): boolean {
    return (
      file1.name === file2.name &&
      file1.size === file2.size &&
      file1.lastModified === file2.lastModified &&
      file1.type === file2.type
    );
  }

  /**
   * 获取文件的唯一标识符
   */
  static getFileId(file: File): string {
    return `${file.name}_${file.size}_${file.lastModified}`;
  }
}