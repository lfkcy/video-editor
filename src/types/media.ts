// 媒体相关类型定义

/**
 * 媒体文件信息
 */
export interface MediaFile {
  id: string;
  name: string;
  type: MediaType;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata: MediaMetadata;
  createdAt: Date;
  lastModified: Date;
}

/**
 * 媒体类型
 */
export type MediaType = 'video' | 'audio' | 'image';

/**
 * 支持的视频格式
 */
export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'avi' | 'mkv' | 'flv';

/**
 * 支持的音频格式
 */
export type AudioFormat = 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac' | 'm4a';

/**
 * 支持的图片格式
 */
export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'gif' | 'bmp' | 'webp' | 'svg';

/**
 * 媒体处理状态
 */
export type MediaProcessingStatus = 
  | 'pending'     // 等待处理
  | 'processing'  // 处理中
  | 'completed'   // 处理完成
  | 'failed'      // 处理失败
  | 'cancelled';  // 已取消

/**
 * 媒体处理任务
 */
export interface MediaProcessingTask {
  id: string;
  fileId: string;
  status: MediaProcessingStatus;
  progress: number; // 进度 0-100
  startTime: Date;
  endTime?: Date;
  error?: string;
  result?: MediaProcessingResult;
}

/**
 * 媒体处理结果
 */
export interface MediaProcessingResult {
  thumbnails: string[]; // 缩略图 URL 列表
  waveform?: number[]; // 音频波形数据
  keyframes: number[]; // 关键帧时间戳
  analysis: MediaAnalysis;
}

/**
 * 媒体分析结果
 */
export interface MediaAnalysis {
  hasAudio: boolean;
  hasVideo: boolean;
  colorProfile?: string;
  loudness?: number; // 音频响度
  peakLevel?: number; // 音频峰值
  scenes?: SceneDetection[]; // 场景检测
}

/**
 * 场景检测结果
 */
export interface SceneDetection {
  startTime: number;
  endTime: number;
  confidence: number; // 置信度 0-1
  thumbnail: string;
}

/**
 * 媒体库状态
 */
export interface MediaLibraryState {
  files: MediaFile[];
  selectedFiles: string[];
  isLoading: boolean;
  uploadProgress: UploadProgress[];
  filter: MediaFilter;
  sortBy: MediaSortBy;
  viewMode: MediaViewMode;
}

/**
 * 上传进度
 */
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 进度 0-100
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/**
 * 媒体过滤器
 */
export interface MediaFilter {
  type: MediaType | 'all';
  format: string | 'all';
  duration: {
    min: number;
    max: number;
  };
  size: {
    min: number;
    max: number;
  };
  searchText: string;
}

/**
 * 媒体排序方式
 */
export type MediaSortBy = 
  | 'name-asc'
  | 'name-desc'
  | 'date-asc'
  | 'date-desc'
  | 'size-asc'
  | 'size-desc'
  | 'duration-asc'
  | 'duration-desc';

/**
 * 媒体视图模式
 */
export type MediaViewMode = 'grid' | 'list' | 'timeline';

/**
 * 视频流信息
 */
export interface VideoStreamInfo {
  index: number;
  codec: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  duration: number;
  pixelFormat: string;
  colorSpace?: string;
  colorRange?: string;
}

/**
 * 音频流信息
 */
export interface AudioStreamInfo {
  index: number;
  codec: string;
  sampleRate: number;
  channels: number;
  channelLayout: string;
  bitrate: number;
  duration: number;
  bitsPerSample?: number;
}

/**
 * 扩展的媒体元数据
 */
export interface ExtendedMediaMetadata extends MediaMetadata {
  videoStreams: VideoStreamInfo[];
  audioStreams: AudioStreamInfo[];
  chapters?: Chapter[];
  tags?: Record<string, string>;
}

/**
 * 章节信息
 */
export interface Chapter {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  thumbnail?: string;
}

/**
 * 媒体缓存配置
 */
export interface MediaCacheConfig {
  maxSize: number; // 最大缓存大小，单位：字节
  maxAge: number; // 最大缓存时间，单位：毫秒
  enableThumbnailCache: boolean;
  enableWaveformCache: boolean;
  compressionLevel: number; // 压缩级别 0-9
}

/**
 * 媒体导入选项
 */
export interface MediaImportOptions {
  generateThumbnails: boolean;
  thumbnailCount: number;
  generateWaveform: boolean;
  detectScenes: boolean;
  extractMetadata: boolean;
  createProxy: boolean;
  proxyQuality: 'low' | 'medium' | 'high';
}

/**
 * 媒体导出选项
 */
export interface MediaExportOptions {
  format: VideoFormat | AudioFormat | ImageFormat;
  quality: number; // 质量 0-100
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  audioCodec?: string;
  videoCodec?: string;
  startTime?: number;
  endTime?: number;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
  results: any[];
}