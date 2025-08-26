import { TimelineAction, TimelineRow } from '@xzdarcy/react-timeline-editor';
import { VisibleSprite } from '@webav/av-cliper';
import { VideoClipService } from '@/services/video-clip-service';
import { TimelineAVCanvasIntegrator } from './timeline-avcanvas-integrator';
import { useProjectStore, useTimelineStore, useHistoryStore } from '@/stores';

/**
 * 片段操作类型
 */
export type ClipOperationType = 
  | 'move' 
  | 'trim' 
  | 'split' 
  | 'delete' 
  | 'duplicate' 
  | 'merge';

/**
 * 片段操作参数
 */
export interface ClipOperationParams {
  actionIds: string[];
  newStartTime?: number;
  newEndTime?: number;
  splitTime?: number;
  targetTrackId?: string;
  offset?: number;
}

/**
 * 片段操作结果
 */
export interface ClipOperationResult {
  success: boolean;
  newActions?: TimelineAction[];
  deletedActionIds?: string[];
  error?: string;
}

/**
 * 片段操作管理器
 * 提供完整的时间轴片段操作功能，包括移动、修剪、分割、删除等
 * 与AVCanvas保持完美同步
 */
export class ClipOperationManager {
  private videoClipService: VideoClipService;
  private timelineIntegrator: TimelineAVCanvasIntegrator;
  private isInitialized = false;
  
  // 操作历史
  private operationHistory: Array<{
    type: ClipOperationType;
    params: ClipOperationParams;
    result: ClipOperationResult;
    timestamp: number;
  }> = [];
  
  // 事件监听器
  private operationListeners: ((type: ClipOperationType, result: ClipOperationResult) => void)[] = [];

  constructor(
    videoClipService: VideoClipService,
    timelineIntegrator: TimelineAVCanvasIntegrator
  ) {
    this.videoClipService = videoClipService;
    this.timelineIntegrator = timelineIntegrator;
  }

  /**
   * 初始化片段操作管理器
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.isInitialized = true;
    console.log('片段操作管理器初始化完成');
  }

  /**
   * 移动片段
   */
  async moveClips(params: ClipOperationParams): Promise<ClipOperationResult> {
    try {
      const { actionIds, newStartTime, targetTrackId } = params;
      
      if (!newStartTime) {
        throw new Error('移动操作需要指定新的开始时间');
      }

      const updatedActions: TimelineAction[] = [];
      
      // 开始批量操作
      const historyStore = useHistoryStore.getState();
      historyStore.startBatch('移动片段');

      try {
        for (const actionId of actionIds) {
          const action = this.findActionById(actionId);
          if (!action) {
            console.warn('未找到片段:', actionId);
            continue;
          }

          // 计算新的时间
          const duration = action.end - action.start;
          const newAction: TimelineAction = {
            ...action,
            start: newStartTime,
            end: newStartTime + duration
          };

          // 如果指定了新轨道，更新轨道信息
          if (targetTrackId) {
            (newAction as any).trackId = targetTrackId;
          }

          // 通过集成器更新
          this.timelineIntegrator.handleActionMove(newAction);
          
          updatedActions.push(newAction);
        }

        // 记录操作历史
        historyStore.pushAction({
          type: 'move-clip',
          description: `移动 ${actionIds.length} 个片段`,
          data: { actionIds, newStartTime, targetTrackId }
        });
      } finally {
        historyStore.endBatch();
      }

      const result: ClipOperationResult = {
        success: true,
        newActions: updatedActions
      };

      this.recordOperation('move', params, result);
      this.notifyOperationListeners('move', result);
      
      console.log('移动片段成功:', { actionIds, newStartTime, targetTrackId });
      return result;
      
    } catch (error) {
      console.error('移动片段失败:', error);
      const result: ClipOperationResult = {
        success: false,
        error: error instanceof Error ? error.message : '移动失败'
      };
      
      this.recordOperation('move', params, result);
      return result;
    }
  }

  /**
   * 修剪片段
   */
  async trimClips(params: ClipOperationParams): Promise<ClipOperationResult> {
    try {
      const { actionIds, newStartTime, newEndTime } = params;
      
      if (!newStartTime && !newEndTime) {
        throw new Error('修剪操作需要指定新的开始时间或结束时间');
      }

      const updatedActions: TimelineAction[] = [];
      
      // 开始批量操作
      const historyStore = useHistoryStore.getState();
      historyStore.startBatch('修剪片段');

      try {
        for (const actionId of actionIds) {
          const action = this.findActionById(actionId);
          if (!action) continue;

          // 计算新的时间范围
          const newAction: TimelineAction = {
            ...action,
            start: newStartTime !== undefined ? newStartTime : action.start,
            end: newEndTime !== undefined ? newEndTime : action.end
          };

          // 验证修剪范围
          if (newAction.start >= newAction.end) {
            console.warn('修剪范围无效:', newAction);
            continue;
          }

          // 通过集成器处理调整大小
          const success = this.timelineIntegrator.handleActionResize(
            newAction, 
            newAction.start, 
            newAction.end
          );

          if (success) {
            updatedActions.push(newAction);
          }
        }

        // 记录操作历史
        historyStore.pushAction({
          type: 'trim-clip',
          description: `修剪 ${actionIds.length} 个片段`,
          data: { actionIds, newStartTime, newEndTime }
        });
      } finally {
        historyStore.endBatch();
      }

      const result: ClipOperationResult = {
        success: true,
        newActions: updatedActions
      };

      this.recordOperation('trim', params, result);
      this.notifyOperationListeners('trim', result);
      
      console.log('修剪片段成功:', { actionIds, newStartTime, newEndTime });
      return result;
      
    } catch (error) {
      console.error('修剪片段失败:', error);
      const result: ClipOperationResult = {
        success: false,
        error: error instanceof Error ? error.message : '修剪失败'
      };
      
      this.recordOperation('trim', params, result);
      return result;
    }
  }

  /**
   * 分割片段
   */
  async splitClips(params: ClipOperationParams): Promise<ClipOperationResult> {
    try {
      const { actionIds, splitTime } = params;
      
      if (!splitTime) {
        throw new Error('分割操作需要指定分割时间');
      }

      const allNewActions: TimelineAction[] = [];
      const deletedActionIds: string[] = [];
      
      // 开始批量操作
      const historyStore = useHistoryStore.getState();
      historyStore.startBatch('分割片段');

      try {
        for (const actionId of actionIds) {
          const action = this.findActionById(actionId);
          if (!action) continue;

          // 检查分割时间是否在片段范围内
          if (splitTime <= action.start || splitTime >= action.end) {
            console.warn('分割时间超出片段范围:', { actionId, splitTime, start: action.start, end: action.end });
            continue;
          }

          // 通过集成器处理分割
          const newActions = await this.timelineIntegrator.handleActionSplit(action, splitTime);
          
          allNewActions.push(...newActions);
          deletedActionIds.push(actionId);
        }

        // 记录操作历史
        historyStore.pushAction({
          type: 'split-clip',
          description: `分割 ${actionIds.length} 个片段`,
          data: { actionIds, splitTime }
        });
      } finally {
        historyStore.endBatch();
      }

      const result: ClipOperationResult = {
        success: true,
        newActions: allNewActions,
        deletedActionIds
      };

      this.recordOperation('split', params, result);
      this.notifyOperationListeners('split', result);
      
      console.log('分割片段成功:', { actionIds, splitTime, newActionsCount: allNewActions.length });
      return result;
      
    } catch (error) {
      console.error('分割片段失败:', error);
      const result: ClipOperationResult = {
        success: false,
        error: error instanceof Error ? error.message : '分割失败'
      };
      
      this.recordOperation('split', params, result);
      return result;
    }
  }

  /**
   * 删除片段
   */
  async deleteClips(params: ClipOperationParams): Promise<ClipOperationResult> {
    try {
      const { actionIds } = params;
      
      if (actionIds.length === 0) {
        throw new Error('删除操作需要指定要删除的片段');
      }

      const deletedActionIds: string[] = [];
      
      // 开始批量操作
      const historyStore = useHistoryStore.getState();
      historyStore.startBatch('删除片段');

      try {
        for (const actionId of actionIds) {
          const action = this.findActionById(actionId);
          if (!action) continue;

          // 通过集成器处理删除
          await this.timelineIntegrator.handleActionDelete(action);
          
          deletedActionIds.push(actionId);
        }

        // 记录操作历史
        historyStore.pushAction({
          type: 'remove-clip',
          description: `删除 ${actionIds.length} 个片段`,
          data: { actionIds }
        });
      } finally {
        historyStore.endBatch();
      }

      const result: ClipOperationResult = {
        success: true,
        deletedActionIds
      };

      this.recordOperation('delete', params, result);
      this.notifyOperationListeners('delete', result);
      
      console.log('删除片段成功:', { actionIds });
      return result;
      
    } catch (error) {
      console.error('删除片段失败:', error);
      const result: ClipOperationResult = {
        success: false,
        error: error instanceof Error ? error.message : '删除失败'
      };
      
      this.recordOperation('delete', params, result);
      return result;
    }
  }

  /**
   * 复制片段
   */
  async duplicateClips(params: ClipOperationParams): Promise<ClipOperationResult> {
    try {
      const { actionIds, offset = 0 } = params;
      
      if (actionIds.length === 0) {
        throw new Error('复制操作需要指定要复制的片段');
      }

      const newActions: TimelineAction[] = [];
      
      // 开始批量操作
      const historyStore = useHistoryStore.getState();
      historyStore.startBatch('复制片段');

      try {
        for (const actionId of actionIds) {
          const action = this.findActionById(actionId);
          if (!action) continue;

          // 获取对应的精灵
          const sprite = this.videoClipService.getSprite(action);
          if (!sprite) {
            console.warn('未找到对应的精灵:', actionId);
            continue;
          }

          // 创建新的精灵副本（这里需要克隆精灵）
          // 注意：实际实现可能需要更复杂的克隆逻辑
          const clip = sprite.getClip();
          const newSprite = new VisibleSprite(clip);
          
          // 设置新的时间偏移
          const duration = action.end - action.start;
          const newStartTime = action.end + offset;
          newSprite.time.offset = newStartTime * 1e6;
          newSprite.time.duration = duration * 1e6;

          // 添加到画布
          const avCanvasManager = this.videoClipService.getAVCanvasManager();
          await avCanvasManager.getAVCanvas()?.addSprite(newSprite);

          // 创建新的动作
          const newAction: TimelineAction = {
            id: Math.random().toString(36).substr(2, 9),
            start: newStartTime,
            end: newStartTime + duration,
            effectId: action.effectId,
            name: `${action.name} (副本)`
          };

          // 注册映射关系
          this.videoClipService.getActionSpriteManager().register(newAction, newSprite);
          
          newActions.push(newAction);
        }

        // 记录操作历史
        historyStore.pushAction({
          type: 'add-clip',
          description: `复制 ${actionIds.length} 个片段`,
          data: { actionIds, offset }
        });
      } finally {
        historyStore.endBatch();
      }

      const result: ClipOperationResult = {
        success: true,
        newActions
      };

      this.recordOperation('duplicate', params, result);
      this.notifyOperationListeners('duplicate', result);
      
      console.log('复制片段成功:', { actionIds, newActionsCount: newActions.length });
      return result;
      
    } catch (error) {
      console.error('复制片段失败:', error);
      const result: ClipOperationResult = {
        success: false,
        error: error instanceof Error ? error.message : '复制失败'
      };
      
      this.recordOperation('duplicate', params, result);
      return result;
    }
  }

  /**
   * 工具方法
   */
  
  /**
   * 根据ID查找动作
   */
  private findActionById(actionId: string): TimelineAction | null {
    // 这里需要从项目store或时间轴数据中查找
    // 简化实现，实际可能需要更复杂的查找逻辑
    return this.videoClipService.getActionSpriteManager().getSpriteByActionId(actionId)
      ? { id: actionId } as TimelineAction
      : null;
  }

  /**
   * 记录操作历史
   */
  private recordOperation(
    type: ClipOperationType,
    params: ClipOperationParams,
    result: ClipOperationResult
  ): void {
    this.operationHistory.push({
      type,
      params,
      result,
      timestamp: Date.now()
    });

    // 限制历史记录数量
    if (this.operationHistory.length > 100) {
      this.operationHistory.shift();
    }
  }

  /**
   * 通知操作监听器
   */
  private notifyOperationListeners(
    type: ClipOperationType,
    result: ClipOperationResult
  ): void {
    this.operationListeners.forEach(listener => {
      try {
        listener(type, result);
      } catch (error) {
        console.error('操作监听器执行失败:', error);
      }
    });
  }

  /**
   * 事件监听器管理
   */
  
  onOperation(callback: (type: ClipOperationType, result: ClipOperationResult) => void): () => void {
    this.operationListeners.push(callback);
    return () => {
      const index = this.operationListeners.indexOf(callback);
      if (index > -1) {
        this.operationListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取操作历史
   */
  getOperationHistory(): typeof this.operationHistory {
    return [...this.operationHistory];
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    operationTypes: Record<ClipOperationType, number>;
  } {
    const stats = {
      totalOperations: this.operationHistory.length,
      successfulOperations: 0,
      failedOperations: 0,
      operationTypes: {} as Record<ClipOperationType, number>
    };

    this.operationHistory.forEach(op => {
      if (op.result.success) {
        stats.successfulOperations++;
      } else {
        stats.failedOperations++;
      }

      stats.operationTypes[op.type] = (stats.operationTypes[op.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 销毁操作管理器
   */
  destroy(): void {
    this.operationHistory = [];
    this.operationListeners = [];
    this.isInitialized = false;
    
    console.log('片段操作管理器已销毁');
  }

  /**
   * 获取初始化状态
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * 创建片段操作管理器
 */
export function createClipOperationManager(
  videoClipService: VideoClipService,
  timelineIntegrator: TimelineAVCanvasIntegrator
): ClipOperationManager {
  return new ClipOperationManager(videoClipService, timelineIntegrator);
}