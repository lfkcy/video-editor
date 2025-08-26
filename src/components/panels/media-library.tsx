"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useContext,
  createContext,
} from "react";
import {
  Upload,
  Search,
  Grid,
  List,
  Filter,
  Play,
  Plus,
  MoreVertical,
} from "lucide-react";
import { MediaFile } from "@/types";
import { mediaProcessingService, MediaProcessingService } from "@/services";
import {
  isSupportedFormat,
  getFileType,
  videoClipService,
} from "@/services/video-clip-service";
import { Button } from "@/components/ui/button";
import { MediaItem } from "./media-item";
import { cn, formatFileSize } from "@/lib/utils";
import { useProjectStore } from "@/stores";

/**
 * 时间轴编辑器上下文
 * 用于与父级 TimelineEditor 组件通信
 */
interface TimelineEditorContextType {
  addMediaFile?: (
    file: File,
    trackId?: string,
    fileType?: "video" | "audio" | "image"
  ) => Promise<any>;
  addTextSprite?: (
    text: string,
    style?: any,
    trackId?: string,
    duration?: number
  ) => Promise<any>;
}

const TimelineEditorContext = createContext<TimelineEditorContextType>({});

/**
 * 增强的媒体库面板组件
 * 集成 VideoClipService，支持直接添加到时间轴
 */
export function MediaLibrary() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineContext = useContext(TimelineEditorContext);
  const { currentProject } = useProjectStore();

  // 本地状态
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchText, setSearchText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragToTimeline, setDragToTimeline] = useState(false);

  // 过滤状态
  const [filterType, setFilterType] = useState<
    "all" | "video" | "audio" | "image"
  >("all");

  // 文件上传处理（增强版）
  const handleFileSelect = useCallback(
    async (files: FileList, addToTimeline = false) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const fileArray = Array.from(files);

        // 验证文件（使用新的验证方法）
        const validFiles = fileArray.filter((file) => {
          const isSupported = isSupportedFormat(file);
          if (!isSupported) {
            console.warn(`文件 ${file.name} 被拒绝: 不支持的格式`);
          }
          return isSupported;
        });

        if (validFiles.length === 0) {
          alert("没有有效的文件可以上传");
          return;
        }

        let processedFiles: MediaFile[] = [];

        if (addToTimeline && timelineContext.addMediaFile) {
          // 直接添加到时间轴
          for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const fileType = getFileType(file);

            try {
              // 只添加支持的文件类型到时间轴
              if (fileType !== "unknown") {
                const result = await timelineContext.addMediaFile(
                  file,
                  undefined,
                  fileType as "video" | "audio" | "image"
                );
                console.log("文件添加到时间轴成功:", result);
              } else {
                console.warn(`不支持的文件类型: ${file.type}`);
              }

              // 同时添加到媒体库
              const mediaFile = await mediaProcessingService.processMediaFile(
                file
              );
              processedFiles.push(mediaFile);
            } catch (error) {
              console.error(`添加文件 ${file.name} 到时间轴失败:`, error);
              // 即使添加到时间轴失败，也要添加到媒体库
              const mediaFile = await mediaProcessingService.processMediaFile(
                file
              );
              processedFiles.push(mediaFile);
            }

            // 更新进度
            setUploadProgress(Math.round(((i + 1) / validFiles.length) * 100));
          }
        } else {
          // 仅添加到媒体库
          processedFiles = await mediaProcessingService.processMediaFiles(
            validFiles
          );
          setUploadProgress(100);
        }

        // 添加到媒体库
        setMediaFiles((prev) => [...prev, ...processedFiles]);

        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);
      } catch (error) {
        console.error("文件上传失败:", error);
        alert("文件上传失败");
      } finally {
        setIsUploading(false);
      }
    },
    [timelineContext]
  );

  // 点击上传按钮
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 文件输入变化
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files, dragToTimeline);
      }
      // 清空输入框以允许重新选择相同文件
      e.target.value = "";
      setDragToTimeline(false);
    },
    [handleFileSelect, dragToTimeline]
  );

  // 拖拽处理（增强版）
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);

    // 检测是否拖拽到时间轴区域
    const timelineElement = document.querySelector(
      ".timeline-editor-container"
    );
    if (timelineElement) {
      const rect = timelineElement.getBoundingClientRect();
      const isOverTimeline =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setDragToTimeline(isOverTimeline);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragToTimeline(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFileSelect(files, dragToTimeline);
      }
      setDragToTimeline(false);
    },
    [handleFileSelect, dragToTimeline]
  );

  // 搜索过滤（增强版）
  const filteredFiles = mediaFiles.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesType =
      filterType === "all" || file.type.startsWith(filterType);
    return matchesSearch && matchesType;
  });

  // 文件选择
  const handleFileSelection = useCallback(
    (fileId: string, multiSelect = false) => {
      if (multiSelect) {
        setSelectedFiles((prev) =>
          prev.includes(fileId)
            ? prev.filter((id) => id !== fileId)
            : [...prev, fileId]
        );
      } else {
        setSelectedFiles([fileId]);
      }
    },
    []
  );

  // 清除选择
  const handleClearSelection = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  // 添加选中文件到时间轴
  const handleAddSelectedToTimeline = useCallback(async () => {
    if (!timelineContext.addMediaFile || selectedFiles.length === 0) {
      return;
    }

    try {
      for (const fileId of selectedFiles) {
        const mediaFile = mediaFiles.find((f) => f.id === fileId);
        if (mediaFile && mediaFile.url) {
          try {
            // 从 URL 重新获取 File 对象
            const response = await fetch(mediaFile.url);
            const blob = await response.blob();
            const file = new File([blob], mediaFile.name, { type: blob.type });

            const fileType = getFileType(file);
            // 只添加支持的文件类型到时间轴
            if (fileType !== "unknown") {
              await timelineContext.addMediaFile(
                file,
                undefined,
                fileType as "video" | "audio" | "image"
              );
            } else {
              console.warn(`不支持的文件类型: ${mediaFile.type}`);
            }
          } catch (error) {
            console.error(`加载文件 ${mediaFile.name} 失败:`, error);
          }
        }
      }

      // 清除选择
      setSelectedFiles([]);

      console.log("所选文件已添加到时间轴");
    } catch (error) {
      console.error("添加文件到时间轴失败:", error);
      alert("添加文件到时间轴失败");
    }
  }, [timelineContext, selectedFiles, mediaFiles]);

  // 删除选中文件
  const handleDeleteSelected = useCallback(() => {
    if (selectedFiles.length === 0) return;

    if (confirm(`确定要删除 ${selectedFiles.length} 个文件吗？`)) {
      setMediaFiles((prev) =>
        prev.filter((file) => !selectedFiles.includes(file.id))
      );
      setSelectedFiles([]);
    }
  }, [selectedFiles]);

  // 下载选中文件
  const handleDownloadSelected = useCallback(() => {
    selectedFiles.forEach((fileId) => {
      const mediaFile = mediaFiles.find((f) => f.id === fileId);
      if (mediaFile && mediaFile.url) {
        const link = document.createElement("a");
        link.href = mediaFile.url;
        link.download = mediaFile.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }, [selectedFiles, mediaFiles]);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* 头部 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">媒体库</h2>

          <div className="flex items-center space-x-2">
            {/* 视图模式切换 */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* 过滤器按钮 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // 切换过滤器
                  const types: ("all" | "video" | "audio" | "image")[] = [
                    "all",
                    "video",
                    "audio",
                    "image",
                  ];
                  const currentIndex = types.indexOf(filterType);
                  const nextIndex = (currentIndex + 1) % types.length;
                  setFilterType(types[nextIndex]);
                }}
              >
                <Filter className="h-4 w-4" />
              </Button>
              {filterType !== "all" && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索媒体文件..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* 上传区域 */}
      <div className="p-4 border-b border-border">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            拖拽文件到此处或点击上传
            {dragToTimeline && (
              <span className="block text-primary font-medium">
                ⚡ 将直接添加到时间轴
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            支持 MP4, WebM, MP3, WAV, JPG, PNG 等格式
            {filterType !== "all" && (
              <span className="block mt-1 text-primary">
                当前过滤:{" "}
                {filterType === "video"
                  ? "视频"
                  : filterType === "audio"
                  ? "音频"
                  : "图片"}
              </span>
            )}
          </p>

          {/* 上传进度 */}
          {isUploading && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                上传中... {uploadProgress}%
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,audio/*,image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 媒体文件列表 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm">
              {mediaFiles.length === 0 ? "媒体库为空" : "没有找到匹配的文件"}
            </p>
            <p className="text-xs mt-1">
              {mediaFiles.length === 0
                ? "上传一些文件开始编辑"
                : "尝试其他搜索词"}
            </p>
          </div>
        ) : (
          <div className="p-4">
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredFiles.map((file) => (
                  <MediaItem
                    key={file.id}
                    file={file}
                    viewMode="grid"
                    isSelected={selectedFiles.includes(file.id)}
                    onSelect={(multiSelect) =>
                      handleFileSelection(file.id, multiSelect)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <MediaItem
                    key={file.id}
                    file={file}
                    viewMode="list"
                    isSelected={selectedFiles.includes(file.id)}
                    onSelect={(multiSelect) =>
                      handleFileSelection(file.id, multiSelect)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      {selectedFiles.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>已选择 {selectedFiles.length} 个文件</span>
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              清除选择
            </Button>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-2">
            {timelineContext.addMediaFile && (
              <Button
                size="sm"
                onClick={handleAddSelectedToTimeline}
                className="flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>添加到时间轴</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSelected}
              className="flex items-center space-x-1"
            >
              <span>下载</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="flex items-center space-x-1"
            >
              <span>删除</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 时间轴编辑器上下文提供者
 * 用于在 VideoEditor 中提供时间轴功能给 MediaLibrary
 */
export const TimelineEditorProvider: React.FC<{
  children: React.ReactNode;
  value: TimelineEditorContextType;
}> = ({ children, value }) => {
  return (
    <TimelineEditorContext.Provider value={value}>
      {children}
    </TimelineEditorContext.Provider>
  );
};

/**
 * 使用时间轴编辑器上下文的 Hook
 */
export const useTimelineEditorContext = () => {
  return useContext(TimelineEditorContext);
};

/**
 * 导出上下文类型
 */
export type { TimelineEditorContextType };
