"use client";

import React, { useRef, useEffect, useState } from "react";
import { useTimelineStore, useUIStore } from "@/stores";
import { videoClipService } from "@/services";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  onInitialized: (container: HTMLDivElement) => void;
}

/**
 * 视频预览器组件
 */
export const VideoPreview = ({ onInitialized }: VideoPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 状态管理
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    toggleMute,
    setCurrentTime,
  } = useTimelineStore();

  const {
    isFullscreen,
    toggleFullscreen,
    previewQuality,
    previewAudio,
    showSafeArea,
  } = useUIStore();

  // 本地状态
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 使用本地 ref 来确保 DOM 节点已挂载
    const container = containerRef.current;

    if (!container) {
      console.log("VideoPreview container not yet available.");
      return;
    }

    // 确保只执行一次初始化逻辑
    const initialize = async () => {
      try {
        // 在这里执行 VideoPreview 自己的初始化逻辑
        await videoClipService.initialize(containerRef.current!);

        setIsInitialized(true);
        console.log("VideoPreview 内部初始化成功，通知父组件");

        // 调用回调，把 DOM 节点传给父组件
        onInitialized(container);
      } catch (err) {
        console.error("Failed to initialize VideoPreview:", err);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    return () => {
      videoClipService.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "video-preview relative h-full bg-black rounded-lg overflow-hidden group",
        isFullscreen && "fixed inset-0 z-50 rounded-none"
      )}
    >
      {/* 画布容器 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {!isInitialized && (
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">初始化预览器...</p>
          </div>
        )}
      </div>

      {/* 安全区域指示 */}
      {showSafeArea && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-[10%] border border-white/30 rounded"></div>
          <div className="absolute inset-[20%] border border-white/20 rounded"></div>
        </div>
      )}

      {/* 质量指示器 */}
      <div className="absolute top-4 right-4 text-white text-xs bg-black/50 px-2 py-1 rounded">
        {previewQuality.toUpperCase()}
        {!previewAudio && " (静音)"}
      </div>
    </div>
  );
};
