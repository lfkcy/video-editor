// 项目相关类型定义

/**
 * 项目数据结构
 */
export interface ProjectData {
  id: string;
  name: string;
  duration: number; // 总时长，单位：毫秒
  tracks: Track[];
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 项目设置
 */
export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  sampleRate: number;
  channels: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * 轨道类型
 */
export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: Clip[];
  isVisible: boolean;
  isMuted: boolean;
  isLocked: boolean;
  height: number; // 轨道高度
  order: number; // 轨道顺序
}

/**
 * 轨道类型枚举
 */
export type TrackType = 'video' | 'audio' | 'text' | 'image';

/**
 * 片段基础接口
 */
export interface Clip {
  id: string;
  type: ClipType;
  startTime: number; // 在时间轴上的开始时间，单位：毫秒
  duration: number; // 片段时长，单位：毫秒
  trimStart: number; // 修剪开始时间，单位：毫秒
  trimEnd: number; // 修剪结束时间，单位：毫秒
  source: MediaSource;
  effects: Effect[];
  transform: Transform;
  selected: boolean;
  trackId: string;
}

/**
 * 片段类型枚举
 */
export type ClipType = 'video' | 'audio' | 'image' | 'text';

/**
 * 媒体源
 */
export interface MediaSource {
  id: string;
  type: MediaSourceType;
  url: string;
  name: string;
  size: number;
  metadata: MediaMetadata;
}

/**
 * 媒体源类型
 */
export type MediaSourceType = 'file' | 'camera' | 'screen' | 'url';

/**
 * 媒体元数据
 */
export interface MediaMetadata {
  duration?: number; // 媒体时长，单位：毫秒
  width?: number;
  height?: number;
  fps?: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  format?: string;
  thumbnail?: string; // Base64 缩略图
}

/**
 * 视频片段
 */
export interface VideoClip extends Clip {
  type: 'video';
  volume: number; // 音量 0-1
  speed: number; // 播放速度
  opacity: number; // 透明度 0-1
}

/**
 * 音频片段
 */
export interface AudioClip extends Clip {
  type: 'audio';
  volume: number; // 音量 0-1
  speed: number; // 播放速度
}

/**
 * 图片片段
 */
export interface ImageClip extends Clip {
  type: 'image';
  opacity: number; // 透明度 0-1
}

/**
 * 文字片段
 */
export interface TextClip extends Clip {
  type: 'text';
  text: string;
  style: TextStyle;
}

/**
 * 文字样式
 */
export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | number;
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  shadow: TextShadow;
}

/**
 * 文字阴影
 */
export interface TextShadow {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

/**
 * 变换属性
 */
export interface Transform {
  x: number; // X 位置
  y: number; // Y 位置
  width: number; // 宽度
  height: number; // 高度
  rotation: number; // 旋转角度
  scaleX: number; // X 缩放
  scaleY: number; // Y 缩放
  anchorX: number; // 锚点 X (0-1)
  anchorY: number; // 锚点 Y (0-1)
}

/**
 * 效果基础接口
 */
export interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, any>;
}

/**
 * 效果类型
 */
export type EffectType = 
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'fade-in'
  | 'fade-out'
  | 'slide-in'
  | 'slide-out'
  | 'zoom-in'
  | 'zoom-out';

/**
 * 导出设置
 */
export interface ExportSettings {
  format: 'mp4' | 'webm' | 'avi' | 'mov';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  audioCodec: 'aac' | 'mp3' | 'opus';
  videoCodec: 'h264' | 'h265' | 'vp8' | 'vp9';
}

/**
 * 项目状态
 */
export interface ProjectState {
  currentProject: ProjectData | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

/**
 * 文字叠加层（用于画面合成）
 */
export interface TextOverlay {
  id: string;
  text: string;
  position: {
    x: number; // 百分比位置 0-100
    y: number; // 百分比位置 0-100
  };
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  background: string | null;
  textAlign: 'left' | 'center' | 'right';
  opacity: number; // 0-100
  rotation: number; // 旋转角度 -180 到 180
  shadow: boolean;
  zIndex: number;
  startTime: number; // 显示开始时间（毫秒）
  duration: number; // 显示持续时间（毫秒）
}

/**
 * 图片叠加层
 */
export interface ImageOverlay {
  id: string;
  imageUrl: string;
  position: {
    x: number; // 百分比位置 0-100
    y: number; // 百分比位置 0-100
  };
  size: {
    width: number; // 百分比大小 0-100
    height: number; // 百分比大小 0-100
  };
  opacity: number; // 0-100
  rotation: number; // 旋转角度
  zIndex: number;
  startTime: number; // 显示开始时间（毫秒）
  duration: number; // 显示持续时间（毫秒）
}

/**
 * 合成设置
 */
export interface CompositionSettings {
  textOverlays: TextOverlay[];
  imageOverlays: ImageOverlay[];
  backgroundMusic?: {
    url: string;
    volume: number;
    startTime: number;
    duration: number;
  };
}