"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useProjectStore, useTimelineStore, useUIStore } from "@/stores";
import { VideoPreview } from "./video-preview";
import { TimelineEditor } from "./timeline-editor";
import { PlayerControls } from "./player-controls";
import {
  MediaLibrary,
  TimelineEditorProvider,
  TimelineEditorContextType,
} from "../panels/media-library";
import { PropertyPanel } from "../panels/property-panel";
import { ExportDialog } from "../export/export-dialog";
import { ShortcutHelp } from "../ui/shortcut-help";
import { ResponsiveLayoutManager } from "../ui/responsive-layout-manager";
import { StatusFeedback } from "../ui/status-feedback";
import { ErrorBoundary } from "../error/error-boundary";
import { performanceMonitor } from "@/utils/performance-monitor";
import { cn } from "@/lib/utils";

// 新的服务和管理器
import {
  VideoClipService,
  createVideoClipService,
} from "@/services/video-clip-service";
import {
  TimelineAVCanvasIntegrator,
  createTimelineAVCanvasIntegrator,
} from "@/lib/timeline-avcanvas-integrator";
import {
  PlaybackSyncManager,
  createPlaybackSyncManager,
} from "@/lib/playback-sync-manager";
import {
  ClipOperationManager,
  createClipOperationManager,
} from "@/lib/clip-operation-manager";
import {
  KeyboardShortcutManager,
  createKeyboardShortcutManager,
} from "@/lib/keyboard-shortcut-manager";

/**
 * 主视频编辑器组件（重构版）
 * 集成所有新的管理器和服务，实现完整的视频编辑功能
 */
export function VideoEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineEditorRef = useRef<any>(null);
  // 定义本地引用来存储从子组件传回的 DOM 节点
  const videoPreviewContainerRef = useRef<HTMLDivElement | null>(null);

  // 状态管理
  const { currentProject, createNewProject } = useProjectStore();
  const { layout, theme } = useUIStore();
  const { setDuration, selectedClips, playhead, isPlaying } =
    useTimelineStore();

  // 本地状态
  const [isInitialized, setIsInitialized] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  // 服务和管理器引用
  const videoClipServiceRef = useRef<VideoClipService>();
  const timelineIntegratorRef = useRef<TimelineAVCanvasIntegrator>();
  const playbackSyncManagerRef = useRef<PlaybackSyncManager>();
  const clipOperationManagerRef = useRef<ClipOperationManager>();
  const keyboardShortcutManagerRef = useRef<KeyboardShortcutManager>();

  useEffect(() => {
    if (!currentProject) {
      createNewProject();
    }
    // 只有在收到 VideoPreview 的容器引用并且编辑器未初始化时，才启动初始化流程
    if (videoPreviewContainerRef.current && !isInitialized && currentProject) {
      const initializeEditor = async () => {
        try {
          // --- 修改点 2: 在这里设置 isLoading 为 true ---
          setIsLoading(true);
          setInitializationError(null);

          console.log("准备初始化视频编辑器...");

          // 1. 创建 VideoClipService，使用传递进来的容器
          if (!videoClipServiceRef.current) {
            console.log("初始化 VideoClipService...");
            videoClipServiceRef.current = createVideoClipService();
            await videoClipServiceRef.current.initialize(
              videoPreviewContainerRef.current as HTMLElement,
              currentProject.settings,
              {
                width: currentProject.settings.width,
                height: currentProject.settings.height,
                bgColor: "#000000",
              }
            );
          }

          // 2. 创建时间轴集成器
          if (!timelineIntegratorRef.current && videoClipServiceRef.current) {
            console.log("初始化 TimelineAVCanvasIntegrator...");
            timelineIntegratorRef.current = createTimelineAVCanvasIntegrator(
              videoClipServiceRef.current
            );
          }

          // 3. 创建播放同步管理器
          if (
            !playbackSyncManagerRef.current &&
            videoClipServiceRef.current &&
            timelineIntegratorRef.current
          ) {
            console.log("初始化 PlaybackSyncManager...");
            playbackSyncManagerRef.current = createPlaybackSyncManager(
              videoClipServiceRef.current,
              timelineIntegratorRef.current
            );
            playbackSyncManagerRef.current.initialize();
          }

          // 4. 创建片段操作管理器
          if (
            !clipOperationManagerRef.current &&
            videoClipServiceRef.current &&
            timelineIntegratorRef.current
          ) {
            console.log("初始化 ClipOperationManager...");
            clipOperationManagerRef.current = createClipOperationManager(
              videoClipServiceRef.current,
              timelineIntegratorRef.current
            );
            clipOperationManagerRef.current.initialize();
          }

          // 5. 创建键盘快捷键管理器
          if (!keyboardShortcutManagerRef.current) {
            console.log("初始化 KeyboardShortcutManager...");
            keyboardShortcutManagerRef.current =
              createKeyboardShortcutManager();
            keyboardShortcutManagerRef.current.updateContext({
              clipOperationManager: clipOperationManagerRef.current,
              playbackSyncManager: playbackSyncManagerRef.current,
              selectedClipIds: selectedClips,
              currentTime: playhead,
            });
            keyboardShortcutManagerRef.current.startListening();
          }

          // 初始化性能监控
          const endTiming = performanceMonitor.startTiming(
            "editorInitialization"
          );

          setIsInitialized(true);
          // --- 修改点 3: 在这里设置 isLoading 为 false ---
          setIsLoading(false);
          console.log("视频编辑器初始化完成");

          endTiming();
        } catch (error) {
          console.error("初始化编辑器失败:", error);
          setInitializationError(
            error instanceof Error ? error.message : "初始化失败"
          );
          // --- 修改点 4: 在错误时也设置 isLoading 为 false ---
          setIsLoading(false);
        }
      };

      initializeEditor();
    }
  }, [
    videoPreviewContainerRef.current,
    isInitialized,
    currentProject,
    selectedClips,
    playhead,
  ]);

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

  // 更新快捷键上下文
  useEffect(() => {
    if (keyboardShortcutManagerRef.current) {
      keyboardShortcutManagerRef.current.updateContext({
        selectedClipIds: selectedClips,
        currentTime: playhead,
      });
    }
  }, [selectedClips, playhead]);

  // 组件清理
  useEffect(() => {
    return () => {
      // 清理所有管理器和服务
      keyboardShortcutManagerRef.current?.destroy();
      clipOperationManagerRef.current?.destroy();
      playbackSyncManagerRef.current?.destroy();
      timelineIntegratorRef.current?.destroy();
      videoClipServiceRef.current?.destroy();

      console.log("视频编辑器组件已清理");
    };
  }, []);

  /**
   * 核心初始化逻辑。这个函数现在由 VideoPreview 准备就绪时调用。
   */
  const handleVideoPreviewInitialized = useCallback(
    (container: HTMLDivElement) => {
      console.log("接收到 VideoPreview 的容器引用");
      videoPreviewContainerRef.current = container;
    },
    []
  );

  // 播放控制回调函数
  const handlePlayPause = useCallback(() => {
    playbackSyncManagerRef.current?.togglePlayPause();
  }, []);

  const handleStop = useCallback(() => {
    playbackSyncManagerRef.current?.stop();
  }, []);

  const handleSeek = useCallback((time: number) => {
    playbackSyncManagerRef.current?.seekTo(time);
  }, []);

  const handleSkipBack = useCallback((seconds = 5) => {
    playbackSyncManagerRef.current?.skipBack(seconds);
  }, []);

  const handleSkipForward = useCallback((seconds = 5) => {
    playbackSyncManagerRef.current?.skipForward(seconds);
  }, []);

  // 媒体库上下文
  const mediaLibraryContext: TimelineEditorContextType = {
    addMediaFile: timelineEditorRef.current?.addMediaFile,
    addTextSprite: timelineEditorRef.current?.addTextSprite,
  };

  // 加载状态渲染
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium mb-2">初始化视频编辑器...</p>
          <p className="text-sm text-muted-foreground">
            请稍候，正在加载核心组件
          </p>
        </div>
      </div>
    );
  }

  // 错误状态渲染
  if (initializationError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-destructive">
            初始化失败
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {initializationError}
          </p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 未初始化状态
  if (!isInitialized || !currentProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 bg-muted mx-auto mb-4"></div>
          <p className="text-muted-foreground">准备编辑器...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Video Editor Error:", error, errorInfo);
        performanceMonitor.measureCustomMetric("errorCount", 1);
      }}
    >
      <div
        ref={containerRef}
        className={cn(
          "video-editor flex flex-col h-screen overflow-hidden",
          theme === "dark" ? "dark" : ""
        )}
      >
        {/* 头部工具栏 */}
        <header className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">{currentProject.name}</h1>
            <div className="text-sm text-muted-foreground">
              {currentProject.settings.width} × {currentProject.settings.height}{" "}
              • {currentProject.settings.fps}fps
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
              <TimelineEditorProvider value={mediaLibraryContext}>
                <MediaLibrary />
              </TimelineEditorProvider>
            </aside>
          )}

          {/* 中央区域 */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* 视频预览区 */}
            <div className="flex-1 p-4 bg-muted/20 overflow-scroll">
              <VideoPreview onInitialized={handleVideoPreviewInitialized} />
            </div>

            {/* 时间轴区域 */}
            {layout.showBottomPanel && (
              <div className="border-t bg-background overflow-scroll">
                {/* 播放器控制 */}
                {/* <PlayerControls
                  onPlayPause={handlePlayPause}
                  onStop={handleStop}
                  onSeek={handleSeek}
                  onSkipBack={handleSkipBack}
                  onSkipForward={handleSkipForward}
                /> */}

                {/* 时间轴 */}
                <div className="h-80">
                  <TimelineEditor
                    ref={timelineEditorRef}
                    height={320}
                    showToolbar={true}
                    onTimelineChange={(data) => {
                      console.log("时间轴数据变化:", data);
                    }}
                    onTimeChange={(time) => {
                      console.log("时间变化:", time);
                    }}
                    onSelectionChange={(actionIds) => {
                      console.log("选择变化:", actionIds);
                    }}
                  />
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
            <span>
              分辨率: {currentProject.settings.width}×
              {currentProject.settings.height}
            </span>
            <span>帧率: {currentProject.settings.fps}fps</span>
            {selectedClips.length > 0 && (
              <span className="text-primary">
                已选择: {selectedClips.length} 个片段
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>播放状态: {isPlaying ? "播放中" : "暂停"}</span>
            <span>时间: {Math.round(playhead / 1000)}s</span>
            <StatusFeedback />
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
