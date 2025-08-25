'use client';

import React from 'react';
import { Eye, EyeOff, Volume2, VolumeX, Lock, Unlock } from 'lucide-react';
import { Track } from '@/types';
import { useProjectStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrackHeaderProps {
  track: Track;
  height: number;
}

/**
 * 轨道头部组件
 */
export function TrackHeader({ track, height }: TrackHeaderProps) {
  const { updateTrack } = useProjectStore();

  const handleToggleVisibility = () => {
    updateTrack(track.id, { isVisible: !track.isVisible });
  };

  const handleToggleMute = () => {
    updateTrack(track.id, { isMuted: !track.isMuted });
  };

  const handleToggleLock = () => {
    updateTrack(track.id, { isLocked: !track.isLocked });
  };

  const getTrackIcon = () => {
    switch (track.type) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'text':
        return '📝';
      case 'image':
        return '🖼️';
      default:
        return '📄';
    }
  };

  return (
    <div
      className={cn(
        "timeline-track flex items-center px-3 border-b border-border",
        !track.isVisible && "opacity-50"
      )}
      style={{ height }}
    >
      <div className="flex-1 min-w-0">
        {/* 轨道图标和名称 */}
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm">{getTrackIcon()}</span>
          <span className="text-sm font-medium truncate" title={track.name}>
            {track.name}
          </span>
        </div>
        
        {/* 轨道信息 */}
        <div className="text-xs text-muted-foreground">
          {track.clips.length} 个片段
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center space-x-1 ml-2">
        {/* 可见性切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleVisibility}
          className="h-6 w-6"
          title={track.isVisible ? "隐藏轨道" : "显示轨道"}
        >
          {track.isVisible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>

        {/* 静音切换（仅音频和视频轨道） */}
        {(track.type === 'audio' || track.type === 'video') && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMute}
            className="h-6 w-6"
            title={track.isMuted ? "取消静音" : "静音"}
          >
            {track.isMuted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* 锁定切换 */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleLock}
          className="h-6 w-6"
          title={track.isLocked ? "解锁轨道" : "锁定轨道"}
        >
          {track.isLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}