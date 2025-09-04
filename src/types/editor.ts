// 编辑器相关类型定义

import { TimelineAction } from "@xzdarcy/react-timeline-editor";
import { Clip, ProjectData, ProjectSettings, Track } from "./project";
import { Point } from "./timeline";
import { VisibleSprite } from "@webav/av-cliper";

/**
 * 编辑器状态
 */
export interface EditorState {
  mode: EditorMode;
  activePanel: EditorPanel;
  activeTrack: string | null;
  selectedClips: string[];
  clipboard: ClipboardData | null;
  undoStack: EditAction[];
  redoStack: EditAction[];
  canUndo: boolean;
  canRedo: boolean;
  isFullscreen: boolean;
  zoom: ZoomState;
  grid: GridState;
  snapping: SnappingState;
}

/**
 * 编辑器模式
 */
export type EditorMode =
  | "edit" // 编辑模式
  | "preview" // 预览模式
  | "export"; // 导出模式

/**
 * 编辑器面板
 */
export type EditorPanel =
  | "timeline" // 时间轴面板
  | "media" // 媒体库面板
  | "effects" // 效果面板
  | "properties" // 属性面板
  | "audio" // 音频面板
  | "text"; // 文本面板

/**
 * 剪贴板数据
 */
export interface ClipboardData {
  type: "clips" | "tracks";
  data: Clip[] | Track[];
  timestamp: Date;
}

/**
 * 编辑操作
 */
export interface EditAction {
  id: string;
  type: EditActionType;
  timestamp: Date;
  description: string;
  data: EditActionData;
  undoData?: EditActionData;
}

/**
 * 编辑操作类型
 */
export type EditActionType =
  | "add-clip"
  | "remove-clip"
  | "move-clip"
  | "trim-clip"
  | "split-clip"
  | "merge-clips"
  | "add-track"
  | "remove-track"
  | "reorder-tracks"
  | "change-property"
  | "add-effect"
  | "remove-effect"
  | "modify-effect"
  | "batch";

/**
 * 编辑操作数据
 */
export interface EditActionData {
  clipIds?: string[];
  trackIds?: string[];
  properties?: Record<string, any>;
  position?: Point;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  batchActions?: EditAction[];
}

/**
 * 缩放状态
 */
export interface ZoomState {
  level: number; // 缩放级别 0.1-10
  center: Point; // 缩放中心点
  fitMode: ZoomFitMode;
}

/**
 * 缩放适配模式
 */
export type ZoomFitMode = "none" | "fit" | "fill" | "width" | "height";

/**
 * 网格状态
 */
export interface GridState {
  enabled: boolean;
  size: number; // 网格大小，单位：像素
  snapToGrid: boolean;
  showGrid: boolean;
  color: string;
  opacity: number;
}

/**
 * 对齐状态
 */
export interface SnappingState {
  enabled: boolean;
  snapToClips: boolean;
  snapToTracks: boolean;
  snapToPlayhead: boolean;
  snapToMarkers: boolean;
  snapDistance: number; // 对齐距离，单位：像素
}

/**
 * 编辑器主题
 */
export type EditorTheme = "light" | "dark" | "auto";

/**
 * 编辑器快捷键
 */
export interface EditorShortcut {
  id: string;
  name: string;
  keys: string[];
  action: string;
  category: string;
  description: string;
  enabled: boolean;
}

/**
 * UI 配置
 */
export interface UIConfig {
  showTimecode: boolean;
  showWaveforms: boolean;
  showThumbnails: boolean;
  thumbnailSize: ThumbnailSize;
  trackHeight: number;
  timelineHeight: number;
  panelSizes: Record<string, number>;
  layout: LayoutConfig;
}

/**
 * 缩略图大小
 */
export type ThumbnailSize = "small" | "medium" | "large";

/**
 * 布局配置
 */
export interface LayoutConfig {
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showBottomPanel: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
}

/**
 * AVCanvas 配置选项
 */
export interface AVCanvasOptions {
  width?: number;
  height?: number;
  bgColor?: string;
}

/**
 * 文字样式配置
 */
export interface TextStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: string;
  textShadow?: string;
  strokeWidth?: number;
  strokeColor?: string;
}

/**
 * 精灵操作事件
 */
export interface SpriteOperationEvent {
  type: "add" | "remove" | "update" | "split";
  spriteId: string;
  actionId: string;
  timestamp: number;
  data?: any;
}

/**
 * 预览质量
 */
export type PreviewQuality = "low" | "medium" | "high" | "full";

/**
 * 宽高比
 */
export interface AspectRatio {
  width: number;
  height: number;
  label: string;
}

/**
 * 标记点
 */
export interface Marker {
  id: string;
  time: number; // 时间位置，单位：毫秒
  type: MarkerType;
  name: string;
  description?: string;
  color: string;
  duration?: number; // 区间标记的持续时间
}

/**
 * 标记点类型
 */
export type MarkerType = "point" | "range" | "chapter" | "cue";

/**
 * 性能监控
 */
export interface PerformanceMetrics {
  frameRate: number; // 当前帧率
  memoryUsage: number; // 内存使用量，单位：MB
  cpuUsage: number; // CPU 使用率，单位：百分比
  renderTime: number; // 渲染时间，单位：毫秒
  lastUpdate: Date;
}

/**
 * 事件类型
 */
export type ActionSpriteManagerEvent =
  | "register"
  | "unregister"
  | "syncActionToSprite"
  | "syncSpriteToAction";

/**
 * 事件监听器类型
 */
export type ActionSpriteManagerListener = (
  event: ActionSpriteManagerEvent,
  action: TimelineAction,
  sprite: VisibleSprite
) => void;
