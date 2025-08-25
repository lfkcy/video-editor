'use client';

import React from 'react';
import { formatTime, timeToPixel } from '@/lib/utils';

interface TimeRulerProps {
  duration: number;
  scale: number;
  scrollPosition: number;
  onTimelineClick: (e: React.MouseEvent) => void;
}

/**
 * 时间标尺组件
 */
export function TimeRuler({ 
  duration, 
  scale, 
  scrollPosition, 
  onTimelineClick 
}: TimeRulerProps) {
  // 计算合适的刻度间隔
  const getTickInterval = () => {
    const pixelsPerSecond = scale;
    
    if (pixelsPerSecond > 100) return 1000; // 1秒
    if (pixelsPerSecond > 50) return 2000; // 2秒
    if (pixelsPerSecond > 20) return 5000; // 5秒
    if (pixelsPerSecond > 10) return 10000; // 10秒
    if (pixelsPerSecond > 5) return 30000; // 30秒
    return 60000; // 1分钟
  };

  const tickInterval = getTickInterval();
  const minorTickInterval = tickInterval / 5;

  // 生成刻度
  const generateTicks = () => {
    const ticks = [];
    const visibleStart = scrollPosition / scale;
    const visibleEnd = visibleStart + (1200 / scale); // 假设可视宽度为1200px
    
    const startTick = Math.floor(visibleStart / tickInterval) * tickInterval;
    const endTick = Math.ceil(Math.min(visibleEnd, duration) / tickInterval) * tickInterval;

    // 主刻度
    for (let time = startTick; time <= endTick; time += tickInterval) {
      const x = timeToPixel(time, scale, scrollPosition);
      if (x >= -50 && x <= 1250) { // 稍微扩展可视范围
        ticks.push({
          time,
          x,
          isMajor: true,
          label: formatTime(time),
        });
      }
    }

    // 次刻度
    for (let time = startTick; time <= endTick; time += minorTickInterval) {
      if (time % tickInterval !== 0) { // 不与主刻度重叠
        const x = timeToPixel(time, scale, scrollPosition);
        if (x >= -50 && x <= 1250) {
          ticks.push({
            time,
            x,
            isMajor: false,
            label: '',
          });
        }
      }
    }

    return ticks.sort((a, b) => a.time - b.time);
  };

  const ticks = generateTicks();
  const timelineWidth = Math.max(1000, duration * scale + 1000);

  return (
    <div 
      className="relative h-8 bg-muted/50 border-b border-border cursor-pointer overflow-hidden"
      onClick={onTimelineClick}
      style={{ width: timelineWidth }}
    >
      {/* 背景 */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-muted/50" />

      {/* 刻度线和标签 */}
      {ticks.map((tick, index) => (
        <div
          key={index}
          className="absolute"
          style={{ left: tick.x }}
        >
          {/* 刻度线 */}
          <div
            className={`w-px bg-foreground/60 ${
              tick.isMajor ? 'h-8' : 'h-4 mt-4'
            }`}
          />
          
          {/* 时间标签 */}
          {tick.isMajor && tick.label && (
            <div 
              className="absolute top-1 text-xs text-foreground/80 font-mono whitespace-nowrap"
              style={{ 
                left: 4,
                transform: tick.x < 50 ? 'none' : 'translateX(-50%)'
              }}
            >
              {tick.label}
            </div>
          )}
        </div>
      ))}

      {/* 时间轴边界指示 */}
      {duration > 0 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-destructive/60"
          style={{ left: timeToPixel(duration, scale, scrollPosition) }}
        />
      )}
    </div>
  );
}