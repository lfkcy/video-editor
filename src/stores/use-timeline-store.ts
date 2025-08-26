import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  TimelineState,
  TimeRange,
  DragState,
  DragOperation,
  Point,
  SnapGuide,
  PlaybackState,
  TimelineTool,
  ZoomLevel,
} from "@/types";

/**
 * 时间轴操作接口
 */
interface TimelineActions {
  // 播放控制
  play: () => void;
  pause: () => void;
  stop: () => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  seekBy: (delta: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setLoop: (loop: boolean) => void;
  toggleLoop: () => void;

  // 时间轴控制
  setPlayhead: (time: number) => void;
  setDuration: (duration: number) => void;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;
  setScrollPosition: (position: number) => void;

  // 选择操作
  selectClip: (clipId: string, addToSelection?: boolean) => void;
  selectClips: (clipIds: string[]) => void;
  deselectClip: (clipId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  invertSelection: () => void;

  // 拖拽操作
  startDrag: (
    operation: DragOperation,
    position: Point,
    clipIds: string[]
  ) => void;
  updateDrag: (position: Point) => void;
  endDrag: () => void;
  cancelDrag: () => void;

  // 网格和对齐
  setSnapToGrid: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  addSnapGuide: (guide: SnapGuide) => void;
  removeSnapGuide: (index: number) => void;
  clearSnapGuides: () => void;

  // 工具
  setActiveTool: (tool: TimelineTool) => void;

  // 视图控制
  setViewRange: (range: TimeRange) => void;
  updateViewRange: (updates: Partial<TimeRange>) => void;

  // 时间格式化
  formatTime: (time: number, format?: "hms" | "frames" | "seconds") => string;
  parseTime: (timeString: string) => number;

  // 工具方法
  getVisibleTimeRange: () => TimeRange;
  timeToPixel: (time: number) => number;
  pixelToTime: (pixel: number) => number;
  snapTime: (time: number) => number;
  findNearestClipEdge: (time: number, threshold?: number) => number | null;
}

/**
 * 时间轴 Store 接口
 */
interface TimelineStore extends TimelineState, PlaybackState, TimelineActions {
  dragState: DragState;
  activeTool: TimelineTool;
  snapGuides: SnapGuide[];
  loopMode: boolean;
}

/**
 * 预定义的缩放级别
 */
const zoomLevels: ZoomLevel[] = [
  {
    scale: 0.01,
    label: "1%",
    majorTickInterval: 60000,
    minorTickInterval: 10000,
  },
  {
    scale: 0.02,
    label: "2%",
    majorTickInterval: 30000,
    minorTickInterval: 5000,
  },
  {
    scale: 0.05,
    label: "5%",
    majorTickInterval: 10000,
    minorTickInterval: 2000,
  },
  {
    scale: 0.1,
    label: "10%",
    majorTickInterval: 5000,
    minorTickInterval: 1000,
  },
  { scale: 0.2, label: "20%", majorTickInterval: 2000, minorTickInterval: 500 },
  { scale: 0.5, label: "50%", majorTickInterval: 1000, minorTickInterval: 200 },
  { scale: 1.0, label: "100%", majorTickInterval: 500, minorTickInterval: 100 },
  { scale: 2.0, label: "200%", majorTickInterval: 200, minorTickInterval: 50 },
  { scale: 5.0, label: "500%", majorTickInterval: 100, minorTickInterval: 20 },
  { scale: 10.0, label: "1000%", majorTickInterval: 50, minorTickInterval: 10 },
];

/**
 * 时间轴状态管理 Store
 */
export const useTimelineStore = create<TimelineStore>()(
  devtools(
    (set, get) => ({
      // 时间轴状态
      playhead: 0,
      duration: 0,
      scale: 1.0,
      scrollPosition: 0,
      isPlaying: false,
      loop: false,
      selectedClips: [],
      snapToGrid: true,
      gridSize: 1000, // 1秒
      viewRange: { start: 0, end: 30000 }, // 默认显示30秒

      // 播放状态
      currentTime: 0,
      volume: 1.0,
      muted: false,
      playbackRate: 1.0,
      loopMode: false,
      buffered: [],

      // 拖拽状态
      dragState: {
        isDragging: false,
        operation: null,
        startPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        targetClipIds: [],
        snapGuides: [],
      },

      // 工具和辅助
      activeTool: "select",
      snapGuides: [],

      // 播放控制
      play: () => {
        set({ isPlaying: true });
      },

      pause: () => {
        set({ isPlaying: false });
      },

      stop: () => {
        set({
          isPlaying: false,
          playhead: 0,
          currentTime: 0,
        });
      },

      togglePlayPause: () => {
        const { isPlaying } = get();
        set({ isPlaying: !isPlaying });
      },

      seekTo: (time) => {
        const { duration } = get();
        const clampedTime = Math.max(0, Math.min(time, duration));
        set({
          playhead: clampedTime,
          currentTime: clampedTime,
        });
      },

      seekBy: (delta) => {
        const { playhead } = get();
        get().seekTo(playhead + delta);
      },

      setPlaybackRate: (rate) => {
        set({ playbackRate: Math.max(0.1, Math.min(4.0, rate)) });
      },

      setVolume: (volume) => {
        set({ volume: Math.max(0, Math.min(1, volume)) });
      },

      toggleMute: () => {
        const { muted } = get();
        set({ muted: !muted });
      },

      setLoop: (loop) => {
        set({ loopMode: loop });
      },

      toggleLoop: () => {
        const { loopMode } = get();
        set({ loopMode: !loopMode });
      },

      // 时间轴控制
      setPlayhead: (time) => {
        get().seekTo(time);
      },

      setDuration: (duration) => {
        set({ duration: Math.max(0, duration) });
      },

      setScale: (scale) => {
        set({ scale: Math.max(0.01, Math.min(10, scale)) });
      },

      zoomIn: () => {
        const { scale } = get();
        const currentIndex = zoomLevels.findIndex(
          (level) => level.scale >= scale
        );
        const nextIndex = Math.min(currentIndex + 1, zoomLevels.length - 1);
        get().setScale(zoomLevels[nextIndex].scale);
      },

      zoomOut: () => {
        const { scale } = get();
        const currentIndex = zoomLevels.findIndex(
          (level) => level.scale > scale
        );
        const prevIndex = Math.max(0, currentIndex - 1);
        get().setScale(zoomLevels[prevIndex].scale);
      },

      zoomToFit: () => {
        const { duration } = get();
        // 假设时间轴宽度为1200像素
        const timelineWidth = 1200;
        if (duration > 0) {
          const newScale = timelineWidth / duration;
          get().setScale(newScale);
        }
      },

      zoomToSelection: () => {
        const { selectedClips } = get();
        if (selectedClips.length === 0) return;

        // 这里需要从项目store获取选中片段的时间范围
        // 为了简化，先使用当前实现
        get().zoomToFit();
      },

      setScrollPosition: (position) => {
        set({ scrollPosition: Math.max(0, position) });
      },

      // 选择操作
      selectClip: (clipId, addToSelection = false) => {
        const { selectedClips } = get();

        if (addToSelection) {
          if (!selectedClips.includes(clipId)) {
            set({ selectedClips: [...selectedClips, clipId] });
          }
        } else {
          set({ selectedClips: [clipId] });
        }
      },

      selectClips: (clipIds) => {
        set({ selectedClips: [...clipIds] });
      },

      deselectClip: (clipId) => {
        const { selectedClips } = get();
        set({
          selectedClips: selectedClips.filter((id) => id !== clipId),
        });
      },

      clearSelection: () => {
        set({ selectedClips: [] });
      },

      selectAll: () => {
        // 这里需要从项目store获取所有片段ID
        // 为了简化，先使用空实现
        console.log("selectAll not implemented");
      },

      invertSelection: () => {
        // 这里需要从项目store获取所有片段ID并反选
        console.log("invertSelection not implemented");
      },

      // 拖拽操作
      startDrag: (operation, position, clipIds) => {
        set({
          dragState: {
            isDragging: true,
            operation,
            startPosition: position,
            currentPosition: position,
            targetClipIds: clipIds,
            snapGuides: [],
          },
        });
      },

      updateDrag: (position) => {
        const { dragState } = get();
        if (!dragState.isDragging) return;

        set({
          dragState: {
            ...dragState,
            currentPosition: position,
          },
        });
      },

      endDrag: () => {
        const { dragState } = get();
        if (!dragState.isDragging) return;

        // 这里应该执行实际的拖拽操作
        console.log("Drag ended:", dragState);

        set({
          dragState: {
            isDragging: false,
            operation: null,
            startPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            targetClipIds: [],
            snapGuides: [],
          },
        });
      },

      cancelDrag: () => {
        set({
          dragState: {
            isDragging: false,
            operation: null,
            startPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            targetClipIds: [],
            snapGuides: [],
          },
        });
      },

      // 网格和对齐
      setSnapToGrid: (enabled) => {
        set({ snapToGrid: enabled });
      },

      setGridSize: (size) => {
        set({ gridSize: Math.max(100, size) });
      },

      addSnapGuide: (guide) => {
        const { snapGuides } = get();
        set({ snapGuides: [...snapGuides, guide] });
      },

      removeSnapGuide: (index) => {
        const { snapGuides } = get();
        set({
          snapGuides: snapGuides.filter((_, i) => i !== index),
        });
      },

      clearSnapGuides: () => {
        set({ snapGuides: [] });
      },

      // 工具
      setActiveTool: (tool) => {
        set({ activeTool: tool });
      },

      // 视图控制
      setViewRange: (range) => {
        set({ viewRange: range });
      },

      updateViewRange: (updates) => {
        const { viewRange } = get();
        set({
          viewRange: { ...viewRange, ...updates },
        });
      },

      // 时间格式化
      formatTime: (time, format = "hms") => {
        const seconds = Math.floor(time / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        switch (format) {
          case "hms":
            return `${hours.toString().padStart(2, "0")}:${(minutes % 60)
              .toString()
              .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
          case "frames":
            // 假设30fps
            const frames = Math.floor((time % 1000) / (1000 / 30));
            return `${get().formatTime(time, "hms")}.${frames
              .toString()
              .padStart(2, "0")}`;
          case "seconds":
            return `${(time / 1000).toFixed(1)}s`;
          default:
            return get().formatTime(time, "hms");
        }
      },

      parseTime: (timeString) => {
        // 解析 HH:MM:SS 格式
        const parts = timeString.split(":");
        if (parts.length === 3) {
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          const seconds = parseInt(parts[2]) || 0;
          return (hours * 3600 + minutes * 60 + seconds) * 1000;
        }
        return 0;
      },

      // 工具方法
      getVisibleTimeRange: () => {
        const { scrollPosition, scale } = get();
        const timelineWidth = 1200; // 假设时间轴宽度
        const start = scrollPosition;
        const end = scrollPosition + timelineWidth / scale;
        return { start, end };
      },

      timeToPixel: (time) => {
        const { scale, scrollPosition } = get();
        return time * scale - scrollPosition;
      },

      pixelToTime: (pixel) => {
        const { scale, scrollPosition } = get();
        return (pixel + scrollPosition) / scale;
      },

      snapTime: (time) => {
        const { snapToGrid, gridSize } = get();
        if (!snapToGrid) return time;

        return Math.round(time / gridSize) * gridSize;
      },

      findNearestClipEdge: (time, threshold = 100) => {
        // 这里需要从项目store获取所有片段并找到最近的边缘
        // 为了简化，先返回null
        return null;
      },
    }),
    { name: "TimelineStore" }
  )
);
