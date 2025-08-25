'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Clip, Track } from '@/types';
import { useTimelineStore } from '@/stores';
import { useTimelineInteraction } from '@/hooks/use-timeline-interaction';
import { timeToPixel, formatTime, cn } from '@/lib/utils';

interface ClipItemProps {
  clip: Clip;
  track: Track;
  scale: number;
  scrollPosition: number;
  trackHeight: number;
}

/**
 * 片段项组件
 */
export function ClipItem({ 
  clip, 
  track, 
  scale, 
  scrollPosition, 
  trackHeight 
}: ClipItemProps) {
  const { selectedClips, selectClip, clearSelection } = useTimelineStore();
  const {
    isDragging,
    dragOperation,
    startClipDrag,
    updateClipDrag,
    endClipDrag,
    splitClipAt,
    deleteSelectedClips,
  } = useTimelineInteraction();
  
  const [isHovered, setIsHovered] = useState(false);
  const [localDragging, setLocalDragging] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'start' | 'end' | null>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const isSelected = selectedClips.includes(clip.id);

  // 计算片段位置和大小
  const clipX = timeToPixel(clip.startTime, scale, scrollPosition);
  const clipWidth = clip.duration * scale;

  // 处理片段选择
  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    const multiSelect = e.ctrlKey || e.metaKey;
    
    if (multiSelect) {
      selectClip(clip.id, true);
    } else {
      if (!isSelected) {
        clearSelection();
        selectClip(clip.id);
      }
    }
  }, [clip.id, isSelected, selectClip, clearSelection]);

  // 处理双击分割
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!clipRef.current) return;
    
    const rect = clipRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const timeInClip = (clickX / clipRef.current.offsetWidth) * clip.duration;
    const splitTime = clip.startTime + timeInClip;
    
    splitClipAt(clip.id, splitTime);
  }, [clip.id, clip.startTime, clip.duration, splitClipAt]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // 只处理左键
    
    e.preventDefault();
    e.stopPropagation();
    
    const multiSelect = e.ctrlKey || e.metaKey;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    setLocalDragging(true);
    startClipDrag(clip.id, 'move', { x: e.clientX, y: e.clientY }, multiSelect);
  }, [clip.id, startClipDrag]);

  // 处理调整大小开始
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizeDirection(direction);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    const operation = direction === 'start' ? 'trim-start' : 'trim-end';
    startClipDrag(clip.id, operation, { x: e.clientX, y: e.clientY });
  }, [clip.id, startClipDrag]);

  // 全局鼠标移动和释放事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!localDragging && !resizeDirection) return;
      
      updateClipDrag({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (localDragging || resizeDirection) {
        setLocalDragging(false);
        setResizeDirection(null);
        endClipDrag();
        dragStartRef.current = null;
      }
    };

    if (localDragging || resizeDirection) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = resizeDirection ? 'col-resize' : 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [localDragging, resizeDirection, updateClipDrag, endClipDrag]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      
      switch (e.code) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          deleteSelectedClips();
          break;
      }
    };

    if (isSelected) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelected, deleteSelectedClips]);

  // 获取片段颜色
  const getClipColor = () => {
    switch (clip.type) {
      case 'video':
        return 'bg-blue-600';
      case 'audio':
        return 'bg-green-600';
      case 'image':
        return 'bg-purple-600';
      case 'text':
        return 'bg-orange-600';
      default:
        return 'bg-gray-600';
    }
  };

  // 获取片段图标
  const getClipIcon = () => {
    switch (clip.type) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'image':
        return '🖼️';
      case 'text':
        return '📝';
      default:
        return '📄';
    }
  };

  // 如果片段不在可视区域内，不渲染
  if (clipX + clipWidth < 0 || clipX > 1200) {
    return null;
  }

  return (
    <div
      ref={clipRef}
      className={cn(
        "timeline-clip absolute top-1 bottom-1 rounded border-2 transition-all duration-200 select-none",
        getClipColor(),
        isSelected ? "border-timeline-selected shadow-lg z-10" : "border-transparent",
        (localDragging || isDragging) && "cursor-grabbing scale-105 z-20",
        resizeDirection && "cursor-col-resize",
        isHovered && "shadow-md"
      )}
      style={{
        left: Math.max(0, clipX),
        width: Math.max(20, clipWidth),
      }}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${clip.source.name} (${formatTime(clip.duration)})`}
    >
      {/* 片段内容 */}
      <div className="relative h-full flex items-center px-2 text-white text-sm overflow-hidden">
        {/* 片段图标 */}
        <span className="mr-1 text-xs">{getClipIcon()}</span>
        
        {/* 片段名称 */}
        <span className="truncate font-medium">
          {clip.source.name}
        </span>
        
        {/* 片段时长 */}
        {clipWidth > 80 && (
          <span className="ml-auto text-xs opacity-80">
            {formatTime(clip.duration)}
          </span>
        )}
      </div>

      {/* 缩略图（如果是视频或图片） */}
      {(clip.type === 'video' || clip.type === 'image') && clip.source.metadata?.thumbnail && (
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center rounded"
          style={{ 
            backgroundImage: `url(${clip.source.metadata.thumbnail})`,
          }}
        />
      )}

      {/* 音频波形（如果是音频） */}
      {clip.type === 'audio' && (
        <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-50">
          {/* 这里可以渲染音频波形 */}
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent" />
        </div>
      )}

      {/* 调整大小手柄 */}
      {isSelected && !track.isLocked && (
        <>
          {/* 左侧调整手柄 */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize bg-timeline-selected opacity-0 hover:opacity-100 transition-opacity z-30"
            onMouseDown={(e) => handleResizeStart(e, 'start')}
            title="调整开始时间"
          />
          
          {/* 右侧调整手柄 */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-timeline-selected opacity-0 hover:opacity-100 transition-opacity z-30"
            onMouseDown={(e) => handleResizeStart(e, 'end')}
            title="调整结束时间"
          />
        </>
      )}

      {/* 效果指示器 */}
      {clip.effects.length > 0 && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />
      )}
    </div>
  );
}