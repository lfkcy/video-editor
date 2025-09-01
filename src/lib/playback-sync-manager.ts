import { VideoClipService } from "@/services/video-clip-service";
import { TimelineAVCanvasIntegrator } from "./timeline-avcanvas-integrator";
import { useTimelineStore } from "@/stores";

/**
 * 播放控制同步管理器
 * 负责协调 PlayerControls、TimelineEditor 和 AVCanvas 之间的播放状态同步
 */
export class PlaybackSyncManager {
  private videoClipService: VideoClipService;
  private timelineIntegrator: TimelineAVCanvasIntegrator;
  private isInitialized = false;

  // 同步状态
  private syncInterval: number | null = null;
  private lastSyncTime = 0;
  private isExternalUpdate = false;

  // 事件监听器
  private playStateListeners: ((isPlaying: boolean) => void)[] = [];
  private timeUpdateListeners: ((time: number) => void)[] = [];
  private durationChangeListeners: ((duration: number) => void)[] = [];

  constructor(
    videoClipService: VideoClipService,
    timelineIntegrator: TimelineAVCanvasIntegrator
  ) {
    this.videoClipService = videoClipService;
    this.timelineIntegrator = timelineIntegrator;
    this.setupSyncListeners();
  }

  /**
   * 初始化同步管理器
   */
  initialize(): void {
    if (this.isInitialized) return;

    // 启动定时同步
    this.startSyncInterval();

    this.isInitialized = true;
    console.log("播放控制同步管理器初始化完成");
  }

  /**
   * 设置同步监听器
   */
  private setupSyncListeners(): void {
    // 监听视频服务的时间更新
    this.videoClipService.onTimeUpdate((time) => {
      if (!this.isExternalUpdate) {
        this.handleTimeUpdate(time);
      }
    });

    // 监听播放状态变化
    this.videoClipService.onPlayStateChange((isPlaying) => {
      if (!this.isExternalUpdate) {
        this.handlePlayStateChange(isPlaying);
      }
    });
  }

  /**
   * 启动同步间隔
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // 每100ms同步一次状态
    this.syncInterval = window.setInterval(() => {
      this.syncStates();
    }, 100);
  }

  /**
   * 同步所有状态
   */
  private syncStates(): void {
    const timelineStore = useTimelineStore.getState();
    const currentTime = Date.now();

    // 避免过于频繁的同步
    if (currentTime - this.lastSyncTime < 50) {
      return;
    }

    this.lastSyncTime = currentTime;

    // 确保播放状态一致
    // 这里可以添加更多的状态同步逻辑
  }

  /**
   * 处理时间更新
   */
  private handleTimeUpdate(time: number): void {
    try {
      // 更新时间轴store
      const timelineStore = useTimelineStore.getState();
      timelineStore.setPlayhead(time * 1000); // 转换为毫秒

      // 通知监听器
      this.timeUpdateListeners.forEach((listener) => {
        try {
          listener(time);
        } catch (error) {
          console.error("时间更新监听器执行失败:", error);
        }
      });

      console.log("同步时间更新:", time);
    } catch (error) {
      console.error("处理时间更新失败:", error);
    }
  }

  /**
   * 处理播放状态变化
   */
  private handlePlayStateChange(isPlaying: boolean): void {
    try {
      // 更新时间轴store
      const timelineStore = useTimelineStore.getState();
      if (isPlaying) {
        timelineStore.play();
      } else {
        timelineStore.pause();
      }

      // 通知监听器
      this.playStateListeners.forEach((listener) => {
        try {
          listener(isPlaying);
        } catch (error) {
          console.error("播放状态监听器执行失败:", error);
        }
      });

      console.log("同步播放状态变化:", isPlaying);
    } catch (error) {
      console.error("处理播放状态变化失败:", error);
    }
  }

  /**
   * 播放控制方法
   */

  /**
   * 播放/暂停切换
   */
  async togglePlayPause(): Promise<void> {
    try {
      this.isExternalUpdate = true;

      const timelineStore = useTimelineStore.getState();
      if (timelineStore.isPlaying) {
        await this.pause();
      } else {
        await this.play();
      }
    } finally {
      this.isExternalUpdate = false;
    }
  }

  /**
   * 播放
   */
  async play(startTime?: number): Promise<void> {
    try {
      this.isExternalUpdate = true;

      const timelineStore = useTimelineStore.getState();
      const playTime = startTime ?? timelineStore.playhead / 1000;

      // 通过视频服务播放
      this.videoClipService.play(playTime);

      // 更新store状态
      timelineStore.play();

      console.log("播放开始:", playTime);
    } catch (error) {
      console.error("播放失败:", error);
      throw error;
    } finally {
      this.isExternalUpdate = false;
    }
  }

  /**
   * 暂停
   */
  async pause(): Promise<void> {
    try {
      this.isExternalUpdate = true;

      // 通过视频服务暂停
      this.videoClipService.pause();

      // 更新store状态
      const timelineStore = useTimelineStore.getState();
      timelineStore.pause();

      console.log("播放暂停");
    } catch (error) {
      console.error("暂停失败:", error);
      throw error;
    } finally {
      this.isExternalUpdate = false;
    }
  }

  /**
   * 停止
   */
  async stop(): Promise<void> {
    try {
      this.isExternalUpdate = true;

      // 通过视频服务暂停
      this.videoClipService.pause();

      // 跳转到开始位置
      await this.seekTo(0);

      // 更新store状态
      const timelineStore = useTimelineStore.getState();
      timelineStore.stop();
      timelineStore.setPlayhead(0);

      console.log("播放停止");
    } catch (error) {
      console.error("停止失败:", error);
      throw error;
    } finally {
      this.isExternalUpdate = false;
    }
  }

  /**
   * 跳转到指定时间
   */
  async seekTo(time: number): Promise<void> {
    try {
      this.isExternalUpdate = true;

      // 通过视频服务跳转
      this.videoClipService.seekTo(time);

      // 使用时间轴集成器处理
      this.timelineIntegrator.seekTo(time);

      // 更新store状态
      const timelineStore = useTimelineStore.getState();
      timelineStore.setPlayhead(time * 1000); // 转换为毫秒

      console.log("跳转到时间:", time);
    } catch (error) {
      console.error("跳转失败:", error);
      throw error;
    } finally {
      this.isExternalUpdate = false;
    }
  }

  /**
   * 向后跳转
   */
  async skipBack(seconds: number = 5): Promise<void> {
    const timelineStore = useTimelineStore.getState();
    const currentTime = timelineStore.playhead / 1000;
    const newTime = Math.max(0, currentTime - seconds);
    await this.seekTo(newTime);
  }

  /**
   * 向前跳转
   */
  async skipForward(seconds: number = 5): Promise<void> {
    const timelineStore = useTimelineStore.getState();
    const currentTime = timelineStore.playhead / 1000;
    const duration = timelineStore.duration / 1000;
    const newTime = Math.min(duration, currentTime + seconds);
    await this.seekTo(newTime);
  }

  /**
   * 事件监听器管理
   */

  onPlayStateChange(callback: (isPlaying: boolean) => void): () => void {
    this.playStateListeners.push(callback);
    return () => {
      const index = this.playStateListeners.indexOf(callback);
      if (index > -1) {
        this.playStateListeners.splice(index, 1);
      }
    };
  }

  onTimeUpdate(callback: (time: number) => void): () => void {
    this.timeUpdateListeners.push(callback);
    return () => {
      const index = this.timeUpdateListeners.indexOf(callback);
      if (index > -1) {
        this.timeUpdateListeners.splice(index, 1);
      }
    };
  }

  onDurationChange(callback: (duration: number) => void): () => void {
    this.durationChangeListeners.push(callback);
    return () => {
      const index = this.durationChangeListeners.indexOf(callback);
      if (index > -1) {
        this.durationChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取播放状态
   */
  getPlaybackState(): {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
  } {
    const timelineStore = useTimelineStore.getState();
    return {
      isPlaying: timelineStore.isPlaying,
      currentTime: timelineStore.playhead / 1000,
      duration: timelineStore.duration / 1000,
    };
  }

  /**
   * 销毁同步管理器
   */
  destroy(): void {
    // 清除同步间隔
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // 清除监听器
    this.playStateListeners = [];
    this.timeUpdateListeners = [];
    this.durationChangeListeners = [];

    this.isInitialized = false;

    console.log("播放控制同步管理器已销毁");
  }

  /**
   * 获取初始化状态
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * 创建播放控制同步管理器
 */
export function createPlaybackSyncManager(
  videoClipService: VideoClipService,
  timelineIntegrator: TimelineAVCanvasIntegrator
): PlaybackSyncManager {
  return new PlaybackSyncManager(videoClipService, timelineIntegrator);
}
