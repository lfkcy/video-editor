/**
 * 时间轴事件处理器
 * 负责处理 react-timeline-editor 的各种交互事件
 */

import { TimelineAction, TimelineRow } from "./timeline-data-adapter";
import { timelineStateAdapter } from "./timeline-state-adapter";
import { useProjectStore, useTimelineStore } from "@/stores";
import { Track, Clip } from "@/types/project";

export interface TimelineEventCallbacks {
  onActionSelect?: (action: TimelineAction, row: TimelineRow) => void;
  onActionDeselect?: (action: TimelineAction, row: TimelineRow) => void;
  onActionMove?: (
    action: TimelineAction,
    row: TimelineRow,
    newStart: number
  ) => void;
  onActionResize?: (
    action: TimelineAction,
    row: TimelineRow,
    newStart: number,
    newEnd: number
  ) => void;
  onActionDelete?: (actionIds: string[]) => void;
  onActionSplit?: (
    action: TimelineAction,
    row: TimelineRow,
    splitTime: number
  ) => void;
  onRowAdd?: () => void;
  onRowRemove?: (rowId: string) => void;
  onRowReorder?: (fromIndex: number, toIndex: number) => void;
  onTimeChange?: (time: number) => void;
  onScaleChange?: (scale: number) => void;
}

/**
 * 时间轴事件处理器类
 */
export class TimelineEventHandler {
  private callbacks: TimelineEventCallbacks = {};

  constructor(callbacks?: TimelineEventCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  /**
   * 设置事件回调
   */
  setCallbacks(callbacks: Partial<TimelineEventCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 处理 Action 选择
   */
  handleActionSelect = (action: TimelineAction, row: TimelineRow): void => {
    // 更新选择状态
    const currentState = useTimelineStore.getState();
    const isMultiSelect = false; // 这里可以根据键盘状态判断

    if (isMultiSelect) {
      const newSelection = [...currentState.selectedClips, action.id];
      useTimelineStore.getState().selectClips(newSelection);
    } else {
      useTimelineStore.getState().selectClips([action.id]);
    }

    // 触发回调
    if (this.callbacks.onActionSelect) {
      this.callbacks.onActionSelect(action, row);
    }
  };

  /**
   * 处理 Action 取消选择
   */
  handleActionDeselect = (action: TimelineAction, row: TimelineRow): void => {
    const currentState = useTimelineStore.getState();
    const newSelection = currentState.selectedClips.filter(
      (id) => id !== action.id
    );
    useTimelineStore.getState().selectClips(newSelection);

    if (this.callbacks.onActionDeselect) {
      this.callbacks.onActionDeselect(action, row);
    }
  };

  /**
   * 处理 Action 移动
   */
  handleActionMove = (
    action: TimelineAction,
    row: TimelineRow,
    newStart: number
  ): void => {
    // 验证移动的有效性
    if (!this.validateActionMove(action, newStart)) {
      return;
    }

    // 处理对齐
    const snappedStart = this.snapToGrid(newStart);

    // 更新 action
    const updatedAction = {
      ...action,
      start: snappedStart,
      end: snappedStart + (action.end - action.start),
    };

    // 通过状态适配器更新
    timelineStateAdapter.handleActionChange(updatedAction, row.id);

    if (this.callbacks.onActionMove) {
      this.callbacks.onActionMove(updatedAction, row, snappedStart);
    }
  };

  /**
   * 处理 Action 大小调整
   */
  handleActionResize = (
    action: TimelineAction,
    row: TimelineRow,
    newStart: number,
    newEnd: number
  ): void => {
    // 验证调整的有效性
    if (!this.validateActionResize(action, newStart, newEnd)) {
      return;
    }

    // 处理对齐
    const snappedStart = this.snapToGrid(newStart);
    const snappedEnd = this.snapToGrid(newEnd);

    // 确保最小持续时间
    const minDuration = 0.1; // 100ms
    const finalEnd = Math.max(snappedEnd, snappedStart + minDuration);

    const updatedAction = {
      ...action,
      start: snappedStart,
      end: finalEnd,
    };

    // 通过状态适配器更新
    timelineStateAdapter.handleActionChange(updatedAction, row.id);

    if (this.callbacks.onActionResize) {
      this.callbacks.onActionResize(updatedAction, row, snappedStart, finalEnd);
    }
  };

  /**
   * 处理 Action 删除
   */
  handleActionDelete = (actionIds: string[]): void => {
    // 从 store 中删除对应的 clips
    const projectStore = useProjectStore.getState();

    actionIds.forEach((actionId) => {
      projectStore.removeClip(actionId);
    });

    // 清空选择
    useTimelineStore.getState().clearSelection();

    if (this.callbacks.onActionDelete) {
      this.callbacks.onActionDelete(actionIds);
    }
  };

  /**
   * 处理 Action 分割
   */
  handleActionSplit = (
    action: TimelineAction,
    row: TimelineRow,
    splitTime: number
  ): void => {
    // 验证分割时间
    if (splitTime <= action.start || splitTime >= action.end) {
      console.warn("Invalid split time");
      return;
    }

    const projectStore = useProjectStore.getState();

    if (this.callbacks.onActionSplit) {
      this.callbacks.onActionSplit(action, row, splitTime);
    }
  };

  /**
   * 处理轨道添加
   */
  handleRowAdd = (): void => {
    const projectStore = useProjectStore.getState();
    const trackCount = projectStore.currentProject?.tracks.length || 0;

    projectStore.addTrack({
      type: "video",
      name: `轨道 ${trackCount + 1}`,
      clips: [],
      isVisible: true,
      isMuted: false,
      isLocked: false,
      height: 80,
      order: trackCount,
    });

    if (this.callbacks.onRowAdd) {
      this.callbacks.onRowAdd();
    }
  };

  /**
   * 处理轨道删除
   */
  handleRowRemove = (rowId: string): void => {
    const projectStore = useProjectStore.getState();
    projectStore.removeTrack(rowId);

    if (this.callbacks.onRowRemove) {
      this.callbacks.onRowRemove(rowId);
    }
  };

  /**
   * 处理轨道重排序
   */
  handleRowReorder = (fromIndex: number, toIndex: number): void => {
    const projectStore = useProjectStore.getState();
    projectStore.reorderTracks(fromIndex, toIndex);

    if (this.callbacks.onRowReorder) {
      this.callbacks.onRowReorder(fromIndex, toIndex);
    }
  };

  /**
   * 处理时间变更
   */
  handleTimeChange = (time: number): void => {
    console.log(time, "time+++");

    useTimelineStore.getState().seekTo(time * 1000); // 转换为毫秒

    if (this.callbacks.onTimeChange) {
      this.callbacks.onTimeChange(time);
    }
  };

  /**
   * 处理缩放变更
   */
  handleScaleChange = (scale: number): void => {
    // 将 react-timeline-editor 的 scale 转换为我们的 scale
    const timelineScale = scale / 1000; // 假设转换比例
    useTimelineStore.getState().setScale(timelineScale);

    if (this.callbacks.onScaleChange) {
      this.callbacks.onScaleChange(scale);
    }
  };

  /**
   * 处理键盘快捷键
   */
  handleKeyboardShortcut = (key: string, modifiers: string[]): boolean => {
    const hasCtrl = modifiers.includes("ctrl") || modifiers.includes("cmd");
    const hasShift = modifiers.includes("shift");
    const hasAlt = modifiers.includes("alt");

    switch (key.toLowerCase()) {
      case "delete":
      case "backspace":
        // 删除选中的 actions
        const selectedClips = useTimelineStore.getState().selectedClips;
        if (selectedClips.length > 0) {
          this.handleActionDelete(selectedClips);
          return true;
        }
        break;

      case "s":
        if (!hasCtrl) {
          // 分割操作
          const currentTime = useTimelineStore.getState().playhead / 1000;
          this.handleSplitAtPlayhead(currentTime);
          return true;
        }
        break;

      case "a":
        if (hasCtrl) {
          // 全选
          this.handleSelectAll();
          return true;
        }
        break;

      case "d":
        if (hasCtrl) {
          // 复制选中的片段
          this.handleDuplicateSelected();
          return true;
        }
        break;

      case "space":
        // 播放/暂停
        useTimelineStore.getState().togglePlayPause();
        return true;

      case "equal":
      case "+":
        if (hasCtrl) {
          // 放大
          useTimelineStore.getState().zoomIn();
          return true;
        }
        break;

      case "minus":
      case "-":
        if (hasCtrl) {
          // 缩小
          useTimelineStore.getState().zoomOut();
          return true;
        }
        break;

      case "0":
        if (hasCtrl) {
          // 适合窗口
          useTimelineStore.getState().zoomToFit();
          return true;
        }
        break;
    }

    return false;
  };

  /**
   * 在播放头位置分割
   */
  handleSplitAtPlayhead = (currentTime: number): void => {
    const projectStore = useProjectStore.getState();
    const currentProject = projectStore.currentProject;
    if (!currentProject) return;

    // 找到播放头位置的所有片段
    for (const track of currentProject.tracks) {
      for (const clip of track.clips) {
        const clipStart = clip.startTime / 1000;
        const clipEnd = (clip.startTime + clip.duration) / 1000;

        if (currentTime > clipStart && currentTime < clipEnd) {
          projectStore.splitClip(clip.id, currentTime * 1000);
        }
      }
    }
  };

  /**
   * 全选
   */
  private handleSelectAll = (): void => {
    const projectStore = useProjectStore.getState();
    const allClips = projectStore.getAllClips();
    const allClipIds = allClips.map((clip) => clip.id);
    useTimelineStore.getState().selectClips(allClipIds);
  };

  /**
   * 复制选中的片段
   */
  handleDuplicateSelected = (): void => {
    const selectedClips = useTimelineStore.getState().selectedClips;
    const projectStore = useProjectStore.getState();

    selectedClips.forEach((clipId) => {
      projectStore.duplicateClip(clipId);
    });
  };

  /**
   * 验证 Action 移动的有效性
   */
  private validateActionMove = (
    action: TimelineAction,
    newStart: number
  ): boolean => {
    if (newStart < 0) {
      return false;
    }

    // 检查是否与其他 action 重叠
    // 这里可以添加更复杂的碰撞检测逻辑
    return true;
  };

  /**
   * 验证 Action 大小调整的有效性
   */
  private validateActionResize = (
    action: TimelineAction,
    newStart: number,
    newEnd: number
  ): boolean => {
    if (newStart < 0 || newEnd <= newStart) {
      return false;
    }

    const minDuration = 0.1; // 100ms
    if (newEnd - newStart < minDuration) {
      return false;
    }

    return true;
  };

  /**
   * 对齐到网格
   */
  private snapToGrid = (time: number): number => {
    const timelineState = useTimelineStore.getState();
    if (!timelineState.snapToGrid) {
      return time;
    }

    const gridSizeSeconds = timelineState.gridSize / 1000;
    return Math.round(time / gridSizeSeconds) * gridSizeSeconds;
  };

  /**
   * 清理资源
   */
  dispose(): void {
    this.callbacks = {};
  }
}

/**
 * 创建单例事件处理器实例
 */
export const timelineEventHandler = new TimelineEventHandler();
