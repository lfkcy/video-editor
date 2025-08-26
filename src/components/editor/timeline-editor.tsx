'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Timeline } from '@xzdarcy/react-timeline-editor';
import { useProjectStore, useTimelineStore } from '@/stores';
import { timelineDataAdapter, TimelineRow, TimelineEffect, TimelineAction, TimelineDataAdapter } from '@/lib/timeline-data-adapter';
import { timelineStateAdapter, TimelineEditorData } from '@/lib/timeline-state-adapter';
import { timelineEventHandler, TimelineEventCallbacks } from '@/lib/timeline-event-handler';
import { createPlaybackControlIntegrator, PlaybackControlIntegrator } from '@/lib/playback-control-integrator';
import { createTimelinePerformanceOptimizer, TimelinePerformanceOptimizer } from '@/lib/timeline-performance-optimizer';
import { EnhancedTimelineToolbar } from './enhanced-timeline-toolbar';
import { VideoClipService, createVideoClipService } from '@/services/video-clip-service';
import { TimelineAVCanvasIntegrator, createTimelineAVCanvasIntegrator } from '@/lib/timeline-avcanvas-integrator';

/**
 * TimelineEditor 组件属性
 */
interface TimelineEditorProps {
  height?: number;
  showToolbar?: boolean;
  className?: string;
  onTimelineChange?: (data: TimelineRow[]) => void;
  onTimeChange?: (time: number) => void;
  onSelectionChange?: (actionIds: string[]) => void;
}

/**
 * 新的时间轴编辑器组件
 * 使用 react-timeline-editor 替换原有的自定义实现
 */
export const TimelineEditor = React.forwardRef<any, TimelineEditorProps>((
  {
    height = 400,
    showToolbar = true,
    className = '',
    onTimelineChange,
    onTimeChange,
    onSelectionChange
  },
  ref
) => {
  // 状态管理
  const { currentProject } = useProjectStore();
  const {
    playhead,
    duration,
    scale,
    isPlaying,
    selectedClips,
    snapToGrid,
    gridSize
  } = useTimelineStore();

  // 本地状态
  const [editorData, setEditorData] = useState<TimelineRow[]>([]);
  const [effects, setEffects] = useState<Record<string, TimelineEffect>>({});
  const [currentTime, setCurrentTime] = useState(0);
  const [editorScale, setEditorScale] = useState(100); // 像素/秒

  // refs
  const timelineRef = useRef<any>(null);
  const stateAdapterRef = useRef(timelineStateAdapter);
  const eventHandlerRef = useRef(timelineEventHandler);
  const playbackControlRef = useRef<PlaybackControlIntegrator>();
  const performanceOptimizerRef = useRef<TimelinePerformanceOptimizer>();
  const videoClipServiceRef = useRef<VideoClipService>();
  const timelineIntegratorRef = useRef<TimelineAVCanvasIntegrator>();

  /**
   * 从 stores 同步数据
   */
  const syncFromStores = useCallback(() => {
    const data = stateAdapterRef.current.syncFromStores();
    setEditorData(data.editorData);
    setEffects(data.effects);
    setCurrentTime(data.currentTime);
    setEditorScale(data.scale);
  }, []);

  /**
   * 处理时间轴数据变更
   */
  const handleDataChange = useCallback((data: TimelineRow[]) => {
    setEditorData(data);
    stateAdapterRef.current.syncToStores(data);
    
    if (onTimelineChange) {
      onTimelineChange(data);
    }
  }, [onTimelineChange]);

  /**
   * 处理时间变更
   */
  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
    stateAdapterRef.current.handleTimeChange(time);
    
    if (onTimeChange) {
      onTimeChange(time);
    }
  }, [onTimeChange]);

  /**
   * 处理选择变更
   */
  const handleSelectionChange = useCallback((actionIds: string[]) => {
    stateAdapterRef.current.handleSelection(actionIds);
    
    if (onSelectionChange) {
      onSelectionChange(actionIds);
    }
  }, [onSelectionChange]);

  /**
   * 处理 Action 变更
   */
  const handleActionChange = useCallback((action: TimelineAction, rowId: string) => {
    stateAdapterRef.current.handleActionChange(action, rowId);
  }, []);

  /**
   * 处理轨道变更
   */
  const handleRowChange = useCallback((row: TimelineRow) => {
    stateAdapterRef.current.handleRowChange(row);
  }, []);

  /**
   * 处理缩放变更
   */
  const handleScaleChange = useCallback((newScale: number) => {
    setEditorScale(newScale);
    stateAdapterRef.current.handleScaleChange(newScale);
  }, []);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 如果焦点在输入框中，不处理快捷键
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('ctrl');
    if (e.shiftKey) modifiers.push('shift');
    if (e.altKey) modifiers.push('alt');

    // 先尝试事件处理器的快捷键
    const handled = eventHandlerRef.current.handleKeyboardShortcut(e.code, modifiers);
    if (handled) {
      e.preventDefault();
      return;
    }

    // 然后尝试播放控制的快捷键
    if (playbackControlRef.current) {
      const keyHandler = playbackControlRef.current.createKeyboardHandler();
      const keyName = e.code;
      
      if (keyHandler[keyName as keyof typeof keyHandler]) {
        e.preventDefault();
        keyHandler[keyName as keyof typeof keyHandler]();
        return;
      }
    }

    // 其他快捷键
    switch (e.code) {
      case 'Equal': // +
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleScaleChange(editorScale * 1.2);
        }
        break;
      case 'Minus': // -
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleScaleChange(editorScale / 1.2);
        }
        break;
      case 'Digit0': // 0
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          // 缩放到适合大小
          useTimelineStore.getState().zoomToFit();
        }
        break;
      case 'Escape': // Esc
        e.preventDefault();
        useTimelineStore.getState().clearSelection();
        break;
    }
  }, [editorScale, handleScaleChange]);

  /**
   * 处理播放控制
   */
  const handlePlaybackToggle = useCallback(() => {
    if (timelineIntegratorRef.current) {
      timelineIntegratorRef.current.togglePlayPause();
    } else {
      // 退补处理
      stateAdapterRef.current.handlePlaybackControl(!isPlaying);
    }
  }, [isPlaying]);

  /**
   * 初始化组件
   */
  useEffect(() => {
    // 创建 VideoClipService
    if (!videoClipServiceRef.current) {
      videoClipServiceRef.current = createVideoClipService();
    }

    // 创建时间轴集成器
    if (!timelineIntegratorRef.current && videoClipServiceRef.current) {
      timelineIntegratorRef.current = createTimelineAVCanvasIntegrator(
        videoClipServiceRef.current
      );
      
      // 初始化集成器
      timelineIntegratorRef.current.initialize(timelineRef);
    }

    // 创建性能优化器
    if (!performanceOptimizerRef.current) {
      performanceOptimizerRef.current = createTimelinePerformanceOptimizer({
        enableVirtualScrolling: true,
        batchUpdateDelay: 16,
        maxVisibleTracks: 50,
        trackHeightCaching: true,
        debounceDelay: 300,
        enableMetrics: true
      });
    }

    // 创建播放控制集成器
    if (!playbackControlRef.current) {
      playbackControlRef.current = createPlaybackControlIntegrator({
        autoSync: true,
        syncInterval: 100,
        onPlayStateChange: (isPlaying) => {
          console.log('播放状态变化:', isPlaying);
        },
        onTimeUpdate: (time) => {
          setCurrentTime(time);
        },
        onDurationChange: (duration) => {
          console.log('时长变化:', duration);
        }
      });
    }

    // 设置状态适配器回调
    stateAdapterRef.current.setOnDataChange((data: TimelineEditorData) => {
      setEditorData(data.editorData);
      setEffects(data.effects);
      setCurrentTime(data.currentTime);
      setEditorScale(data.scale);
    });

    stateAdapterRef.current.setOnTimeChange(setCurrentTime);
    stateAdapterRef.current.setOnSelectionChange(handleSelectionChange);

    // 设置事件处理器回调
    const eventCallbacks: TimelineEventCallbacks = {
      onActionSelect: (action, row) => {
        console.log('选中片段:', action.id);
      },
      onActionMove: (action, row, newStart) => {
        console.log('移动片段:', action.id, '新位置:', newStart);
        // 使用集成器处理移动
        if (timelineIntegratorRef.current) {
          timelineIntegratorRef.current.handleActionMove(action);
        }
      },
      onActionResize: (action, row, newStart, newEnd) => {
        console.log('调整片段大小:', action.id, newStart, newEnd);
        // 使用集成器处理调整大小
        if (timelineIntegratorRef.current) {
          return timelineIntegratorRef.current.handleActionResize(action, newStart, newEnd);
        }
        return false;
      },
      onActionDelete: (actionIds) => {
        console.log('删除片段:', actionIds);
        // 处理批量删除
        if (timelineIntegratorRef.current) {
          actionIds.forEach(actionId => {
            const action = { id: actionId } as TimelineAction;
            timelineIntegratorRef.current!.handleActionDelete(action);
          });
        }
      },
      onTimeChange: (time) => {
        handleTimeChange(time);
        // 使用集成器处理时间变化
        if (timelineIntegratorRef.current) {
          timelineIntegratorRef.current.handleTimelineTimeChange(time);
        }
      },
      onScaleChange: (scale) => {
        handleScaleChange(scale);
      }
    };
    
    eventHandlerRef.current.setCallbacks(eventCallbacks);

    // 初始同步
    syncFromStores();

    return () => {
      stateAdapterRef.current.dispose();
      eventHandlerRef.current.dispose();
      if (playbackControlRef.current) {
        playbackControlRef.current.dispose();
      }
      if (performanceOptimizerRef.current) {
        performanceOptimizerRef.current.dispose();
      }
      if (timelineIntegratorRef.current) {
        timelineIntegratorRef.current.destroy();
      }
      if (videoClipServiceRef.current) {
        videoClipServiceRef.current.destroy();
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [syncFromStores, handleSelectionChange, handleTimeChange, handleScaleChange, handleKeyDown]);

  /**
   * 注册键盘事件监听器
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  /**
   * 监听 stores 变化
   */
  useEffect(() => {
    syncFromStores();
  }, [currentProject, playhead, selectedClips, syncFromStores]);

  /**
   * 计算时间轴配置
   */
  const timelineConfig = {
    // 基础配置
    scale: editorScale,
    scaleWidth: 160,
    scaleSplitCount: 10,
    
    // 时间轴高度
    startLeft: 200, // 轨道头部宽度
    
    // 自动滚动
    autoScroll: true,
    
    // 网格配置
    gridSnap: snapToGrid,
    
    // 播放配置
    currentTime: currentTime,
    
    // 样式配置
    className: 'timeline-editor-container',
    
    // 拖拽配置
    dragLine: true,
    
    // 快捷键
    keyboardShortcuts: true
  };

  /**
   * 轨道头部渲染
   */
  const renderTrackHeader = useCallback((track: any, index: number) => {
    const originalTrack = currentProject?.tracks[index];
    if (!originalTrack) return null;

    const config = timelineDataAdapter.getTrackDisplayConfig(originalTrack);

    return (
      <div 
        className="track-header flex items-center px-3 py-2 border-r border-border bg-card"
        style={{ 
          height: config.height,
          backgroundColor: config.visible ? undefined : 'rgba(0,0,0,0.1)'
        }}
      >
        <div className="flex items-center space-x-2 flex-1">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-medium truncate">
            {config.label}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            className={`w-6 h-6 rounded text-xs ${
              config.visible ? 'bg-green-500 text-white' : 'bg-gray-400'
            }`}
            onClick={() => {
              // 切换可见性
              useProjectStore.getState().updateTrack(originalTrack.id, {
                isVisible: !originalTrack.isVisible
              });
            }}
            title={config.visible ? '隐藏轨道' : '显示轨道'}
          >
            👁
          </button>
          
          <button
            className={`w-6 h-6 rounded text-xs ${
              config.muted ? 'bg-red-500 text-white' : 'bg-gray-400'
            }`}
            onClick={() => {
              // 切换静音
              useProjectStore.getState().updateTrack(originalTrack.id, {
                isMuted: !originalTrack.isMuted
              });
            }}
            title={config.muted ? '取消静音' : '静音'}
          >
            🔇
          </button>
        </div>
      </div>
    );
  }, [currentProject]);

  /**
   * Action 渲染自定义
   */
  const renderAction = useCallback((action: TimelineAction, row: TimelineRow) => {
    const effect = effects[action.effectId];
    if (!effect) return null;

    const config = timelineDataAdapter.getTrackDisplayConfig(
      currentProject?.tracks.find(t => t.id === row.id)!
    );

    return (
      <div 
        className={`timeline-action flex items-center px-2 rounded border ${
          action.selected ? 'border-blue-500 bg-blue-100' : 'border-gray-300'
        }`}
        style={{
          backgroundColor: action.selected 
            ? `${config.color}40` 
            : `${config.color}20`,
          color: 'black',
          height: '90%',
          margin: '5% 0'
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">
            {effect.name}
          </div>
          <div className="text-xs text-gray-600 truncate">
            {TimelineDataAdapter.timeUtils.formatTime(
              TimelineDataAdapter.timeUtils.secondsToMs(action.end - action.start)
            )}
          </div>
        </div>
        
        {effect.source && effect.source.src && (
          <div className="w-8 h-8 ml-2 bg-gray-200 rounded overflow-hidden">
            <img 
              src={effect.source.src} 
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                // 处理图片加载失败
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  }, [effects, currentProject]);

  /**
   * 暴露给父组件的方法
   */
  React.useImperativeHandle(ref, () => ({
    // 获取 VideoClipService 实例
    getVideoClipService: () => videoClipServiceRef.current,
    
    // 获取时间轴集成器
    getTimelineIntegrator: () => timelineIntegratorRef.current,
    
    // 手动添加媒体文件
    addMediaFile: async (file: File, trackId?: string, fileType?: 'video' | 'audio' | 'image') => {
      if (!videoClipServiceRef.current) {
        throw new Error('VideoClipService 未初始化');
      }

      try {
        let result;
        const targetTrackId = trackId || `${fileType || 'default'}-track-1`;
        
        switch (fileType || file.type.split('/')[0]) {
          case 'video':
            result = await videoClipServiceRef.current.addVideoSpriteToTrack(file, targetTrackId);
            break;
          case 'audio':
            result = await videoClipServiceRef.current.addAudioSpriteToTrack(file, targetTrackId);
            break;
          case 'image':
            result = await videoClipServiceRef.current.addImageSpriteToTrack(file, targetTrackId);
            break;
          default:
            throw new Error('不支持的文件类型');
        }

        console.log('媒体文件添加成功:', result);
        return result;
      } catch (error) {
        console.error('添加媒体文件失败:', error);
        throw error;
      }
    },
    
    // 添加文字精灵
    addTextSprite: async (
      text: string,
      style?: any,
      trackId: string = 'text-track-1',
      duration: number = 5
    ) => {
      if (!videoClipServiceRef.current) {
        throw new Error('VideoClipService 未初始化');
      }

      try {
        const result = await videoClipServiceRef.current.addTextSpriteToTrack(
          text, 
          trackId, 
          style, 
          duration
        );
        
        console.log('文字精灵添加成功:', result);
        return result;
      } catch (error) {
        console.error('添加文字精灵失败:', error);
        throw error;
      }
    },
    
    // 播放控制
    togglePlayPause: handlePlaybackToggle,
    
    // 时间轴操作
    seekTo: (time: number) => {
      if (timelineIntegratorRef.current) {
        timelineIntegratorRef.current.seekTo(time);
      }
    },
    
    // 获取当前状态
    getCurrentTime: () => currentTime,
    getIsPlaying: () => isPlaying,
    getSelectedClips: () => selectedClips,
    
    // 时间轴引用
    getTimelineRef: () => timelineRef.current
  }), [handlePlaybackToggle, currentTime, isPlaying, selectedClips]);

  if (!currentProject) {
    return (
      <div className={`timeline-editor-wrapper ${className}`}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">没有加载项目</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`timeline-editor-wrapper ${className}`}>
      {/* 工具栏 */}
      {showToolbar && (
        <EnhancedTimelineToolbar
          onAddTrack={() => eventHandlerRef.current.handleRowAdd()}
          onSplitAtPlayhead={() => {
            const currentTimeSeconds = TimelineDataAdapter.timeUtils.msToSeconds(playhead);
            eventHandlerRef.current.handleSplitAtPlayhead(currentTimeSeconds);
          }}
          onDeleteSelected={() => eventHandlerRef.current.handleActionDelete(selectedClips)}
          onDuplicateSelected={() => eventHandlerRef.current.handleDuplicateSelected()}
          onUndo={() => console.log('撤销')}
          onRedo={() => console.log('重做')}
          onShowSettings={() => console.log('设置')}
        />
      )}

      {/* 时间轴编辑器 */}
      <div 
        className="timeline-editor-container"
        style={{ height: showToolbar ? height - 50 : height }}
      >
        <Timeline
          ref={timelineRef}
          editorData={editorData}
          effects={effects as any}
          {...timelineConfig}
          onChange={handleDataChange}
        />
      </div>

      {/* 状态栏 */}
      <div className="timeline-status-bar h-8 bg-muted/30 border-t border-border flex items-center px-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          {/* 播放控制按钮 */}
          <div className="flex items-center space-x-2">
            <button
              className={`px-2 py-1 rounded text-xs ${
                isPlaying ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
              }`}
              onClick={() => playbackControlRef.current?.togglePlayPause()}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className="px-2 py-1 rounded text-xs bg-gray-500 text-white"
              onClick={() => {
                useTimelineStore.getState().stop();
              }}
            >
              ⏹
            </button>
          </div>
          
          <span>时间: {TimelineDataAdapter.timeUtils.formatTime(
            TimelineDataAdapter.timeUtils.secondsToMs(currentTime)
          )}</span>
          <span>缩放: {Math.round(editorScale)}px/s</span>
          <span>网格: {snapToGrid ? '开启' : '关闭'}</span>
          <span>轨道: {editorData.length}</span>
          {selectedClips && selectedClips.length > 0 && (
            <span>已选择: {selectedClips.length} 个片段</span>
          )}
          <span>总时长: {TimelineDataAdapter.timeUtils.formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
});

// 显示名称用于调试
TimelineEditor.displayName = 'TimelineEditor';