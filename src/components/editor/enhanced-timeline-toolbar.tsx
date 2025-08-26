"use client";

import React from "react";
import { useProjectStore, useTimelineStore } from "@/stores";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Scissors,
  Copy,
  Trash2,
  Undo,
  Redo,
  Plus,
  Settings,
} from "lucide-react";

interface EnhancedTimelineToolbarProps {
  onAddTrack?: () => void;
  onRemoveTrack?: () => void;
  onSplitAtPlayhead?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onShowSettings?: () => void;
}

export function EnhancedTimelineToolbar({
  onAddTrack,
  onRemoveTrack,
  onSplitAtPlayhead,
  onDeleteSelected,
  onDuplicateSelected,
  onUndo,
  onRedo,
  onShowSettings,
}: EnhancedTimelineToolbarProps) {
  const { currentProject } = useProjectStore();
  const {
    isPlaying,
    playhead,
    duration,
    scale,
    snapToGrid,
    gridSize,
    selectedClips,
    play,
    pause,
    stop,
    seekTo,
    seekBy,
    setScale,
    zoomIn,
    zoomOut,
    zoomToFit,
    setSnapToGrid,
    setGridSize,
  } = useTimelineStore();

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleStop = () => {
    stop();
  };

  const handleSeekBackward = () => {
    seekBy(-1000); // 后退1秒
  };

  const handleSeekForward = () => {
    seekBy(1000); // 前进1秒
  };

  const handleZoomIn = () => {
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
  };

  const handleZoomToFit = () => {
    zoomToFit();
  };

  const handleToggleGrid = () => {
    setSnapToGrid(!snapToGrid);
  };

  const handleScaleChange = (value: number[]) => {
    setScale(value[0]);
  };

  const handleGridSizeChange = (value: number[]) => {
    setGridSize(value[0]);
  };

  const formatTime = (timeMs: number): string => {
    const seconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (!currentProject) {
    return null;
  }

  return (
    <div className="enhanced-timeline-toolbar bg-card border-b border-border p-2">
      <div className="flex items-center gap-4 flex-wrap">
        {/* 播放控制组 */}
        <div className="flex items-center gap-1 border-r border-border pr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSeekBackward}
            title="后退1秒 (←)"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            title={isPlaying ? "暂停 (空格)" : "播放 (空格)"}
            className={
              isPlaying
                ? "bg-red-100 hover:bg-red-200"
                : "bg-green-100 hover:bg-green-200"
            }
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleStop} title="停止">
            <Square className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSeekForward}
            title="前进1秒 (→)"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* 时间显示 */}
        <div className="flex items-center gap-2 text-sm border-r border-border pr-4">
          <span className="font-mono">
            {formatTime(playhead)} / {formatTime(duration)}
          </span>
        </div>

        {/* 缩放控制组 */}
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            title="缩小 (Ctrl+-)"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <div className="w-24">
            <Slider
              value={[scale]}
              onValueChange={handleScaleChange}
              min={0.1}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>
          <span className="text-xs text-muted-foreground w-12">
            {Math.round(scale * 100)}%
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            title="放大 (Ctrl++)"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomToFit}
            title="适合窗口 (Ctrl+0)"
          >
            适合
          </Button>
        </div>

        {/* 网格控制组 */}
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <Button
            variant={snapToGrid ? "default" : "ghost"}
            size="sm"
            onClick={handleToggleGrid}
            title="网格对齐"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>

          {snapToGrid && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">网格:</span>
              <div className="w-16">
                <Slider
                  value={[gridSize]}
                  onValueChange={handleGridSizeChange}
                  min={100}
                  max={5000}
                  step={100}
                  className="w-full"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {gridSize}ms
              </span>
            </div>
          )}
        </div>

        {/* 编辑工具组 */}
        <div className="flex items-center gap-1 border-r border-border pr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSplitAtPlayhead}
            title="分割 (S)"
          >
            <Scissors className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicateSelected}
            disabled={selectedClips.length === 0}
            title="复制 (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteSelected}
            disabled={selectedClips.length === 0}
            title="删除 (Delete)"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* 历史记录组 */}
        <div className="flex items-center gap-1 border-r border-border pr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            title="撤销 (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            title="重做 (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>
        </div>

        {/* 轨道管理组 */}
        <div className="flex items-center gap-1 border-r border-border pr-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTrack}
            title="添加轨道"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <span className="text-xs text-muted-foreground">
            {currentProject.tracks.length} 轨道
          </span>

          {selectedClips.length > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              已选择 {selectedClips.length} 个片段
            </span>
          )}
        </div>

        {/* 设置按钮 */}
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowSettings}
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
        <div className="flex gap-6">
          <span>
            <kbd>空格</kbd> 播放/暂停
          </span>
          <span>
            <kbd>S</kbd> 分割
          </span>
          <span>
            <kbd>Delete</kbd> 删除
          </span>
          <span>
            <kbd>Ctrl+D</kbd> 复制
          </span>
          <span>
            <kbd>Ctrl+A</kbd> 全选
          </span>
          <span>
            <kbd>Ctrl+Z</kbd> 撤销
          </span>
          <span>
            <kbd>Ctrl+Y</kbd> 重做
          </span>
          <span>
            <kbd>Ctrl +/-</kbd> 缩放
          </span>
          <span>
            <kbd>Ctrl+0</kbd> 适合窗口
          </span>
          <span>
            <kbd>←/→</kbd> 前进/后退
          </span>
        </div>
      </div>
    </div>
  );
}
