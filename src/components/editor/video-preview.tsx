'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Maximize } from 'lucide-react';
import { useTimelineStore, useUIStore } from '@/stores';
import { videoClipService } from '@/services';
import { Button } from '@/components/ui/button';
import { cn, formatTime } from '@/lib/utils';

/**
 * 视频预览器组件
 */
export function VideoPreview() {
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
  } = useTimelineStore();
  
  const { 
    isFullscreen, 
    toggleFullscreen,
    previewQuality,
    previewAudio,
    showSafeArea 
  } = useUIStore();

  // 本地状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  // 初始化画布服务
  useEffect(() => {
    const initializeCanvas = async () => {
      if (!containerRef.current) return;

      try {
        await videoClipService.initialize(containerRef.current);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize canvas service:', err);
        setError('无法初始化视频预览器');
      }
    };

    initializeCanvas();

    return () => {
      videoClipService.destroy();
    };
  }, []);

  // 播放控制
  const handlePlayPause = useCallback(async () => {
    if (!isInitialized) return;

    try {
      if (isPlaying) {
        await videoClipService.pause();
        pause();
      } else {
        await videoClipService.play();
        play();
      }
    } catch (err) {
      console.error('Playback control failed:', err);
    }
  }, [isInitialized, isPlaying, play, pause]);

  const handleStop = useCallback(async () => {
    if (!isInitialized) return;

    try {
      await videoClipService.stop();
      stop();
    } catch (err) {
      console.error('Stop failed:', err);
    }
  }, [isInitialized, stop]);

  const handleSeek = useCallback(async (time: number) => {
    if (!isInitialized) return;

    try {
      await videoClipService.seekTo(time / 1000); // 转换为秒
      seekTo(time);
    } catch (err) {
      console.error('Seek failed:', err);
    }
  }, [isInitialized, seekTo]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!isInitialized) return;

    // videoClipService.setVolume(newVolume);
    setVolume(newVolume);
  }, [isInitialized, setVolume]);

  const handleMuteToggle = useCallback(() => {
    toggleMute();
    if (isInitialized) {
      // videoClipService.setVolume(muted ? volume : 0);
    }
  }, [isInitialized, muted, volume, toggleMute]);

  // 进度条拖拽
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    handleSeek(newTime);
  }, [duration, handleSeek]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'KeyK':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'KeyM':
          e.preventDefault();
          handleMuteToggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 1000));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 1000));
          break;
        case 'Home':
          e.preventDefault();
          handleSeek(0);
          break;
        case 'End':
          e.preventDefault();
          handleSeek(duration);
          break;
        case 'KeyF':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, handlePlayPause, handleSeek, handleMuteToggle, toggleFullscreen]);

  // 鼠标悬停控制显示
  const handleMouseEnter = () => setShowControls(true);
  const handleMouseLeave = () => setShowControls(false);

  if (error) {
    return (
      <div className="video-preview h-full flex items-center justify-center bg-black rounded-lg">
        <div className="text-center text-white">
          <div className="text-red-400 mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "video-preview relative h-full bg-black rounded-lg overflow-hidden group",
        isFullscreen && "fixed inset-0 z-50 rounded-none"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 画布容器 */}
      <div 
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
      >
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

      {/* 控制栏 */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
          showControls || isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {/* 进度条 */}
        <div 
          className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
            }}
          />
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* 播放/暂停 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="text-white hover:bg-white/20"
              disabled={!isInitialized}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            {/* 停止 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStop}
              className="text-white hover:bg-white/20"
              disabled={!isInitialized}
            >
              <Square className="h-4 w-4" />
            </Button>

            {/* 时间显示 */}
            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 音量控制 */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMuteToggle}
                className="text-white hover:bg-white/20"
              >
                {muted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={muted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/30 rounded-full appearance-none slider"
              />
            </div>

            {/* 全屏 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 质量指示器 */}
      <div className="absolute top-4 right-4 text-white text-xs bg-black/50 px-2 py-1 rounded">
        {previewQuality.toUpperCase()}
        {!previewAudio && " (静音)"}
      </div>
    </div>
  );
}