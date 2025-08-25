'use client';

import React from 'react';
import { timeToPixel } from '@/lib/utils';

interface PlayheadIndicatorProps {
  playhead: number;
  scale: number;
  scrollPosition: number;
  height: number;
}

/**
 * 播放头指示器组件
 */
export function PlayheadIndicator({ 
  playhead, 
  scale, 
  scrollPosition, 
  height 
}: PlayheadIndicatorProps) {
  const playheadX = timeToPixel(playhead, scale, scrollPosition);

  // 如果播放头不在可视区域内，不显示
  if (playheadX < -10 || playheadX > 1210) {
    return null;
  }

  return (
    <div
      className="timeline-playhead absolute top-0 pointer-events-none z-10"
      style={{
        left: playheadX,
        height: height || '100%',
      }}
    >
      {/* 播放头线 */}
      <div className="w-0.5 h-full bg-timeline-playhead shadow-lg" />
      
      {/* 播放头三角形 */}
      <div 
        className="absolute -top-2 -left-1.5 w-3 h-3 bg-timeline-playhead"
        style={{
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        }}
      />
    </div>
  );
}