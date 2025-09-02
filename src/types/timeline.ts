// 时间轴相关类型定义

/**
 * 时间轴状态
 */
export interface TimelineState {
  playhead: number; // 播放头位置，单位：毫秒
  duration: number; // 总时长，单位：毫秒
  scale: number; // 时间轴缩放比例 (像素/毫秒)
  scrollPosition: number; // 水平滚动位置
  isPlaying: boolean; // 是否正在播放
  loop: boolean; // 是否循环播放
  selectedClips: string[]; // 选中的片段ID列表
  snapToGrid: boolean; // 是否启用网格对齐
  gridSize: number; // 网格大小，单位：毫秒
  viewRange: TimeRange; // 可视范围
}
/**
 * 时间范围
 */
export interface TimeRange {
  start: number; // 开始时间，单位：毫秒
  end: number; // 结束时间，单位：毫秒
}

/**
 * 时间轴渲染参数
 */
export interface TimelineRenderParams {
  width: number; // 时间轴宽度
  height: number; // 时间轴高度
  scale: number; // 缩放比例
  scrollPosition: number; // 滚动位置
  playhead: number; // 播放头位置
  duration: number; // 总时长
}

/**
 * 轨道头部配置
 */
export interface TrackHeaderConfig {
  width: number; // 轨道头部宽度
  showControls: boolean; // 是否显示控制按钮
  showThumbnails: boolean; // 是否显示缩略图
}

/**
 * 时间标尺配置
 */
export interface TimeRulerConfig {
  height: number; // 标尺高度
  majorTickInterval: number; // 主刻度间隔，单位：毫秒
  minorTickInterval: number; // 次刻度间隔，单位：毫秒
  showLabels: boolean; // 是否显示时间标签
  labelFormat: TimeFormat; // 时间格式
}

/**
 * 时间格式
 */
export type TimeFormat = "hms" | "frames" | "seconds" | "milliseconds";

/**
 * 片段视觉状态
 */
export interface ClipVisualState {
  x: number; // X 位置
  width: number; // 宽度
  height: number; // 高度
  color: string; // 颜色
  selected: boolean; // 是否选中
  hovered: boolean; // 是否悬停
  dragging: boolean; // 是否正在拖拽
  resizing: boolean; // 是否正在调整大小
  opacity: number; // 透明度
}

/**
 * 拖拽操作类型
 */
export type DragOperation =
  | "move" // 移动片段
  | "trim-start" // 修剪开始
  | "trim-end" // 修剪结束
  | "split" // 分割片段
  | "select" // 选择片段
  | "multi-select"; // 多选片段

/**
 * 拖拽状态
 */
export interface DragState {
  isDragging: boolean;
  operation: DragOperation | null;
  startPosition: Point;
  currentPosition: Point;
  targetClipIds: string[];
  snapGuides: SnapGuide[];
}

/**
 * 二维坐标点
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 对齐辅助线
 */
export interface SnapGuide {
  position: number; // 位置，单位：像素
  type: "start" | "end" | "center" | "playhead";
  orientation: "vertical" | "horizontal";
}

/**
 * 时间轴缩放级别
 */
export interface ZoomLevel {
  scale: number; // 缩放比例
  label: string; // 显示标签
  majorTickInterval: number; // 主刻度间隔
  minorTickInterval: number; // 次刻度间隔
}

/**
 * 时间轴交互事件
 */
export interface TimelineEvent {
  type: TimelineEventType;
  timestamp: number;
  position: Point;
  clipIds?: string[];
  trackId?: string;
  metadata?: Record<string, any>;
}

/**
 * 时间轴事件类型
 */
export type TimelineEventType =
  | "clip-select"
  | "clip-deselect"
  | "clip-move"
  | "clip-trim"
  | "clip-split"
  | "clip-delete"
  | "track-add"
  | "track-remove"
  | "track-reorder"
  | "playhead-move"
  | "zoom-change"
  | "scroll-change";

/**
 * 时间轴键盘快捷键
 */
export interface TimelineShortcut {
  key: string;
  modifiers: KeyModifier[];
  action: TimelineActionType;
  description: string;
}

/**
 * 键盘修饰键
 */
export type KeyModifier = "ctrl" | "alt" | "shift" | "cmd";

/**
 * 时间轴操作
 */
export type TimelineActionType =
  | "play-pause"
  | "stop"
  | "seek-forward"
  | "seek-backward"
  | "zoom-in"
  | "zoom-out"
  | "zoom-fit"
  | "select-all"
  | "deselect-all"
  | "delete-selected"
  | "copy-selected"
  | "paste"
  | "undo"
  | "redo"
  | "split-at-playhead";

/**
 * 时间轴工具
 */
export type TimelineTool =
  | "select" // 选择工具
  | "razor" // 剃刀工具（分割）
  | "hand" // 手形工具（平移）
  | "zoom"; // 缩放工具

/**
 * 时间轴工具状态
 */
export interface TimelineToolState {
  activeTool: TimelineTool;
  cursor: string; // CSS 光标样式
  enabled: boolean;
}

/**
 * 播放控制状态
 */
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number; // 当前播放时间，单位：毫秒
  duration: number; // 总时长，单位：毫秒
  volume: number; // 音量 0-1
  muted: boolean; // 是否静音
  playbackRate: number; // 播放速率
  loop: boolean; // 是否循环
  buffered: TimeRange[]; // 缓冲区间
}
