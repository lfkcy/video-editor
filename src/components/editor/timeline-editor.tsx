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
import { generateId } from "@/lib/utils";
import { useVideoEditor } from "@/hooks/useVideoEditor";
import { useActionSpriteManager } from "@/hooks/useActionSpriteManager";
/**
 * TimelineEditor 组件属性
 */
interface TimelineEditorProps {
  height?: number;
  showToolbar?: boolean;
  className?: string;
  onTimelineChange?: (data: TimelineRow[]) => void;
  onOffsetChange?: (action: TimelineAction) => void;
  onDurationChange?: ({
    action,
    start,
    end,
  }: {
    action: TimelineAction;
    start: number;
    end: number;
  }) => void;
  onSplitAction?: (action: TimelineAction, splitTime: number) => void;
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
      onOffsetChange,
      onDurationChange,
      onSplitAction,
      onTimeChange,
      onSelectionChange,
    },
    ref
  ) => {
    const { ...videoEditorApi } = useVideoEditor();
    const { ...actionSpriteManagerApi } = useActionSpriteManager();

    // 状态管理
    const currentProject = useProjectStore((state) => state.currentProject);
    const editorData = useProjectStore((state) => state.editorData);
    const updateEditorData = useProjectStore((state) => state.uodateEditorData);
    const activeAction = useProjectStore((state) => state.activeAction);
    const updateActiveAction = useProjectStore(
      (state) => state.updateActiveAction
    );

    const {
      playhead,
      duration,
      scale,
      isPlaying,
      selectedClips,
      snapToGrid,
      gridSize,
      currentTime,
      setCurrentTime,
    } = useTimelineStore();

    // 本地状态
    const [effects, setEffects] = useState<Record<string, TimelineEffect>>({});
    const [editorScale, setEditorScale] = useState(50); // 像素/秒

    // refs
    const timelineRef = useRef<any>(null);

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
     * 处理时长变更
     */
    const handleDurationChange = useCallback(
      ({
        action,
        start,
        end,
      }: {
        action: TimelineAction;
        start: number;
        end: number;
      }) => {
        if (onDurationChange) {
          onDurationChange({ action, start, end });
        }
        console.log("处理时长变更:", action, start, end);
      },
      []
    );

    /**
     * 处理偏移变更
     */
    const handleOffsetChange = (action: TimelineAction) => {
      console.log("处理偏移变更:", action);
    };

    /**
     * 处理选择变更
     */
    const handleSelectionChange = (actionIds: string[]) => {
      if (onSelectionChange) {
        onSelectionChange(actionIds);
      }
    };

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
          if (!videoEditorApi.isInitialized) {
            throw new Error("VideoEditor 未初始化");
          }

          try {
            let result;
            const targetTrackId = trackId || `${fileType || "default"}-track-1`;

            console.log(editorData, "editorData");

            switch (fileType || file.type.split("/")[0]) {
              case "video":
                let startTime = options?.startTime || 0;

                updateEditorData(
                  editorData.map((data) => {
                    if (data.id === targetTrackId) {
                      data.actions.push({
                        id: generateId(),
                        start: startTime,
                        end: startTime + (options?.duration || 10),
                        effectId: options?.effectId || "",
                      });
                    }
                    return data;
                  })
                );

                result = await videoEditorApi.addVideoSprite(
                  file,
                  startTime,
                  options?.duration || 10
                );
                break;
              case "audio":
                result = await videoEditorApi.addAudioSprite(file);
                break;
              case "image":
                result = await videoEditorApi.addImageSprite(file);
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
          if (!videoEditorApi.isInitialized) {
            throw new Error("VideoEditor 未初始化");
          }

          try {
            const result = await videoEditorApi.addTextSprite(text, style);

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
            onChange={(data) => {
              console.log("时间轴数据变化:", data);
            }}
            onClickTimeArea={(time) => {
              handleTimeChange(time);
              return true;
            }}
            onCursorDragEnd={(time) => {
              handleTimeChange(time);
            }}
            onActionResizing={({ dir, action, start, end }) => {
              if (dir === "left") return false;
              handleDurationChange({ action, start, end });
            }}
            onActionMoveEnd={({ action }) => {
              handleOffsetChange(action);
            }}
            onClickAction={(_, { action }) => {
              updateActiveAction(action);
            }}
            // getActionRender={(action: TimelineAction) => {
            //   const baseStyle =
            //     "h-full justify-center items-center flex text-white";
            //   if (action.id === activeAction?.id) {
            //     return (
            //       <div
            //         className={`${baseStyle} border border-red-300 border-solid box-border`}
            //       >
            //         {action.id}
            //       </div>
            //     );
            //   }
            //   return <div className={baseStyle}>{action.id}</div>;
            // }}
          />
        </div>
      </div>
    );
  }
);

// 显示名称用于调试
TimelineEditor.displayName = "TimelineEditor";
