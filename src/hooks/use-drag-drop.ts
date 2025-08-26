import { useCallback, useRef } from 'react';
import { useProjectStore, useTimelineStore } from '@/stores';
import { mediaProcessingService } from '@/services';
import { MediaFile, ClipType } from '@/types';

/**
 * 处理文件拖拽的自定义 Hook
 */
export function useDragAndDrop() {
  const { currentProject, addClip } = useProjectStore();
  const { pixelToTime } = useTimelineStore();
  
  const dragDataRef = useRef<{
    type: string;
    data: any;
  } | null>(null);

  // 开始拖拽媒体文件
  const startDragMediaFile = useCallback((file: MediaFile) => {
    dragDataRef.current = {
      type: 'media-file',
      data: file,
    };
  }, []);

  // 处理拖拽到时间轴
  const handleDropOnTimeline = useCallback(async (
    e: React.DragEvent,
    trackId: string,
    timelinePosition: { x: number; scale: number; scrollPosition: number }
  ) => {
    e.preventDefault();
    
    if (!currentProject) return;

    try {
      // 获取拖拽数据
      const dragDataStr = e.dataTransfer.getData('application/json');
      let dragData = dragDataRef.current;
      
      if (dragDataStr) {
        try {
          dragData = JSON.parse(dragDataStr);
        } catch (error) {
          console.error('Failed to parse drag data:', error);
          return;
        }
      }

      if (!dragData || dragData.type !== 'media-file') {
        return;
      }

      const mediaFile = dragData.data as MediaFile;
      
      // 计算放置时间
      const dropTime = timelinePosition.x / timelinePosition.scale + timelinePosition.scrollPosition;
      
      // 创建片段数据
      const clipData = {
        type: mediaFile.type as ClipType,
        startTime: Math.max(0, dropTime),
        duration: mediaFile.metadata.duration || 5000, // 默认5秒（图片）
        trimStart: 0,
        trimEnd: mediaFile.metadata.duration || 5000,
        source: {
          id: mediaFile.id,
          type: 'file' as const,
          url: mediaFile.url,
          name: mediaFile.name,
          size: mediaFile.size,
          metadata: mediaFile.metadata,
        },
        effects: [],
        transform: {
          x: 0,
          y: 0,
          width: mediaFile.metadata.width || 1920,
          height: mediaFile.metadata.height || 1080,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          anchorX: 0.5,
          anchorY: 0.5,
        },
        selected: false,
      };

      // 添加片段到轨道
      const clipId = addClip(trackId, clipData);
      
      console.log(`Added clip ${clipId} to track ${trackId} at time ${dropTime}ms`);
      
    } catch (error) {
      console.error('Failed to handle drop on timeline:', error);
    }
  }, [currentProject, addClip]);

  // 处理文件直接拖拽到时间轴（从系统）
  const handleFileDropOnTimeline = useCallback(async (
    e: React.DragEvent,
    trackId: string,
    timelinePosition: { x: number; scale: number; scrollPosition: number }
  ) => {
    e.preventDefault();
    
    if (!currentProject) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      // 处理文件
      const processedFiles = await mediaProcessingService.processMediaFiles(files);
      
      let currentTime = timelinePosition.x / timelinePosition.scale + timelinePosition.scrollPosition;
      
      // 为每个文件创建片段
      for (const mediaFile of processedFiles) {
        const clipData = {
          type: mediaFile.type as ClipType,
          startTime: Math.max(0, currentTime),
          duration: mediaFile.metadata.duration || 5000,
          trimStart: 0,
          trimEnd: mediaFile.metadata.duration || 5000,
          source: {
            id: mediaFile.id,
            type: 'file' as const,
            url: mediaFile.url,
            name: mediaFile.name,
            size: mediaFile.size,
            metadata: mediaFile.metadata,
          },
          effects: [],
          transform: {
            x: 0,
            y: 0,
            width: mediaFile.metadata.width || 1920,
            height: mediaFile.metadata.height || 1080,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            anchorX: 0.5,
            anchorY: 0.5,
          },
          selected: false,
        };

        const clipId = addClip(trackId, clipData);
        console.log(`Added file clip ${clipId} to track ${trackId}`);
        
        // 下一个文件放在当前文件之后
        currentTime += mediaFile.metadata.duration || 5000;
      }
      
    } catch (error) {
      console.error('Failed to handle file drop:', error);
    }
  }, [currentProject, addClip]);

  // 检查拖拽是否有效
  const isDragValid = useCallback((e: React.DragEvent): boolean => {
    const hasFiles = e.dataTransfer.files.length > 0;
    const hasMediaData = e.dataTransfer.types.includes('application/json');
    
    return hasFiles || hasMediaData;
  }, []);

  // 清理拖拽数据
  const clearDragData = useCallback(() => {
    dragDataRef.current = null;
  }, []);

  return {
    startDragMediaFile,
    handleDropOnTimeline,
    handleFileDropOnTimeline,
    isDragValid,
    clearDragData,
  };
}