import { TimelineAction, TimelineRow } from '@xzdarcy/react-timeline-editor';
import { VisibleSprite } from '@webav/av-cliper';
import { VideoClipService } from '@/services/video-clip-service';
import { useProjectStore, useTimelineStore } from '@/stores';
import { Clip, ClipType } from '@/types/project';

/**
 * 时间轴与 AVCanvas 集成器
 * 负责处理时间轴编辑器与 AVCanvas 之间的数据绑定和同步
 * 基于示例代码模式实现完整的双向绑定
 */
export class TimelineAVCanvasIntegrator {
  private videoClipService: VideoClipService;
  private isInitialized = false;
  private timelineRef: React.MutableRefObject<any> | null = null;
  
  // 事件监听器
  private timeUpdateListeners: ((time: number) => void)[] = [];
  private dataChangeListeners: ((data: TimelineRow[]) => void)[] = [];
  private playStateListeners: ((isPlaying: boolean) => void)[] = [];

  constructor(videoClipService: VideoClipService) {
    this.videoClipService = videoClipService;
    this.setupVideoServiceListeners();
  }

  /**
   * 初始化集成器
   */
  initialize(timelineRef: React.MutableRefObject<any>): void {
    this.timelineRef = timelineRef;
    this.isInitialized = true;
    
    console.log('时间轴 AVCanvas 集成器初始化完成');
  }

  /**
   * 设置视频服务监听器
   */
  private setupVideoServiceListeners(): void {
    // 监听时间更新
    this.videoClipService.onTimeUpdate((time) => {
      this.handleTimeUpdate(time);
    });

    // 监听播放状态变化
    this.videoClipService.onPlayStateChange((isPlaying) => {
      this.handlePlayStateChange(isPlaying);
    });

    // 监听精灵添加
    this.videoClipService.onSpriteAdded((action, sprite) => {
      this.handleSpriteAdded(action, sprite);
    });

    // 监听精灵移除
    this.videoClipService.onSpriteRemoved((actionId) => {
      this.handleSpriteRemoved(actionId);
    });
  }

  /**
   * 处理时间更新 - 同步到时间轴
   */
  private handleTimeUpdate(time: number): void {
    if (!this.timelineRef?.current) return;

    try {
      // 更新时间轴播放头位置
      this.timelineRef.current.setTime(time);
      
      // 更新 store 中的播放头位置
      useTimelineStore.getState().setPlayhead(time);

      // 通知监听器
      this.timeUpdateListeners.forEach(listener => listener(time));

      console.log('同步时间到时间轴:', time);
    } catch (error) {
      console.error('同步时间失败:', error);
    }
  }

  /**
   * 处理播放状态变化
   */
  private handlePlayStateChange(isPlaying: boolean): void {
    try {
      // 更新 store 中的播放状态
      if (isPlaying) {
        useTimelineStore.getState().play();
      } else {
        useTimelineStore.getState().pause();
      }

      // 通知监听器
      this.playStateListeners.forEach(listener => listener(isPlaying));

      console.log('播放状态变化:', isPlaying);
    } catch (error) {
      console.error('处理播放状态变化失败:', error);
    }
  }

  /**
   * 处理精灵添加 - 添加到时间轴
   */
  private handleSpriteAdded(action: TimelineAction, sprite: VisibleSprite): void {
    try {
      const { addClip } = useProjectStore.getState();
      
      // 确定目标轨道
      const trackId = (action as any).trackId || this.determineTrackId(sprite);
      
      // 创建 Clip 对象
      const clip: Omit<Clip, 'id' | 'trackId'> = {
        type: this.determineClipType(sprite),
        startTime: action.start,
        duration: action.end - action.start,
        trimStart: 0,
        trimEnd: action.end - action.start,
        source: {
          id: `sprite-${action.id}`,
          type: 'file',
          url: '',
          name: `Media Clip ${action.id}`,
          size: 0,
          metadata: {
            duration: sprite.time.duration / 1e6,
            format: this.getMediaFormat(sprite),
            ...this.getMediaSize(sprite)
          }
        },
        effects: [],
        transform: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          anchorX: 0.5,
          anchorY: 0.5
        },
        selected: false
      };

      // 添加到项目中
      addClip(trackId, clip);

      console.log('精灵添加到时间轴:', { actionId: action.id, trackId, clip });
    } catch (error) {
      console.error('处理精灵添加失败:', error);
    }
  }

  /**
   * 处理精灵移除 - 从时间轴移除
   */
  private handleSpriteRemoved(actionId: string): void {
    try {
      const { removeClip } = useProjectStore.getState();
      removeClip(actionId);

      console.log('精灵从时间轴移除:', actionId);
    } catch (error) {
      console.error('处理精灵移除失败:', error);
    }
  }

  /**
   * 时间轴操作处理器
   */
  
  /**
   * 处理时间轴时间变化
   */
  handleTimelineTimeChange(time: number): void {
    try {
      // 同步到 AVCanvas
      this.videoClipService.seekTo(time);
      
      console.log('时间轴时间变化:', time);
    } catch (error) {
      console.error('处理时间轴时间变化失败:', error);
    }
  }

  /**
   * 处理 Action 移动
   */
  handleActionMove(action: TimelineAction): void {
    try {
      // 更新精灵时间属性
      const success = this.videoClipService.updateSpriteTime(action);
      
      if (success) {
        console.log('Action 移动同步成功:', action.id);
      }
    } catch (error) {
      console.error('处理 Action 移动失败:', error);
    }
  }

  /**
   * 处理 Action 调整大小
   */
  handleActionResize(action: TimelineAction, start: number, end: number): boolean {
    try {
      // 获取对应的精灵
      const sprite = this.videoClipService.getSprite(action);
      if (!sprite) {
        console.warn('未找到对应的精灵:', action.id);
        return false;
      }

      // 检查是否超出原始时长
      const requestedDuration = (end - start) * 1e6;
      const originalDuration = sprite.getClip().meta.duration;
      
      if (requestedDuration > originalDuration) {
        console.warn('调整的时长超出原始时长');
        return false;
      }

      // 更新 action 时间
      action.start = start;
      action.end = end;
      
      // 同步到精灵
      const success = this.videoClipService.updateSpriteTime(action);
      
      if (success) {
        console.log('Action 调整大小同步成功:', { actionId: action.id, start, end });
      }
      
      return success;
    } catch (error) {
      console.error('处理 Action 调整大小失败:', error);
      return false;
    }
  }

  /**
   * 处理 Action 删除
   */
  async handleActionDelete(action: TimelineAction): Promise<void> {
    try {
      // 从 AVCanvas 移除精灵
      await this.videoClipService.removeSprite(action);
      
      console.log('Action 删除成功:', action.id);
    } catch (error) {
      console.error('处理 Action 删除失败:', error);
      throw error;
    }
  }

  /**
   * 处理 Action 分割
   */
  async handleActionSplit(action: TimelineAction, splitTime: number): Promise<TimelineAction[]> {
    try {
      // 使用视频服务分割精灵
      const newActions = await this.videoClipService.splitSprite(action, splitTime);
      
      console.log('Action 分割成功:', { 
        originalId: action.id, 
        newActionsCount: newActions.length 
      });
      
      return newActions;
    } catch (error) {
      console.error('处理 Action 分割失败:', error);
      throw error;
    }
  }

  /**
   * 播放控制方法
   */
  
  /**
   * 播放/暂停切换
   */
  togglePlayPause(): void {
    try {
      const { isPlaying } = useTimelineStore.getState();
      
      if (isPlaying) {
        this.videoClipService.pause();
      } else {
        const currentTime = useTimelineStore.getState().playhead;
        this.videoClipService.play(currentTime);
      }
    } catch (error) {
      console.error('切换播放状态失败:', error);
    }
  }

  /**
   * 跳转到指定时间
   */
  seekTo(time: number): void {
    try {
      this.videoClipService.seekTo(time);
      
      // 同时更新时间轴
      if (this.timelineRef?.current) {
        this.timelineRef.current.setTime(time);
      }
    } catch (error) {
      console.error('跳转时间失败:', error);
    }
  }

  /**
   * 工具方法
   */
  
  /**
   * 确定片段类型
   */
  private determineClipType(sprite: VisibleSprite): ClipType {
    const clip = sprite.getClip();
    const clipName = clip.constructor.name.toLowerCase();
    
    if (clipName.includes('mp4') || clipName.includes('video')) {
      return 'video';
    } else if (clipName.includes('audio')) {
      return 'audio';
    } else if (clipName.includes('img') || clipName.includes('image')) {
      return 'image';
    } else if (clipName.includes('text')) {
      return 'text';
    }
    
    // 默认返回 video 类型
    return 'video';
  }

  /**
   * 确定轨道 ID
   */
  private determineTrackId(sprite: VisibleSprite): string {
    const clip = sprite.getClip();
    
    // 根据 clip 类型确定轨道
    if (clip.constructor.name.includes('MP4')) {
      return 'video-track-1';
    } else if (clip.constructor.name.includes('Audio')) {
      return 'audio-track-1';
    } else if (clip.constructor.name.includes('Img')) {
      return 'image-track-1';
    }
    
    return 'default-track';
  }

  /**
   * 获取媒体格式
   */
  private getMediaFormat(sprite: VisibleSprite): string {
    const clip = sprite.getClip();
    return clip.constructor.name;
  }

  /**
   * 获取媒体大小
   */
  private getMediaSize(sprite: VisibleSprite): { width: number; height: number } {
    try {
      const clip = sprite.getClip();
      return {
        width: (clip as any).meta?.videoWidth || 0,
        height: (clip as any).meta?.videoHeight || 0
      };
    } catch {
      return { width: 0, height: 0 };
    }
  }

  /**
   * 事件监听器管理
   */
  
  onTimeUpdate(callback: (time: number) => void): () => void {
    this.timeUpdateListeners.push(callback);
    return () => {
      const index = this.timeUpdateListeners.indexOf(callback);
      if (index > -1) {
        this.timeUpdateListeners.splice(index, 1);
      }
    };
  }

  onDataChange(callback: (data: TimelineRow[]) => void): () => void {
    this.dataChangeListeners.push(callback);
    return () => {
      const index = this.dataChangeListeners.indexOf(callback);
      if (index > -1) {
        this.dataChangeListeners.splice(index, 1);
      }
    };
  }

  onPlayStateChange(callback: (isPlaying: boolean) => void): () => void {
    this.playStateListeners.push(callback);
    return () => {
      const index = this.playStateListeners.indexOf(callback);
      if (index > -1) {
        this.playStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * 销毁集成器
   */
  destroy(): void {
    this.timeUpdateListeners = [];
    this.dataChangeListeners = [];
    this.playStateListeners = [];
    this.timelineRef = null;
    this.isInitialized = false;
    
    console.log('时间轴 AVCanvas 集成器已销毁');
  }

  /**
   * 获取初始化状态
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * 创建时间轴 AVCanvas 集成器
 */
export function createTimelineAVCanvasIntegrator(
  videoClipService: VideoClipService
): TimelineAVCanvasIntegrator {
  return new TimelineAVCanvasIntegrator(videoClipService);
}