'use client';

import React, { useCallback } from 'react';
import { MediaFile } from '@/types';
import { formatFileSize, formatTime, cn } from '@/lib/utils';

interface MediaItemProps {
  file: MediaFile;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
}

/**
 * 媒体项组件
 */
export function MediaItem({ file, viewMode, isSelected, onSelect }: MediaItemProps) {
  
  const handleClick = useCallback((e: React.MouseEvent) => {
    const multiSelect = e.ctrlKey || e.metaKey;
    onSelect(multiSelect);
  }, [onSelect]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    // 设置拖拽数据
    const dragData = {
      type: 'media-file',
      file: file,
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
    
    // 设置拖拽的视觉反馈
    const element = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(
      element,
      element.offsetWidth / 2,
      element.offsetHeight / 2
    );
  }, [file]);

  const getFileIcon = () => {
    switch (file.type) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'image':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const getTypeColor = () => {
    switch (file.type) {
      case 'video':
        return 'text-blue-500';
      case 'audio':
        return 'text-green-500';
      case 'image':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          "relative bg-card border border-border rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
      >
        {/* 缩略图 */}
        <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
          {file.thumbnailUrl ? (
            <img
              src={file.thumbnailUrl}
              alt={file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={cn("text-2xl", getTypeColor())}>
              {getFileIcon()}
            </div>
          )}
          
          {/* 时长显示（视频和音频） */}
          {(file.type === 'video' || file.type === 'audio') && file.metadata.duration && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
              {formatTime(file.metadata.duration)}
            </div>
          )}
          
          {/* 尺寸显示（图片和视频） */}
          {(file.type === 'image' || file.type === 'video') && 
           file.metadata.width && file.metadata.height && (
            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
              {file.metadata.width}×{file.metadata.height}
            </div>
          )}
        </div>

        {/* 文件信息 */}
        <div className="p-2">
          <div className="text-sm font-medium truncate mb-1" title={file.name}>
            {file.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </div>
        </div>

        {/* 选中指示器 */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>
    );
  }

  // 列表视图
  return (
    <div
      className={cn(
        "flex items-center p-3 bg-card border border-border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
    >
      {/* 缩略图或图标 */}
      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 mr-3 overflow-hidden">
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className={cn("text-lg", getTypeColor())}>
            {getFileIcon()}
          </div>
        )}
      </div>

      {/* 文件信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate mb-1" title={file.name}>
          {file.name}
        </div>
        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
          <span>{formatFileSize(file.size)}</span>
          
          {file.metadata.duration && (
            <span>{formatTime(file.metadata.duration)}</span>
          )}
          
          {file.metadata.width && file.metadata.height && (
            <span>{file.metadata.width}×{file.metadata.height}</span>
          )}
          
          <span className={cn("capitalize", getTypeColor())}>
            {file.type}
          </span>
        </div>
      </div>

      {/* 选中指示器 */}
      {isSelected && (
        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
}