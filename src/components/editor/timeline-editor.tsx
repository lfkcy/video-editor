"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Timeline,
  TimelineAction,
  TimelineEffect,
  TimelineRow,
} from "@xzdarcy/react-timeline-editor";
import { useProjectStore, useTimelineStore } from "@/stores";
import { EnhancedTimelineToolbar } from "./enhanced-timeline-toolbar";
import {
  videoClipService,
  VideoClipService,
} from "@/services/video-clip-service";

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
export const TimelineEditor = React.forwardRef<any, TimelineEditorProps>(
  (
    {
      height = 400,
      showToolbar = true,
      className = "",
      onTimelineChange,
      onTimeChange,
      onSelectionChange,
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
      gridSize,
    } = useTimelineStore();

    // 本地状态
    const [editorData, setEditorData] = useState<TimelineRow[]>([]);
    const [effects, setEffects] = useState<Record<string, TimelineEffect>>({});
    const [currentTime, setCurrentTime] = useState(0);
    const [editorScale, setEditorScale] = useState(100); // 像素/秒

    // refs
    const timelineRef = useRef<any>(null);
    const videoClipServiceRef = useRef<VideoClipService>();

    /**
     * 处理时间轴数据变更
     */
    const handleDataChange = (data: TimelineRow[]) => {
      setEditorData(data);

      if (onTimelineChange) {
        onTimelineChange(data);
      }
    };

    /**
     * 点击时间轴
     * @param time 时间
     */
    const handleClickTimeArea = (time: number) => {
      console.log("点击时间轴:", time);
    };

    /**
     * 处理时间变更
     */
    const handleTimeChange = useCallback(
      (time: number) => {
        setCurrentTime(time);

        if (onTimeChange) {
          onTimeChange(time);
        }
      },
      [onTimeChange]
    );

    /**
     * 处理选择变更
     */
    const handleSelectionChange = useCallback(
      (actionIds: string[]) => {
        if (onSelectionChange) {
          onSelectionChange(actionIds);
        }
      },
      [onSelectionChange]
    );

    /**
     * 处理 Action 变更
     */
    const handleActionChange = useCallback(
      (action: TimelineAction, rowId: string) => {
        console.log("处理 Action 变更:", action, rowId);
      },
      []
    );

    /**
     * 处理轨道变更
     */
    const handleRowChange = useCallback((row: TimelineRow) => {
      console.log("处理轨道变更:", row);
    }, []);

    /**
     * 处理缩放变更
     */
    const handleScaleChange = useCallback((newScale: number) => {
      setEditorScale(newScale);
      console.log("处理缩放变更:", newScale);
    }, []);

    /**
     * 处理播放控制
     */
    const handlePlaybackToggle = useCallback(() => {
      console.log("处理播放控制:", isPlaying);
    }, [isPlaying]);

    /**
     * 初始化组件
     */
    useEffect(() => {
      // 创建 VideoClipService
      if (!videoClipServiceRef.current) {
        videoClipServiceRef.current = videoClipService;
      }

      return () => {
        if (videoClipServiceRef.current) {
          videoClipServiceRef.current.destroy();
        }
      };
    }, []);

    /**
     * 监听 stores 变化
     */
    useEffect(() => {
      console.log("currentProject", currentProject);
    }, [currentProject]);

    /**
     * 计算时间轴配置
     */
    const timelineConfig = {
      // 基础配置
      scale: editorScale,
      scaleWidth: 160,
      scaleSplitCount: 10,

      // 时间轴高度
      startLeft: 100, // 轨道头部宽度

      // 自动滚动
      autoScroll: true,

      // 网格配置
      gridSnap: snapToGrid,

      // 播放配置
      currentTime: currentTime,

      // 样式配置
      className: "timeline-editor-container",

      // 拖拽配置
      dragLine: true,

      // 快捷键
      keyboardShortcuts: true,
    };

    /**
     * 暴露给父组件的方法
     */
    React.useImperativeHandle(
      ref,
      () => ({
        // 获取 VideoClipService 实例
        getVideoClipService: () => videoClipServiceRef.current,

        // 手动添加媒体文件
        addMediaFile: async (
          file: File,
          trackId?: string,
          fileType?: "video" | "audio" | "image",
          options?: {
            startTime?: number;
            endTime?: number;
            duration?: number;
            effectId?: string;
            effectOptions?: Record<string, any>;
          }
        ) => {
          if (!videoClipServiceRef.current) {
            throw new Error("VideoClipService 未初始化");
          }

          try {
            let result;
            const targetTrackId = trackId || `${fileType || "default"}-track-1`;

            switch (fileType || file.type.split("/")[0]) {
              case "video":
                let startTime = options?.startTime || 0;

                result =
                  await videoClipServiceRef.current.addVideoSpriteToTrack(
                    file,
                    targetTrackId,
                    true,
                    startTime
                  );
                break;
              case "audio":
                result =
                  await videoClipServiceRef.current.addAudioSpriteToTrack(
                    file,
                    targetTrackId
                  );
                break;
              case "image":
                result =
                  await videoClipServiceRef.current.addImageSpriteToTrack(
                    file,
                    targetTrackId
                  );
                break;
              default:
                throw new Error("不支持的文件类型");
            }

            console.log("媒体文件添加成功:", result);
            return result;
          } catch (error) {
            console.error("添加媒体文件失败:", error);
            throw error;
          }
        },

        // 添加文字精灵
        addTextSprite: async (
          text: string,
          style?: any,
          trackId: string = "text-track-1",
          duration: number = 5
        ) => {
          if (!videoClipServiceRef.current) {
            throw new Error("VideoClipService 未初始化");
          }

          try {
            const result =
              await videoClipServiceRef.current.addTextSpriteToTrack(
                text,
                trackId,
                style,
                duration
              );

            console.log("文字精灵添加成功:", result);
            return result;
          } catch (error) {
            console.error("添加文字精灵失败:", error);
            throw error;
          }
        },

        // 播放控制
        togglePlayPause: handlePlaybackToggle,

        // 时间轴操作
        seekTo: (time: number) => {
          console.log("seekTo", time);
        },

        // 获取当前状态
        getCurrentTime: () => currentTime,
        getIsPlaying: () => isPlaying,
        getSelectedClips: () => selectedClips,

        // 时间轴引用
        getTimelineRef: () => timelineRef.current,
      }),
      [handlePlaybackToggle, currentTime, isPlaying, selectedClips]
    );

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
            onAddTrack={() => console.log("添加轨道")}
            onSplitAtPlayhead={() => {
              console.log("onSplitAtPlayhead");
            }}
            onDeleteSelected={() => console.log("删除选中")}
            onDuplicateSelected={() => console.log("复制选中")}
            onUndo={() => console.log("撤销")}
            onRedo={() => console.log("重做")}
            onShowSettings={() => console.log("设置")}
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
            style={{ width: "100%", height: "100%" }}
            {...timelineConfig}
            onChange={handleDataChange}
            onClickTimeArea={(time) => {
              handleTimeChange(time);
              return true;
            }}
            onCursorDragEnd={(time) => {
              handleTimeChange(time);
              return true;
            }}
          />
        </div>
      </div>
    );
  }
);

// 显示名称用于调试
TimelineEditor.displayName = "TimelineEditor";
