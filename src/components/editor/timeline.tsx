'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProjectStore, useTimelineStore } from '@/stores';
import { TimeRuler } from './timeline/time-ruler';
import { TrackHeader } from './timeline/track-header';
import { TrackContent } from './timeline/track-content';
import { PlayheadIndicator } from './timeline/playhead-indicator';
import { TimelineToolbar } from './timeline/timeline-toolbar';
import { useTimelineInteraction } from '@/hooks/use-timeline-interaction';
import { timeToPixel, pixelToTime } from '@/utils/timeline-utils';

/**
 * 时间轴主组件
 */
export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const { currentProject } = useProjectStore();
  const {
    playhead,
    duration,
    scale,
    scrollPosition,
    setPlayhead,
    setScrollPosition,
    setScale,
    snapToGrid,
    gridSize,
  } = useTimelineStore();

  // 本地状态
  const [isDragging, setIsDragging] = useState(false);
  const {
    splitAtPlayhead,
    deleteSelectedClips,
    duplicateSelectedClips,
    selectAllClips,
    clearSelection,
    selectedClips,
  } = useTimelineInteraction();

  // 常量
  const trackHeaderWidth = 200;

  // 计算时间轴宽度
  const timelineWidth = Math.max(1000, duration * scale + 1000);

  // 处理播放头点击
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;

    // 使用 setTimeout 避免在渲染阶段更新状态
    setTimeout(() => {
      if (!scrollContainerRef.current) return;
      
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = pixelToTime(clickX, scale, scrollPosition);
      
      // 网格对齐
      if (snapToGrid) {
        const snappedTime = Math.round(newTime / gridSize) * gridSize;
        setPlayhead(Math.max(0, Math.min(snappedTime, duration)));
      } else {
        setPlayhead(Math.max(0, Math.min(newTime, duration)));
      }
    }, 0);
  }, [scale, scrollPosition, snapToGrid, gridSize, duration, setPlayhead]);

  // 处理水平滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollPosition = e.currentTarget.scrollLeft;
    setScrollPosition(newScrollPosition);
  }, [setScrollPosition]);

  // 处理缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(10, scale * scaleFactor));
      
      // 基于鼠标位置进行缩放
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const timeAtMouse = pixelToTime(mouseX, scale, scrollPosition);
        
        setScale(newScale);
        
        // 调整滚动位置以保持鼠标下的时间不变
        const newPixelAtMouse = timeToPixel(timeAtMouse, newScale);
        const newScrollPosition = newPixelAtMouse - mouseX;
        setScrollPosition(Math.max(0, newScrollPosition));
      }
    }
  }, [scale, scrollPosition, setScale, setScrollPosition]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case 'Equal': // +
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale(Math.min(10, scale * 1.2));
          }
          break;
        case 'Minus': // -
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setScale(Math.max(0.1, scale / 1.2));
          }
          break;
        case 'Digit0': // 0
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // 缩放到合适大小
            if (duration > 0) {
              const containerWidth = scrollContainerRef.current?.clientWidth || 1000;
              const newScale = (containerWidth - 100) / duration;
              setScale(newScale);
              setScrollPosition(0);
            }
          }
          break;
        case 'KeyS': // S - 分割
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            splitAtPlayhead();
          }
          break;
        case 'KeyA': // Ctrl+A - 全选
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selectAllClips();
          }
          break;
        case 'KeyD': // Ctrl+D - 复制
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            duplicateSelectedClips();
          }
          break;
        case 'Delete': // Delete - 删除
        case 'Backspace':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            deleteSelectedClips();
          }
          break;
        case 'Escape': // Esc - 取消选择
          e.preventDefault();
          clearSelection();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale, duration, setScale, setScrollPosition, splitAtPlayhead, selectAllClips, duplicateSelectedClips, deleteSelectedClips, clearSelection]);

  if (!currentProject) {
    return (
      <div className="timeline-container h-full flex items-center justify-center">
        <p className="text-muted-foreground">没有加载项目</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="timeline-container h-full flex flex-col bg-timeline-background"
    >
      {/* 时间轴工具栏 */}
      <TimelineToolbar />
      {/* 时间轴头部 */}
      <div className="flex border-b border-border">
        {/* 轨道头部占位 */}
        <div 
          className="bg-card border-r border-border flex items-center justify-center"
          style={{ width: trackHeaderWidth }}
        >
          <span className="text-sm font-medium">轨道</span>
        </div>
        
        {/* 时间标尺 */}
        <div className="flex-1 overflow-hidden">
          <TimeRuler
            duration={duration}
            scale={scale}
            scrollPosition={scrollPosition}
            onTimelineClick={handleTimelineClick}
          />
        </div>
      </div>

      {/* 轨道区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 轨道头部列表 */}
        <div 
          className="bg-card border-r border-border overflow-y-auto custom-scrollbar"
          style={{ width: trackHeaderWidth }}
        >
          {currentProject.tracks.map((track) => (
            <TrackHeader
              key={track.id}
              track={track}
              height={track.height}
            />
          ))}
        </div>

        {/* 轨道内容区域 */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto custom-scrollbar relative"
          onScroll={handleScroll}
          onWheel={handleWheel}
          onClick={handleTimelineClick}
        >
          {/* 网格背景 */}
          {snapToGrid && (
            <div 
              className="absolute inset-0 timeline-grid pointer-events-none"
              style={{
                backgroundSize: `${gridSize * scale}px 100%`,
                width: timelineWidth,
              }}
            />
          )}

          {/* 轨道内容 */}
          <div style={{ width: timelineWidth }}>
            {currentProject.tracks.map((track, index) => (
              <TrackContent
                key={track.id}
                track={track}
                height={track.height}
                scale={scale}
                scrollPosition={scrollPosition}
                isLast={index === currentProject.tracks.length - 1}
              />
            ))}
          </div>

          {/* 播放头指示器 */}
          <PlayheadIndicator
            playhead={playhead}
            scale={scale}
            scrollPosition={scrollPosition}
            height={currentProject.tracks.reduce((total, track) => total + track.height, 0)}
          />
        </div>
      </div>

      {/* 时间轴工具栏 */}
      <div className="h-8 bg-muted/30 border-t border-border flex items-center px-4 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>缩放: {Math.round(scale * 100)}%</span>
          <span>网格: {snapToGrid ? '开启' : '关闭'}</span>
          <span>轨道: {currentProject.tracks.length}</span>
          {selectedClips && selectedClips.length > 0 && (
            <span>已选择: {selectedClips.length} 个片段</span>
          )}
        </div>
      </div>
    </div>
  );
}