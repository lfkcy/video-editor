/**
 * 时间轴状态适配器
 * 负责协调现有状态管理与 react-timeline-editor 的状态同步
 */

import { useProjectStore, useTimelineStore } from "@/stores";
import {
  timelineDataAdapter,
  TimelineRow,
  TimelineEffect,
  TimelineAction,
  TimelineDataAdapter,
} from "./timeline-data-adapter";
import { Track, Clip } from "@/types/project";

export interface TimelineEditorData {
  editorData: TimelineRow[];
  effects: Record<string, TimelineEffect>;
  currentTime: number; // 秒
  scale: number;
}

/**
 * 时间轴状态适配器类
 */
export class TimelineStateAdapter {
  private projectStore = useProjectStore.getState();
  private timelineStore = useTimelineStore.getState();

  // 状态变更监听器
  private onDataChangeCallback?: (data: TimelineEditorData) => void;
  private onTimeChangeCallback?: (time: number) => void;
  private onSelectionChangeCallback?: (actionIds: string[]) => void;

  constructor() {
    // 订阅 store 变化
    this.subscribeToStores();
  }

  /**
   * 设置数据变更回调
   */
  setOnDataChange(callback: (data: TimelineEditorData) => void) {
    this.onDataChangeCallback = callback;
  }

  /**
   * 设置时间变更回调
   */
  setOnTimeChange(callback: (time: number) => void) {
    this.onTimeChangeCallback = callback;
  }

  /**
   * 设置选择变更回调
   */
  setOnSelectionChange(callback: (actionIds: string[]) => void) {
    this.onSelectionChangeCallback = callback;
  }

  /**
   * 从 stores 同步数据到 react-timeline-editor
   */
  syncFromStores(): TimelineEditorData {
    // 总是获取最新的状态，而不是使用缓存的状态
    const currentProject = useProjectStore.getState().currentProject;
    const timelineState = useTimelineStore.getState();

    console.log("syncFromStores - 当前项目:", currentProject);
    console.log("syncFromStores - 时间轴状态:", timelineState);

    if (!currentProject) {
      console.log("syncFromStores - 没有当前项目，返回空数据");
      return {
        editorData: [],
        effects: {},
        currentTime: 0,
        scale: 1,
      };
    }

    const tracks = currentProject.tracks;
    console.log("syncFromStores - 轨道数据:", tracks);

    const allClips = timelineDataAdapter.getAllClips(tracks);
    console.log("syncFromStores - 所有片段:", allClips);

    const editorData = timelineDataAdapter.convertTracksToRows(tracks);
    console.log("syncFromStores - 转换后的编辑器数据:", editorData);

    const effects = timelineDataAdapter.createEffectsMap(allClips);
    console.log("syncFromStores - Effects 映射:", effects);

    const result = {
      editorData,
      effects,
      currentTime: TimelineDataAdapter.timeUtils.msToSeconds(
        timelineState.playhead
      ),
      scale: this.calculateTimelineScale(timelineState.scale),
    };

    console.log("syncFromStores - 最终返回结果:", result);
    return result;
  }

  /**
   * 从 react-timeline-editor 同步数据到 stores
   */
  syncToStores(data: TimelineRow[]): void {
    const currentProject = useProjectStore.getState().currentProject;
    if (!currentProject) return;

    const originalTracks = currentProject.tracks;
    const updatedTracks = timelineDataAdapter.convertRowsToTracks(
      data,
      originalTracks
    );

    // 更新项目数据
    useProjectStore.getState().updateProject({ tracks: updatedTracks });
  }

  /**
   * 处理时间变更
   */
  handleTimeChange(time: number): void {
    const timeInMs = TimelineDataAdapter.timeUtils.secondsToMs(time);
    useTimelineStore.getState().seekTo(timeInMs);

    if (this.onTimeChangeCallback) {
      this.onTimeChangeCallback(time);
    }
  }

  /**
   * 处理 Action 变更
   */
  handleActionChange(action: TimelineAction, rowId: string): void {
    const currentProject = useProjectStore.getState().currentProject;
    if (!currentProject) return;

    // 找到对应的轨道和片段
    const track = currentProject.tracks.find((t) => t.id === rowId);
    if (!track) return;

    const clipIndex = track.clips.findIndex((c) => c.id === action.id);
    if (clipIndex === -1) return;

    // 更新片段数据
    const updatedClip: Clip = {
      ...track.clips[clipIndex],
      startTime: TimelineDataAdapter.timeUtils.secondsToMs(action.start),
      duration: TimelineDataAdapter.timeUtils.secondsToMs(
        action.end - action.start
      ),
      selected: action.selected || false,
    };

    // 更新 store
    useProjectStore.getState().updateClip(updatedClip.id, {
      startTime: updatedClip.startTime,
      duration: updatedClip.duration,
      selected: updatedClip.selected,
    });
  }

  /**
   * 处理轨道变更
   */
  handleRowChange(row: TimelineRow): void {
    const currentProject = useProjectStore.getState().currentProject;
    if (!currentProject) return;

    const originalTrack = currentProject.tracks.find((t) => t.id === row.id);
    if (!originalTrack) return;

    const updatedTrack = timelineDataAdapter.convertRowsToTracks(
      [row],
      [originalTrack]
    )[0];
    useProjectStore.getState().updateTrack(updatedTrack.id, {
      clips: updatedTrack.clips,
    });
  }

  /**
   * 处理选择变更
   */
  handleSelection(actionIds: string[]): void {
    useTimelineStore.getState().selectClips(actionIds);

    if (this.onSelectionChangeCallback) {
      this.onSelectionChangeCallback(actionIds);
    }
  }

  /**
   * 获取当前选中的 Actions
   */
  getSelectedActions(): string[] {
    return useTimelineStore.getState().selectedClips;
  }

  /**
   * 处理播放控制
   */
  handlePlaybackControl(isPlaying: boolean): void {
    if (isPlaying) {
      useTimelineStore.getState().play();
    } else {
      useTimelineStore.getState().pause();
    }
  }

  /**
   * 处理缩放变更
   */
  handleScaleChange(scale: number): void {
    // react-timeline-editor 的 scale 概念与我们的 scale 可能不同
    // 这里需要进行转换
    const timelineScale = this.convertToTimelineScale(scale);
    useTimelineStore.getState().setScale(timelineScale);
  }

  /**
   * 订阅 stores 变化
   */
  private subscribeToStores(): void {
    // 订阅项目数据变化
    useProjectStore.subscribe((state) => {
      this.projectStore = state;
      this.notifyDataChange();
    });

    // 订阅时间轴状态变化
    useTimelineStore.subscribe((state) => {
      this.timelineStore = state;
      this.notifyTimeChange();
    });
  }

  /**
   * 通知数据变更
   */
  private notifyDataChange(): void {
    if (this.onDataChangeCallback) {
      const data = this.syncFromStores();
      this.onDataChangeCallback(data);
    }
  }

  /**
   * 通知时间变更
   */
  private notifyTimeChange(): void {
    if (this.onTimeChangeCallback) {
      const timeInSeconds = TimelineDataAdapter.timeUtils.msToSeconds(
        this.timelineStore.playhead
      );
      this.onTimeChangeCallback(timeInSeconds);
    }
  }

  /**
   * 计算 react-timeline-editor 的缩放比例
   */
  private calculateTimelineScale(timelineScale: number): number {
    // 这里可能需要根据实际情况调整计算方式
    // react-timeline-editor 的 scale 表示每秒对应的像素数
    return timelineScale * 1000; // 毫秒缩放转为秒缩放
  }

  /**
   * 转换为时间轴缩放比例
   */
  private convertToTimelineScale(editorScale: number): number {
    return editorScale / 1000; // 秒缩放转为毫秒缩放
  }

  /**
   * 处理拖拽操作
   */
  handleDragOperation(
    operation: "move" | "trim-start" | "trim-end",
    actionId: string,
    newTime: number
  ): void {
    const currentProject = useProjectStore.getState().currentProject;
    if (!currentProject) return;

    // 找到对应的片段
    let targetClip: Clip | null = null;
    let targetTrack: Track | null = null;

    for (const track of currentProject.tracks) {
      const clip = track.clips.find((c) => c.id === actionId);
      if (clip) {
        targetClip = clip;
        targetTrack = track;
        break;
      }
    }

    if (!targetClip || !targetTrack) return;

    const newTimeMs = TimelineDataAdapter.timeUtils.secondsToMs(newTime);

    let updatedClip: Clip;

    switch (operation) {
      case "move":
        updatedClip = {
          ...targetClip,
          startTime: newTimeMs,
        };
        break;
      case "trim-start":
        const newDuration =
          targetClip.duration - (newTimeMs - targetClip.startTime);
        updatedClip = {
          ...targetClip,
          startTime: newTimeMs,
          duration: Math.max(100, newDuration), // 最小100ms
          trimStart: targetClip.trimStart + (newTimeMs - targetClip.startTime),
        };
        break;
      case "trim-end":
        updatedClip = {
          ...targetClip,
          duration: Math.max(100, newTimeMs - targetClip.startTime),
          trimEnd:
            targetClip.trimEnd +
            (targetClip.duration - (newTimeMs - targetClip.startTime)),
        };
        break;
      default:
        return;
    }

    useProjectStore.getState().updateClip(updatedClip.id, {
      startTime: updatedClip.startTime,
      duration: updatedClip.duration,
      trimStart: updatedClip.trimStart,
      trimEnd: updatedClip.trimEnd,
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.onDataChangeCallback = undefined;
    this.onTimeChangeCallback = undefined;
    this.onSelectionChangeCallback = undefined;
  }
}

/**
 * 创建单例状态适配器实例
 */
export const timelineStateAdapter = new TimelineStateAdapter();
