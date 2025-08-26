'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { useTimelineStore, useUIStore, useProjectStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatTime, cn } from '@/lib/utils';

/**
 * PlayerControls 组件属性
 */
interface PlayerControlsProps {
  // 从 VideoEditor 传入的集成器引用
  onPlayPause?: () => void;
  onStop?: () => void;
  onSeek?: (time: number) => void;
  onSkipBack?: (seconds?: number) => void;
  onSkipForward?: (seconds?: number) => void;
  className?: string;
}

/**
 * 播放器控制组件
 * 重构以支持与 AVCanvas 的双向同步
 */
export function PlayerControls({
  onPlayPause,
  onStop,
  onSeek,
  onSkipBack,
  onSkipForward,
  className = ''
}: PlayerControlsProps) {
  const {
    isPlaying,
    playhead,
    duration,
    volume,
    muted,
    playbackRate,
    loopMode,
    play,
    pause,
    stop,
    setPlayhead,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleLoop,
  } = useTimelineStore();

  const {
    isFullscreen,
    toggleFullscreen,
    previewQuality,
    setPreviewQuality,
  } = useUIStore();

  const { currentProject } = useProjectStore();
  
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [tempPlayhead, setTempPlayhead] = useState(playhead);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // 同步临时播放头位置
  useEffect(() => {
    if (!isDraggingProgress) {
      setTempPlayhead(playhead);
    }
  }, [playhead, isDraggingProgress]);

  // 播放/暂停控制（重构版）
  const handlePlayPause = useCallback(async () => {
    try {
      if (onPlayPause) {
        // 使用传入的回调函数
        onPlayPause();
      } else {
        // 退补处理
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      }
    } catch (error) {
      console.error('播放控制失败:', error);
    }
  }, [isPlaying, play, pause, onPlayPause]);

  // 停止播放（重构版）
  const handleStop = useCallback(async () => {
    try {
      if (onStop) {
        onStop();
      } else {
        // 退补处理
        stop();
        setPlayhead(0);
      }
    } catch (error) {
      console.error('停止失败:', error);
    }
  }, [stop, setPlayhead, onStop]);

  // 跳转控制（重构版）
  const handleSkipBack = useCallback(() => {
    const skipSeconds = 5; // 后退秒数
    if (onSkipBack) {
      onSkipBack(skipSeconds);
    } else {
      // 退补处理
      const newTime = Math.max(0, playhead - skipSeconds * 1000);
      setPlayhead(newTime);
    }
  }, [playhead, setPlayhead, onSkipBack]);

  const handleSkipForward = useCallback(() => {
    const skipSeconds = 5; // 前进秒数
    if (onSkipForward) {
      onSkipForward(skipSeconds);
    } else {
      // 退补处理
      const newTime = Math.min(duration, playhead + skipSeconds * 1000);
      setPlayhead(newTime);
    }
  }, [playhead, duration, setPlayhead, onSkipForward]);

  // 跳转到开始/结束（重构版）
  const handleJumpToStart = useCallback(() => {
    if (onSeek) {
      onSeek(0);
    } else {
      setPlayhead(0);
    }
  }, [setPlayhead, onSeek]);

  const handleJumpToEnd = useCallback(() => {
    const endTime = duration;
    if (onSeek) {
      onSeek(endTime / 1000); // 转换为秒
    } else {
      setPlayhead(endTime);
    }
  }, [duration, setPlayhead, onSeek]);

  // 进度条拖拽处理（重构版）
  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    if (!progressRef.current || duration === 0) return;

    setIsDraggingProgress(true);
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    setTempPlayhead(newTime);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = progressRef.current!.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = percent * duration;
      setTempPlayhead(newTime);
    };

    const handleMouseUp = () => {
      setIsDraggingProgress(false);
      
      // 使用回调函数或退补处理
      if (onSeek) {
        onSeek(tempPlayhead / 1000); // 转换为秒
      } else {
        setPlayhead(tempPlayhead);
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [duration, tempPlayhead, setPlayhead, onSeek]);

  // 音量控制
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    // videoClipService.setVolume(newVolume);
    if (newVolume > 0 && muted) {
      toggleMute(); // 如果调整音量且当前静音，取消静音
    }
  }, [setVolume, muted, toggleMute]);

  const handleMuteToggle = useCallback(() => {
    toggleMute();
    // videoClipService.setVolume(muted ? volume : 0);
  }, [muted, volume, toggleMute]);

  // 播放速度控制
  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    // 这里可以调用canvas服务设置播放速度
  }, [setPlaybackRate]);

  // 预览质量控制
  const qualityOptions = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
    { value: 'ultra', label: '超高' },
  ];

  const playbackRateOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  const currentPlayhead = isDraggingProgress ? tempPlayhead : playhead;
  const progressPercent = duration > 0 ? (currentPlayhead / duration) * 100 : 0;

  return (
    <div className={cn("player-controls bg-card border-t border-border p-3", className)}>
      {/* 主控制区 */}
      <div className="flex items-center space-x-4">
        {/* 播放控制按钮 */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleJumpToStart}
            className="h-8 w-8"
            title="跳转到开始 (Home)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkipBack}
            className="h-8 w-8"
            title="后退5秒 (←)"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant={isPlaying ? "default" : "default"}
            size="icon"
            onClick={handlePlayPause}
            className="h-10 w-10"
            title="播放/暂停 (Space)"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="h-8 w-8"
            title="停止"
          >
            <Square className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkipForward}
            className="h-8 w-8"
            title="前进5秒 (→)"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleJumpToEnd}
            className="h-8 w-8"
            title="跳转到结束 (End)"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 时间显示 */}
        <div className="text-sm font-mono min-w-32">
          {formatTime(currentPlayhead)} / {formatTime(duration)}
        </div>

        {/* 进度条 */}
        <div className="flex-1 mx-4">
          <div
            ref={progressRef}
            className="relative h-2 bg-muted rounded-full cursor-pointer group"
            onMouseDown={handleProgressMouseDown}
          >
            <div
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressPercent}%`, marginLeft: '-6px' }}
            />
          </div>
        </div>

        {/* 右侧控制 */}
        <div className="flex items-center space-x-2">
          {/* 音量控制 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMuteToggle}
              className="h-8 w-8"
              title="静音/取消静音 (M)"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            <div className="w-20">
              <Slider
                value={[muted ? 0 : volume]}
                onValueChange={([value]) => handleVolumeChange(value)}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
          </div>

          {/* 播放速度 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs">
                {playbackRate}x
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32">
              <div className="space-y-1">
                {playbackRateOptions.map(rate => (
                  <Button
                    key={rate}
                    variant={playbackRate === rate ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handlePlaybackRateChange(rate)}
                    className="w-full justify-start text-xs"
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* 循环模式 */}
          <Button
            variant={loopMode ? "default" : "ghost"}
            size="icon"
            onClick={toggleLoop}
            className="h-8 w-8"
            title="循环播放"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* 预览设置 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="预览设置">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">预览质量</label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {qualityOptions.map(option => (
                      <Button
                        key={option.value}
                        variant={previewQuality === option.value ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setPreviewQuality(option.value as any)}
                        className="text-xs"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* 全屏 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8"
            title="全屏 (F)"
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 状态信息 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <div className="flex items-center space-x-4">
          {currentProject && (
            <>
              <span>{currentProject.settings.width}×{currentProject.settings.height}</span>
              <span>{currentProject.settings.fps}fps</span>
              <span>质量: {previewQuality.toUpperCase()}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {loopMode && <span>🔁 循环</span>}
          {isPlaying && <span>▶️ 播放中</span>}
        </div>
      </div>
    </div>
  );
}