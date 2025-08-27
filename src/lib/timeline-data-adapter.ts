/**
 * 时间轴数据适配器
 * 负责在现有数据模型与 react-timeline-editor 数据格式之间进行转换
 */

import { Track, Clip, ClipType } from "@/types/project";

// react-timeline-editor 的数据结构类型定义
export interface TimelineRow {
  id: string;
  actions: TimelineAction[];
}

export interface TimelineAction {
  id: string;
  start: number;
  end: number;
  effectId: string;
  disable?: boolean;
  flexible?: boolean;
  movable?: boolean;
  selected?: boolean;
}

export interface TimelineEffect {
  id: string;
  name: string;
  source?: {
    src: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * 时间轴数据适配器类
 */
export class TimelineDataAdapter {
  /**
   * 将项目的 Track 数组转换为 react-timeline-editor 的 TimelineRow 数组
   */
  convertTracksToRows(tracks: Track[]): TimelineRow[] {
    return tracks.map((track) => this.trackToRow(track));
  }

  /**
   * 将 react-timeline-editor 的 TimelineRow 数组转换回项目的 Track 数组
   */
  convertRowsToTracks(rows: TimelineRow[], originalTracks: Track[]): Track[] {
    return rows.map((row, index) => {
      const originalTrack =
        originalTracks.find((t) => t.id === row.id) || originalTracks[index];
      return this.rowToTrack(row, originalTrack);
    });
  }

  /**
   * 单个 Track 转换为 TimelineRow
   */
  private trackToRow(track: Track): TimelineRow {
    return {
      id: track.id,
      actions: track.clips.map((clip) => this.clipToAction(clip)),
    };
  }

  /**
   * 单个 TimelineRow 转换为 Track
   */
  private rowToTrack(row: TimelineRow, originalTrack: Track): Track {
    return {
      ...originalTrack,
      id: row.id,
      clips: row.actions.map((action) =>
        this.actionToClip(action, originalTrack.clips)
      ),
    };
  }

  /**
   * Clip 转换为 TimelineAction
   */
  private clipToAction(clip: Clip): TimelineAction {
    return {
      id: clip.id,
      start: clip.startTime, // 转换为秒
      end: clip.startTime + clip.duration, // 转换为秒
      effectId: clip.id, // 使用 clip.id 作为 effectId
      disable: false,
      flexible: true,
      movable: !clip.trackId || true, // 可移动
      selected: clip.selected,
    };
  }

  /**
   * TimelineAction 转换为 Clip
   */
  private actionToClip(action: TimelineAction, originalClips: Clip[]): Clip {
    // 查找原始的 clip 数据
    const originalClip = originalClips.find((c) => c.id === action.id);

    if (!originalClip) {
      // 如果找不到原始数据，创建一个基本的 Clip
      return this.createDefaultClip(action);
    }

    // 更新时间信息
    return {
      ...originalClip,
      id: action.id,
      startTime: action.start * 1000, // 转换为毫秒
      duration: (action.end - action.start) * 1000, // 转换为毫秒
      selected: action.selected || false,
    };
  }

  /**
   * 创建默认的 Clip 对象
   */
  private createDefaultClip(action: TimelineAction): Clip {
    return {
      id: action.id,
      type: "video" as ClipType,
      startTime: action.start * 1000,
      duration: (action.end - action.start) * 1000,
      trimStart: 0,
      trimEnd: 0,
      source: {
        id: action.effectId,
        type: "file",
        url: "",
        name: "未知片段",
        size: 0,
        metadata: {},
      },
      effects: [],
      transform: {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        anchorX: 0.5,
        anchorY: 0.5,
      },
      selected: action.selected || false,
      trackId: "",
    };
  }

  /**
   * 从 Clip 数组创建 Effects 映射
   */
  createEffectsMap(clips: Clip[]): Record<string, TimelineEffect> {
    const effects: Record<string, TimelineEffect> = {};

    clips.forEach((clip) => {
      effects[clip.id] = this.clipToEffect(clip);
    });

    return effects;
  }

  /**
   * 从所有 Track 中获取所有 Clip
   */
  getAllClips(tracks: Track[]): Clip[] {
    return tracks.reduce((allClips, track) => {
      return allClips.concat(track.clips);
    }, [] as Clip[]);
  }

  /**
   * Clip 转换为 TimelineEffect
   */
  private clipToEffect(clip: Clip): TimelineEffect {
    return {
      id: clip.id,
      name: clip.source.name || `${clip.type}片段`,
      source:
        clip.source.url || clip.source.metadata.thumbnail
          ? {
              src: clip.source.url || clip.source.metadata.thumbnail || "",
              type: clip.type,
              duration: clip.duration,
              startTime: clip.startTime,
              trimStart: clip.trimStart,
              trimEnd: clip.trimEnd,
            }
          : undefined,
      type: clip.type,
      duration: clip.duration,
      startTime: clip.startTime,
      trimStart: clip.trimStart,
      trimEnd: clip.trimEnd,
      // 添加额外的元数据
      metadata: {
        width: clip.source.metadata.width,
        height: clip.source.metadata.height,
        fps: clip.source.metadata.fps,
        format: clip.source.metadata.format,
      },
    };
  }

  /**
   * 验证数据完整性
   */
  validateTimelineData(
    rows: TimelineRow[],
    effects: Record<string, TimelineEffect>
  ): boolean {
    for (const row of rows) {
      for (const action of row.actions) {
        // 检查是否存在对应的 effect
        if (!effects[action.effectId]) {
          console.warn(
            `Missing effect for action ${action.id} with effectId ${action.effectId}`
          );
          return false;
        }

        // 检查时间范围是否有效
        if (action.start < 0 || action.end <= action.start) {
          console.warn(
            `Invalid time range for action ${action.id}: start=${action.start}, end=${action.end}`
          );
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 根据轨道类型获取显示配置
   */
  getTrackDisplayConfig(track: Track) {
    const baseConfig = {
      height: track.height || 60,
      color: this.getTrackColor(track.type),
      label: track.name,
      visible: track.isVisible,
      muted: track.isMuted,
      locked: track.isLocked,
    };

    return baseConfig;
  }

  /**
   * 根据轨道类型获取颜色
   */
  private getTrackColor(type: string): string {
    const colorMap: Record<string, string> = {
      video: "#3b82f6", // 蓝色
      audio: "#10b981", // 绿色
      image: "#f59e0b", // 橙色
      text: "#8b5cf6", // 紫色
    };
    return colorMap[type] || "#6b7280"; // 默认灰色
  }

  /**
   * 时间格式转换工具
   */
  static timeUtils = {
    // 毫秒转秒
    msToSeconds: (ms: number): number => ms / 1000,

    // 秒转毫秒
    secondsToMs: (seconds: number): number => seconds * 1000,

    // 格式化时间显示
    formatTime: (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    },
  };
}

/**
 * 创建单例适配器实例
 */
export const timelineDataAdapter = new TimelineDataAdapter();
