/**
 * 时间同步服务
 * 负责管理播放器时间、时间轴播放头和画布服务之间的同步
 */

import { canvasCompositionService } from './canvas-composition-service';

export class TimeSyncService {
  private isActive = false;
  private animationFrame: number | null = null;
  private lastUpdateTime = 0;
  private callbacks = new Set<(currentTime: number) => void>();

  /**
   * 添加时间更新回调
   */
  addUpdateCallback(callback: (currentTime: number) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 开始时间同步
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastUpdateTime = performance.now();
    this.scheduleUpdate();
  }

  /**
   * 停止时间同步
   */
  stop(): void {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * 暂停时间同步
   */
  pause(): void {
    this.stop();
  }

  /**
   * 恢复时间同步
   */
  resume(): void {
    this.start();
  }

  /**
   * 调度下一次更新
   */
  private scheduleUpdate(): void {
    if (!this.isActive) return;

    this.animationFrame = requestAnimationFrame((currentTime) => {
      this.update(currentTime);
      this.scheduleUpdate();
    });
  }

  /**
   * 更新时间同步
   */
  private update(currentTime: number): void {
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // 从画布服务获取当前播放时间
    try {
      const canvasCurrentTime = canvasCompositionService.getCurrentTime();
      const timeInMs = canvasCurrentTime * 1000; // 转换为毫秒

      // 通知所有回调
      this.callbacks.forEach(callback => {
        try {
          callback(timeInMs);
        } catch (error) {
          console.error('Time sync callback error:', error);
        }
      });
    } catch (error) {
      // 如果画布服务还未初始化或出错，继续同步
    }
  }

  /**
   * 手动同步到指定时间
   */
  syncTo(timeMs: number): void {
    this.callbacks.forEach(callback => {
      try {
        callback(timeMs);
      } catch (error) {
        console.error('Manual sync callback error:', error);
      }
    });
  }

  /**
   * 获取当前是否活跃
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stop();
    this.callbacks.clear();
  }
}

// 创建单例实例
export const timeSyncService = new TimeSyncService();

/**
 * 播放控制协调器
 * 协调各个服务的播放状态
 */
export class PlaybackCoordinator {
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;
  private playbackRate = 1;

  constructor(
    private timeSyncService: TimeSyncService,
    private canvasService: typeof canvasCompositionService
  ) {}

  /**
   * 开始播放
   */
  async play(): Promise<void> {
    if (this.isPlaying) return;

    try {
      // 启动画布播放
      await this.canvasService.play();
      
      // 启动时间同步
      this.timeSyncService.start();
      
      this.isPlaying = true;
    } catch (error) {
      console.error('Failed to start playback:', error);
      throw error;
    }
  }

  /**
   * 暂停播放
   */
  async pause(): Promise<void> {
    if (!this.isPlaying) return;

    try {
      // 暂停画布播放
      await this.canvasService.pause();
      
      // 暂停时间同步
      this.timeSyncService.pause();
      
      this.isPlaying = false;
    } catch (error) {
      console.error('Failed to pause playback:', error);
      throw error;
    }
  }

  /**
   * 停止播放
   */
  async stop(): Promise<void> {
    try {
      // 停止画布播放
      await this.canvasService.stop();
      
      // 停止时间同步
      this.timeSyncService.stop();
      
      // 重置状态
      this.isPlaying = false;
      this.currentTime = 0;
      
      // 同步到开始位置
      this.timeSyncService.syncTo(0);
    } catch (error) {
      console.error('Failed to stop playback:', error);
      throw error;
    }
  }

  /**
   * 跳转到指定时间
   */
  async seekTo(timeMs: number): Promise<void> {
    try {
      // 限制时间范围
      const clampedTime = Math.max(0, Math.min(this.duration, timeMs));
      
      // 画布服务跳转
      await this.canvasService.seekTo(clampedTime / 1000);
      
      // 更新当前时间
      this.currentTime = clampedTime;
      
      // 手动同步时间
      this.timeSyncService.syncTo(clampedTime);
    } catch (error) {
      console.error('Failed to seek:', error);
      throw error;
    }
  }

  /**
   * 设置播放速度
   */
  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.1, Math.min(4, rate));
    // 这里可以调用画布服务设置播放速度
    // 注意：WebAV 可能不支持动态播放速度调整
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.canvasService.setVolume(clampedVolume);
  }

  /**
   * 设置时长
   */
  setDuration(durationMs: number): void {
    this.duration = Math.max(0, durationMs);
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      playbackRate: this.playbackRate,
    };
  }

  /**
   * 销毁协调器
   */
  destroy(): void {
    this.stop();
  }
}

// 创建单例实例
export const playbackCoordinator = new PlaybackCoordinator(
  timeSyncService,
  canvasCompositionService
);