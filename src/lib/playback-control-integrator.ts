/**
 * 播放控制集成器
 * 负责同步 react-timeline-editor 与现有播放系统的状态
 */

import { useTimelineStore } from "@/stores";
import { TimelineDataAdapter } from "./timeline-data-adapter";

export interface PlaybackControlOptions {
  autoSync?: boolean; // 是否自动同步
  syncInterval?: number; // 同步间隔（毫秒）
  onPlayStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

/**
 * 播放控制集成器类
 */
export class PlaybackControlIntegrator {
  private options: PlaybackControlOptions;
  private timelineStore = useTimelineStore.getState();
  private syncTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  // 回调函数
  private onPlayStateChangeCallback?: (isPlaying: boolean) => void;
  private onTimeUpdateCallback?: (time: number) => void;
  private onDurationChangeCallback?: (duration: number) => void;

  constructor(options: PlaybackControlOptions = {}) {
    this.options = {
      autoSync: true,
      syncInterval: 100, // 100ms 同步间隔
      ...options,
    };

    this.onPlayStateChangeCallback = options.onPlayStateChange;
    this.onTimeUpdateCallback = options.onTimeUpdate;
    this.onDurationChangeCallback = options.onDurationChange;

    // 订阅 timeline store 变化
    this.subscribeToTimelineStore();

    // 如果启用自动同步，开始同步
    if (this.options.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * 播放/暂停切换
   */
  togglePlayPause(): void {
    const isPlaying = this.timelineStore.isPlaying;
    if (isPlaying) {
      useTimelineStore.getState().pause();
    } else {
      useTimelineStore.getState().play();
    }
  }

  /**
   * 获取键盘快捷键处理器
   */
  createKeyboardHandler() {
    return {
      Space: () => this.togglePlayPause(),
      Home: () => useTimelineStore.getState().seekTo(0),
      ArrowLeft: () => useTimelineStore.getState().seekBy(-1000),
      ArrowRight: () => useTimelineStore.getState().seekBy(1000),
    };
  }

  /**
   * 开始自动同步
   */
  private startAutoSync(): void {
    if (this.syncTimer || this.isDestroyed) return;

    this.syncTimer = setInterval(() => {
      this.syncPlaybackState();
    }, this.options.syncInterval);
  }

  /**
   * 停止自动同步
   */
  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * 同步播放状态
   */
  private syncPlaybackState(): void {
    if (this.isDestroyed) return;

    const currentState = useTimelineStore.getState();

    // 检查状态是否有变化
    if (currentState.isPlaying !== this.timelineStore.isPlaying) {
      this.timelineStore = currentState;
      if (this.onPlayStateChangeCallback) {
        this.onPlayStateChangeCallback(currentState.isPlaying);
      }
    }

    if (currentState.playhead !== this.timelineStore.playhead) {
      this.timelineStore = currentState;
      const timeInSeconds = TimelineDataAdapter.timeUtils.msToSeconds(
        currentState.playhead
      );
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(timeInSeconds);
      }
    }
  }

  /**
   * 订阅 timeline store 变化
   */
  private subscribeToTimelineStore(): void {
    useTimelineStore.subscribe((state) => {
      if (this.isDestroyed) return;

      this.timelineStore = state;

      // 立即同步状态
      if (!this.options.autoSync) {
        this.syncPlaybackState();
      }
    });
  }

  /**
   * 销毁实例
   */
  dispose(): void {
    this.isDestroyed = true;
    this.stopAutoSync();
    this.onPlayStateChangeCallback = undefined;
    this.onTimeUpdateCallback = undefined;
    this.onDurationChangeCallback = undefined;
  }
}

/**
 * 创建播放控制集成器实例
 */
export function createPlaybackControlIntegrator(
  options?: PlaybackControlOptions
): PlaybackControlIntegrator {
  return new PlaybackControlIntegrator(options);
}
