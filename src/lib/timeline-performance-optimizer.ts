/**
 * 时间轴性能优化器
 * 实现虚拟滚动、批量更新、防抖等性能优化策略
 */

import { TimelineRow, TimelineAction } from "./timeline-data-adapter";

export interface PerformanceMetrics {
  renderTime: number;
  updateCount: number;
  visibleItems: number;
  totalItems: number;
  memoryUsage?: number;
}

export interface OptimizationOptions {
  enableVirtualScrolling?: boolean;
  batchUpdateDelay?: number;
  maxVisibleTracks?: number;
  trackHeightCaching?: boolean;
  debounceDelay?: number;
  enableMetrics?: boolean;
}

/**
 * 批量更新管理器
 */
class BatchUpdateManager {
  private updateQueue: Array<() => void> = [];
  private isProcessing = false;
  private batchDelay: number;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(batchDelay = 16) {
    // 60fps
    this.batchDelay = batchDelay;
  }

  /**
   * 添加更新到队列
   */
  addUpdate(updateFn: () => void): void {
    this.updateQueue.push(updateFn);
    this.scheduleProcessing();
  }

  /**
   * 调度批量处理
   */
  private scheduleProcessing(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
  }

  /**
   * 处理批量更新
   */
  private processBatch(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    const updates = [...this.updateQueue];
    this.updateQueue = [];

    requestAnimationFrame(() => {
      try {
        updates.forEach((update) => update());
      } finally {
        this.isProcessing = false;
        this.timeoutId = null;

        // 如果在处理过程中又有新的更新，继续处理
        if (this.updateQueue.length > 0) {
          this.scheduleProcessing();
        }
      }
    });
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.updateQueue = [];
  }
}

/**
 * 防抖工具
 */
class Debouncer {
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(private delay: number = 300) {}

  /**
   * 防抖执行
   */
  debounce<T extends (...args: any[]) => void>(
    fn: T,
    customDelay?: number
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(() => {
        fn(...args);
        this.timeoutId = null;
      }, customDelay || this.delay);
    };
  }

  /**
   * 取消防抖
   */
  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.cancel();
  }
}

/**
 * 虚拟滚动管理器
 */
class VirtualScrollManager {
  private containerHeight = 0;
  private trackHeight = 80;
  private scrollTop = 0;
  private totalTracks = 0;

  /**
   * 更新容器信息
   */
  updateContainer(height: number, trackHeight: number): void {
    this.containerHeight = height;
    this.trackHeight = trackHeight;
  }

  /**
   * 更新滚动位置
   */
  updateScrollPosition(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  /**
   * 设置总轨道数
   */
  setTotalTracks(count: number): void {
    this.totalTracks = count;
  }

  /**
   * 计算可见范围
   */
  getVisibleRange(): { start: number; end: number; offset: number } {
    const visibleCount = Math.ceil(this.containerHeight / this.trackHeight) + 2; // 缓冲2个
    const start = Math.max(
      0,
      Math.floor(this.scrollTop / this.trackHeight) - 1
    );
    const end = Math.min(this.totalTracks, start + visibleCount);
    const offset = start * this.trackHeight;

    return { start, end, offset };
  }

  /**
   * 获取虚拟滚动容器高度
   */
  getTotalHeight(): number {
    return this.totalTracks * this.trackHeight;
  }
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    updateCount: 0,
    visibleItems: 0,
    totalItems: 0,
  };

  private renderStartTime = 0;

  /**
   * 开始性能监控
   */
  startRender(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * 结束性能监控
   */
  endRender(): void {
    if (this.renderStartTime > 0) {
      this.metrics.renderTime = performance.now() - this.renderStartTime;
      this.renderStartTime = 0;
    }
  }

  /**
   * 记录更新次数
   */
  recordUpdate(): void {
    this.metrics.updateCount++;
  }

  /**
   * 更新可见项目数
   */
  updateVisibleItems(visible: number, total: number): void {
    this.metrics.visibleItems = visible;
    this.metrics.totalItems = total;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {
      renderTime: 0,
      updateCount: 0,
      visibleItems: 0,
      totalItems: 0,
    };
  }
}

/**
 * 时间轴性能优化器主类
 */
export class TimelinePerformanceOptimizer {
  private options: OptimizationOptions;
  private batchUpdateManager: BatchUpdateManager;
  private debouncer: Debouncer;
  private virtualScrollManager: VirtualScrollManager;
  private performanceMonitor: PerformanceMonitor;

  // 缓存
  private trackHeightCache = new Map<string, number>();
  private actionRenderCache = new Map<string, any>();

  constructor(options: OptimizationOptions = {}) {
    this.options = {
      enableVirtualScrolling: true,
      batchUpdateDelay: 16,
      maxVisibleTracks: 50,
      trackHeightCaching: true,
      debounceDelay: 300,
      enableMetrics: true,
      ...options,
    };

    this.batchUpdateManager = new BatchUpdateManager(
      this.options.batchUpdateDelay
    );
    this.debouncer = new Debouncer(this.options.debounceDelay);
    this.virtualScrollManager = new VirtualScrollManager();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * 优化轨道渲染
   */
  optimizeTrackRendering(
    tracks: TimelineRow[],
    containerHeight: number,
    scrollTop: number
  ): { visibleTracks: TimelineRow[]; virtualScrollProps: any } {
    if (this.options.enableMetrics) {
      this.performanceMonitor.startRender();
    }

    if (
      !this.options.enableVirtualScrolling ||
      tracks.length <= (this.options.maxVisibleTracks || 50)
    ) {
      // 不需要虚拟滚动
      if (this.options.enableMetrics) {
        this.performanceMonitor.updateVisibleItems(
          tracks.length,
          tracks.length
        );
        this.performanceMonitor.endRender();
      }

      return {
        visibleTracks: tracks,
        virtualScrollProps: {
          totalHeight: tracks.length * 80,
          offset: 0,
        },
      };
    }

    // 启用虚拟滚动
    this.virtualScrollManager.updateContainer(containerHeight, 80);
    this.virtualScrollManager.updateScrollPosition(scrollTop);
    this.virtualScrollManager.setTotalTracks(tracks.length);

    const { start, end, offset } = this.virtualScrollManager.getVisibleRange();
    const visibleTracks = tracks.slice(start, end);

    if (this.options.enableMetrics) {
      this.performanceMonitor.updateVisibleItems(
        visibleTracks.length,
        tracks.length
      );
      this.performanceMonitor.endRender();
    }

    return {
      visibleTracks,
      virtualScrollProps: {
        totalHeight: this.virtualScrollManager.getTotalHeight(),
        offset,
      },
    };
  }

  /**
   * 批量更新操作
   */
  batchUpdate(updateFn: () => void): void {
    this.batchUpdateManager.addUpdate(updateFn);

    if (this.options.enableMetrics) {
      this.performanceMonitor.recordUpdate();
    }
  }

  /**
   * 防抖操作
   */
  debounce<T extends (...args: any[]) => void>(
    fn: T,
    customDelay?: number
  ): (...args: Parameters<T>) => void {
    return this.debouncer.debounce(fn, customDelay);
  }

  /**
   * 缓存轨道高度
   */
  cacheTrackHeight(trackId: string, height: number): void {
    if (this.options.trackHeightCaching) {
      this.trackHeightCache.set(trackId, height);
    }
  }

  /**
   * 获取缓存的轨道高度
   */
  getCachedTrackHeight(trackId: string): number | undefined {
    if (this.options.trackHeightCaching) {
      return this.trackHeightCache.get(trackId);
    }
    return undefined;
  }

  /**
   * 缓存 Action 渲染结果
   */
  cacheActionRender(actionId: string, renderResult: any): void {
    this.actionRenderCache.set(actionId, renderResult);
  }

  /**
   * 获取缓存的 Action 渲染结果
   */
  getCachedActionRender(actionId: string): any {
    return this.actionRenderCache.get(actionId);
  }

  /**
   * 清除 Action 渲染缓存
   */
  clearActionRenderCache(actionId?: string): void {
    if (actionId) {
      this.actionRenderCache.delete(actionId);
    } else {
      this.actionRenderCache.clear();
    }
  }

  /**
   * 优化大量 Actions 的渲染
   */
  optimizeActionsRendering(
    actions: TimelineAction[],
    viewportStart: number,
    viewportEnd: number,
    scale: number
  ): TimelineAction[] {
    // 只渲染可见区域内的 actions
    return actions.filter((action) => {
      const actionStart = action.start * scale;
      const actionEnd = action.end * scale;

      // 检查 action 是否在可视区域内
      return actionEnd >= viewportStart && actionStart <= viewportEnd;
    });
  }

  /**
   * 内存优化
   */
  optimizeMemory(): void {
    // 清理过期的缓存
    const maxCacheSize = 100;

    if (this.trackHeightCache.size > maxCacheSize) {
      const entries = Array.from(this.trackHeightCache.entries());
      const toDelete = entries.slice(0, entries.length - maxCacheSize);
      toDelete.forEach(([key]) => this.trackHeightCache.delete(key));
    }

    if (this.actionRenderCache.size > maxCacheSize) {
      const entries = Array.from(this.actionRenderCache.entries());
      const toDelete = entries.slice(0, entries.length - maxCacheSize);
      toDelete.forEach(([key]) => this.actionRenderCache.delete(key));
    }

    // 强制垃圾回收（在支持的环境中）
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    if (this.options.enableMetrics) {
      return this.performanceMonitor.getMetrics();
    }
    return {
      renderTime: 0,
      updateCount: 0,
      visibleItems: 0,
      totalItems: 0,
    };
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    if (this.options.enableMetrics) {
      this.performanceMonitor.reset();
    }
  }

  /**
   * 创建优化的渲染函数
   */
  createOptimizedRenderer<T>(renderFn: (item: T) => any) {
    return this.debounce((items: T[]) => {
      return this.batchUpdate(() => {
        return items.map(renderFn);
      });
    });
  }

  /**
   * 销毁优化器
   */
  dispose(): void {
    this.batchUpdateManager.dispose();
    this.debouncer.dispose();
    this.trackHeightCache.clear();
    this.actionRenderCache.clear();
  }
}

/**
 * 创建性能优化器实例
 */
export function createTimelinePerformanceOptimizer(
  options?: OptimizationOptions
): TimelinePerformanceOptimizer {
  return new TimelinePerformanceOptimizer(options);
}
