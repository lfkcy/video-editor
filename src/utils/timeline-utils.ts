/**
 * 时间轴工具函数
 */

/**
 * 将时间转换为像素位置
 * @param time 时间（秒）
 * @param scale 缩放比例（像素/秒）
 * @returns 像素位置
 */
export function timeToPixel(time: number, scale: number): number {
  return time * scale;
}

/**
 * 将像素位置转换为时间
 * @param pixel 像素位置
 * @param scale 缩放比例（像素/秒）
 * @param scrollOffset 滚动偏移量
 * @returns 时间（秒）
 */
export function pixelToTime(pixel: number, scale: number, scrollOffset: number = 0): number {
  return (pixel + scrollOffset) / scale;
}

/**
 * 对齐到网格
 * @param time 原始时间
 * @param gridSize 网格大小（秒）
 * @returns 对齐后的时间
 */
export function snapToGrid(time: number, gridSize: number): number {
  return Math.round(time / gridSize) * gridSize;
}

/**
 * 检查时间范围是否重叠
 * @param start1 范围1开始时间
 * @param end1 范围1结束时间
 * @param start2 范围2开始时间
 * @param end2 范围2结束时间
 * @returns 是否重叠
 */
export function isTimeRangeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * 限制值在指定范围内
 * @param value 原始值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 格式化时间显示
 * @param seconds 秒数
 * @param showMilliseconds 是否显示毫秒
 * @returns 格式化的时间字符串
 */
export function formatTimeDisplay(seconds: number, showMilliseconds: boolean = false): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  if (hours > 0) {
    if (showMilliseconds) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  } else {
    if (showMilliseconds) {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
}

/**
 * 计算合适的时间间隔标记
 * @param duration 总时长（秒）
 * @param scale 缩放比例
 * @param containerWidth 容器宽度
 * @returns 时间间隔和子间隔
 */
export function calculateTimeIntervals(
  duration: number,
  scale: number,
  containerWidth: number
): { majorInterval: number; minorInterval: number } {
  const pixelWidth = duration * scale;
  const targetMarksCount = containerWidth / 100; // 每100像素一个主要标记
  const rawInterval = duration / targetMarksCount;

  // 标准间隔值
  const intervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
  
  // 找到最接近的间隔
  let majorInterval = intervals[0];
  for (const interval of intervals) {
    if (interval >= rawInterval) {
      majorInterval = interval;
      break;
    }
    majorInterval = interval;
  }

  // 子间隔是主间隔的1/5或1/10
  let minorInterval = majorInterval / 5;
  if (majorInterval >= 60) {
    minorInterval = majorInterval / 10;
  }

  return { majorInterval, minorInterval };
}

/**
 * 生成时间标记
 * @param duration 总时长
 * @param majorInterval 主要间隔
 * @param minorInterval 次要间隔
 * @returns 标记数组
 */
export function generateTimeMarks(
  duration: number,
  majorInterval: number,
  minorInterval: number
): Array<{ time: number; isMajor: boolean }> {
  const marks: Array<{ time: number; isMajor: boolean }> = [];
  
  // 生成主要标记
  for (let time = 0; time <= duration; time += majorInterval) {
    marks.push({ time, isMajor: true });
  }
  
  // 生成次要标记
  for (let time = minorInterval; time < duration; time += minorInterval) {
    // 检查是否与主要标记重叠
    const isOverlap = marks.some(mark => Math.abs(mark.time - time) < 0.001);
    if (!isOverlap) {
      marks.push({ time, isMajor: false });
    }
  }
  
  return marks.sort((a, b) => a.time - b.time);
}