'use client';

import React, { useState, useCallback } from 'react';
import { Track } from '@/types';
import { ClipItem } from './clip-item';
import { useDragAndDrop } from '@/hooks/use-drag-drop';
import { cn } from '@/lib/utils';

interface TrackContentProps {
  track: Track;
  height: number;
  scale: number;
  scrollPosition: number;
  isLast?: boolean;
}

/**
 * 轨道内容组件
 */
export function TrackContent({ 
  track, 
  height, 
  scale, 
  scrollPosition,
  isLast = false 
}: TrackContentProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { handleDropOnTimeline, handleFileDropOnTimeline, isDragValid } = useDragAndDrop();

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isDragValid(e)) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, [isDragValid]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const timelinePosition = {
      x,
      scale,
      scrollPosition,
    };

    // 检查是否是文件拖拽还是媒体项拖拽
    if (e.dataTransfer.files.length > 0) {
      handleFileDropOnTimeline(e, track.id, timelinePosition);
    } else {
      handleDropOnTimeline(e, track.id, timelinePosition);
    }
  }, [track.id, scale, scrollPosition, handleDropOnTimeline, handleFileDropOnTimeline]);
  return (
    <div
      className={cn(
        "timeline-track relative",
        !isLast && "border-b border-border",
        !track.isVisible && "opacity-50",
        track.isLocked && "pointer-events-none",
        isDragOver && "bg-primary/10 border-primary border-2 border-dashed"
      )}
      style={{ height }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 轨道背景 */}
      <div className="absolute inset-0 bg-timeline-track" />

      {/* 片段列表 */}
      {track.clips.map((clip) => (
        <ClipItem
          key={clip.id}
          clip={clip}
          track={track}
          scale={scale}
          scrollPosition={scrollPosition}
          trackHeight={height}
        />
      ))}

      {/* 拖拽放置指示器 */}
      {isDragOver && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-primary/20 text-primary px-3 py-1 rounded-md text-sm font-medium">
            放置到 {track.name}
          </div>
        </div>
      )}
    </div>
  );
}