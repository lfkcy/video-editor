'use client';

import React, { useEffect, useRef } from 'react';
import { useProjectStore, useTimelineStore, useUIStore } from '@/stores';
import { VideoPreview } from './video-preview';
import { Timeline } from './timeline';
import { PlayerControls } from './player-controls';
import { MediaLibrary } from '../panels/media-library';
import { PropertyPanel } from '../panels/property-panel';
import { ExportDialog } from '../export/export-dialog';
import { ShortcutHelp } from '../ui/shortcut-help';
import { ResponsiveLayoutManager } from '../ui/responsive-layout-manager';
import { StatusFeedback } from '../ui/status-feedback';
import { ErrorBoundary } from '../error/error-boundary';
import { performanceMonitor } from '@/utils/performance-monitor';
import { cn } from '@/lib/utils';

/**
 * 主视频编辑器组件
 */
export function VideoEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const { currentProject, createNewProject } = useProjectStore();
  const { layout, theme } = useUIStore();
  const { setDuration } = useTimelineStore();

  // 初始化编辑器
  useEffect(() => {
    if (!currentProject) {
      createNewProject();
    }

    // 初始化性能监控
    const endTiming = performanceMonitor.startTiming('editorInitialization');
    
    return () => {
      endTiming();
    };
  }, [currentProject, createNewProject]);

  // 更新时间轴总时长
  useEffect(() => {
    if (currentProject) {
      const totalDuration = currentProject.tracks.reduce((max, track) => {
        const trackEnd = track.clips.reduce((trackMax, clip) => {
          return Math.max(trackMax, clip.startTime + clip.duration);
        }, 0);
        return Math.max(max, trackEnd);
      }, 0);
      setDuration(totalDuration);
    }
  }, [currentProject, setDuration]);

  if (!currentProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">初始化编辑器...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      console.error('Video Editor Error:', error, errorInfo);
      performanceMonitor.measureCustomMetric('errorCount', 1);
    }}>
      <div
        ref={containerRef}
        className={cn(
          "video-editor flex flex-col h-screen overflow-hidden",
          theme === 'dark' ? 'dark' : ''
        )}
      >
      {/* 头部工具栏 */}
      <header className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">{currentProject.name}</h1>
          <div className="text-sm text-muted-foreground">
            {currentProject.settings.width} × {currentProject.settings.height} • {currentProject.settings.fps}fps
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <ResponsiveLayoutManager />
          <div className="h-4 w-px bg-border" />
          <ShortcutHelp />
          <ExportDialog />
        </div>
      </header>

      {/* 主工作区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板 - 媒体库 */}
        {layout.showLeftPanel && (
          <aside className="w-80 border-r bg-card flex flex-col">
            <MediaLibrary />
          </aside>
        )}

        {/* 中央区域 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 视频预览区 */}
          <div className="flex-1 p-4 bg-muted/20">
            <VideoPreview />
          </div>

          {/* 时间轴区域 */}
          {layout.showBottomPanel && (
            <div className="border-t bg-background">
              {/* 播放器控制 */}
              <PlayerControls />
              
              {/* 时间轴 */}
              <div className="h-80">
                <Timeline />
              </div>
            </div>
          )}
        </main>

        {/* 右侧面板 - 属性面板 */}
        {layout.showRightPanel && (
          <aside className="w-80 border-l bg-card flex flex-col">
            <PropertyPanel />
          </aside>
        )}
      </div>

      {/* 状态栏 */}
      <footer className="h-8 px-4 bg-muted/30 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>项目: {currentProject.name}</span>
          <span>轨道: {currentProject.tracks.length}</span>
        </div>
        <div className="flex items-center space-x-4">
          <StatusFeedback />
        </div>
      </footer>
      </div>
    </ErrorBoundary>
  );
}