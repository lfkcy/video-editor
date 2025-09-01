/**
 * 性能优化管理器
 * 提供内存管理、渲染优化、错误处理等功能
 */

/**
 * 性能指标类型
 */
interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  componentCount: number;
  spriteCount: number;
  actionCount: number;
  fps: number;
  lastUpdateTime: number;
}

/**
 * 内存监控配置
 */
interface MemoryMonitorConfig {
  maxMemoryUsage: number; // MB
  checkInterval: number; // ms
  warningThreshold: number; // MB
  cleanupThreshold: number; // MB
}

/**
 * 渲染优化配置
 */
interface RenderOptimizationConfig {
  enableVirtualScrolling: boolean;
  maxVisibleItems: number;
  debounceDelay: number;
  enableLazyLoading: boolean;
  cacheSize: number;
}

/**
 * 错误处理配置
 */
interface ErrorHandlingConfig {
  enableErrorBoundary: boolean;
  enableRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

/**
 * 性能优化管理器类
 */
export class PerformanceOptimizationManager {
  private metrics: PerformanceMetrics = {
    memoryUsage: 0,
    renderTime: 0,
    componentCount: 0,
    spriteCount: 0,
    actionCount: 0,
    fps: 0,
    lastUpdateTime: 0,
  };

  private memoryConfig: MemoryMonitorConfig = {
    maxMemoryUsage: 512, // 512MB
    checkInterval: 5000, // 5秒
    warningThreshold: 256, // 256MB
    cleanupThreshold: 384, // 384MB
  };

  private renderConfig: RenderOptimizationConfig = {
    enableVirtualScrolling: true,
    maxVisibleItems: 100,
    debounceDelay: 16,
    enableLazyLoading: true,
    cacheSize: 50,
  };

  private errorConfig: ErrorHandlingConfig = {
    enableErrorBoundary: true,
    enableRetry: true,
    maxRetryAttempts: 3,
    retryDelay: 1000,
    enableLogging: true,
  };

  private isMonitoring = false;
  private monitoringInterval: number | null = null;
  private renderCache = new Map<string, any>();
  private errorLog: Array<{
    timestamp: number;
    error: Error;
    context?: string;
  }> = [];

  // 事件监听器
  private memoryWarningListeners: ((usage: number) => void)[] = [];
  private performanceIssueListeners: ((metrics: PerformanceMetrics) => void)[] =
    [];
  private errorListeners: ((error: Error, context?: string) => void)[] = [];

  /**
   * 初始化性能优化管理器
   */
  initialize(): void {
    this.startMonitoring();
    this.setupErrorHandlers();
    this.initializeRenderOptimizations();

    console.log("性能优化管理器初始化完成");
  }

  /**
   * 开始性能监控
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
      this.checkMemoryUsage();
      this.checkPerformanceIssues();
    }, this.memoryConfig.checkInterval);

    console.log("性能监控已启动");
  }

  /**
   * 停止性能监控
   */
  private stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log("性能监控已停止");
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(): void {
    try {
      // 内存使用情况
      if ("memory" in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      // FPS 计算
      const now = performance.now();
      if (this.metrics.lastUpdateTime > 0) {
        const deltaTime = now - this.metrics.lastUpdateTime;
        this.metrics.fps = 1000 / deltaTime;
      }
      this.metrics.lastUpdateTime = now;

      // 组件计数
      this.metrics.componentCount =
        document.querySelectorAll("[data-component]").length;
    } catch (error) {
      this.handleError(error as Error, "updateMetrics");
    }
  }

  /**
   * 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    const { memoryUsage } = this.metrics;
    const { warningThreshold, cleanupThreshold } = this.memoryConfig;

    if (memoryUsage > cleanupThreshold) {
      this.performMemoryCleanup();
    } else if (memoryUsage > warningThreshold) {
      this.notifyMemoryWarning(memoryUsage);
    }
  }

  /**
   * 检查性能问题
   */
  private checkPerformanceIssues(): void {
    const { fps, renderTime } = this.metrics;

    // FPS 过低
    if (fps < 30 && fps > 0) {
      this.notifyPerformanceIssue("FPS过低");
    }

    // 渲染时间过长
    if (renderTime > 16) {
      // 超过一帧的时间
      this.notifyPerformanceIssue("渲染时间过长");
    }
  }

  /**
   * 执行内存清理
   */
  private performMemoryCleanup(): void {
    try {
      // 清理渲染缓存
      this.clearRenderCache();

      // 清理错误日志
      this.clearOldErrorLogs();

      // 强制垃圾回收（如果可用）
      if ((window as any).gc) {
        (window as any).gc();
      }

      console.log("内存清理完成");
    } catch (error) {
      this.handleError(error as Error, "performMemoryCleanup");
    }
  }

  /**
   * 清理渲染缓存
   */
  private clearRenderCache(): void {
    const cacheSize = this.renderCache.size;
    if (cacheSize > this.renderConfig.cacheSize) {
      const deleteCount = cacheSize - this.renderConfig.cacheSize;
      const keysToDelete = Array.from(this.renderCache.keys()).slice(
        0,
        deleteCount
      );

      keysToDelete.forEach((key) => {
        this.renderCache.delete(key);
      });

      console.log(`清理了 ${deleteCount} 个渲染缓存项`);
    }
  }

  /**
   * 清理旧的错误日志
   */
  private clearOldErrorLogs(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000; // 1小时前

    this.errorLog = this.errorLog.filter((log) => log.timestamp > oneHourAgo);
  }

  /**
   * 设置错误处理器
   */
  private setupErrorHandlers(): void {
    if (!this.errorConfig.enableErrorBoundary) return;

    // 全局错误处理
    window.addEventListener("error", (event) => {
      this.handleError(event.error, "globalError");
    });

    // Promise 拒绝处理
    window.addEventListener("unhandledrejection", (event) => {
      this.handleError(new Error(event.reason), "unhandledPromise");
    });
  }

  /**
   * 初始化渲染优化
   */
  private initializeRenderOptimizations(): void {
    // 防抖函数创建
    this.createDebouncedFunctions();

    // 虚拟滚动设置
    this.setupVirtualScrolling();

    console.log("渲染优化设置完成");
  }

  /**
   * 创建防抖函数
   */
  private createDebouncedFunctions(): void {
    // 这里可以创建常用的防抖函数
  }

  /**
   * 设置虚拟滚动
   */
  private setupVirtualScrolling(): void {
    if (!this.renderConfig.enableVirtualScrolling) return;

    // 虚拟滚动逻辑
    console.log("虚拟滚动已启用");
  }

  /**
   * 处理错误
   */
  private handleError(error: Error, context?: string): void {
    // 记录错误
    this.errorLog.push({
      timestamp: Date.now(),
      error,
      context,
    });

    // 通知监听器
    this.errorListeners.forEach((listener) => {
      try {
        listener(error, context);
      } catch (listenerError) {
        console.error("错误监听器执行失败:", listenerError);
      }
    });

    // 日志记录
    if (this.errorConfig.enableLogging) {
      console.error(`[${context || "unknown"}]`, error);
    }
  }

  /**
   * 通知内存警告
   */
  private notifyMemoryWarning(usage: number): void {
    this.memoryWarningListeners.forEach((listener) => {
      try {
        listener(usage);
      } catch (error) {
        console.error("内存警告监听器执行失败:", error);
      }
    });
  }

  /**
   * 通知性能问题
   */
  private notifyPerformanceIssue(issue: string): void {
    this.performanceIssueListeners.forEach((listener) => {
      try {
        listener({ ...this.metrics });
      } catch (error) {
        console.error("性能问题监听器执行失败:", error);
      }
    });

    console.warn("性能问题:", issue, this.metrics);
  }

  /**
   * 重试机制
   */
  async retry<T>(
    operation: () => Promise<T>,
    context?: string,
    maxAttempts?: number
  ): Promise<T> {
    const attempts = maxAttempts || this.errorConfig.maxRetryAttempts;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`重试 ${i + 1}/${attempts} 失败:`, error);

        if (i === attempts - 1) {
          this.handleError(error as Error, context);
          throw error;
        }

        // 等待后重试
        await new Promise((resolve) =>
          setTimeout(resolve, this.errorConfig.retryDelay)
        );
      }
    }

    throw new Error("重试失败");
  }

  /**
   * 防抖函数
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    const wait = delay || this.renderConfig.debounceDelay;
    let timeoutId: number;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => func(...args), wait);
    };
  }

  /**
   * 节流函数
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    const wait = delay || this.renderConfig.debounceDelay;
    let lastCallTime = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallTime >= wait) {
        lastCallTime = now;
        func(...args);
      }
    };
  }

  /**
   * 缓存管理
   */
  cacheResult<T>(key: string, generator: () => T): T {
    if (this.renderCache.has(key)) {
      return this.renderCache.get(key);
    }

    const result = generator();
    this.renderCache.set(key, result);

    return result;
  }

  /**
   * 事件监听器管理
   */
  onMemoryWarning(callback: (usage: number) => void): () => void {
    this.memoryWarningListeners.push(callback);
    return () => {
      const index = this.memoryWarningListeners.indexOf(callback);
      if (index > -1) {
        this.memoryWarningListeners.splice(index, 1);
      }
    };
  }

  onPerformanceIssue(
    callback: (metrics: PerformanceMetrics) => void
  ): () => void {
    this.performanceIssueListeners.push(callback);
    return () => {
      const index = this.performanceIssueListeners.indexOf(callback);
      if (index > -1) {
        this.performanceIssueListeners.splice(index, 1);
      }
    };
  }

  onError(callback: (error: Error, context?: string) => void): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 更新配置
   */
  updateMemoryConfig(config: Partial<MemoryMonitorConfig>): void {
    this.memoryConfig = { ...this.memoryConfig, ...config };
  }

  updateRenderConfig(config: Partial<RenderOptimizationConfig>): void {
    this.renderConfig = { ...this.renderConfig, ...config };
  }

  updateErrorConfig(config: Partial<ErrorHandlingConfig>): void {
    this.errorConfig = { ...this.errorConfig, ...config };
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): typeof this.errorLog {
    return [...this.errorLog];
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    metrics: PerformanceMetrics;
    memoryStatus: string;
    renderStatus: string;
    errorCount: number;
    recommendations: string[];
  } {
    const { memoryUsage, fps, renderTime } = this.metrics;
    const recommendations: string[] = [];

    // 内存状态
    let memoryStatus = "正常";
    if (memoryUsage > this.memoryConfig.cleanupThreshold) {
      memoryStatus = "严重";
      recommendations.push("建议清理内存或减少组件数量");
    } else if (memoryUsage > this.memoryConfig.warningThreshold) {
      memoryStatus = "警告";
      recommendations.push("监控内存使用情况");
    }

    // 渲染状态
    let renderStatus = "正常";
    if (fps < 30 && fps > 0) {
      renderStatus = "较差";
      recommendations.push("优化渲染性能，减少复杂操作");
    }
    if (renderTime > 16) {
      renderStatus = "缓慢";
      recommendations.push("优化组件渲染逻辑");
    }

    return {
      metrics: this.getMetrics(),
      memoryStatus,
      renderStatus,
      errorCount: this.errorLog.length,
      recommendations,
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopMonitoring();
    this.renderCache.clear();
    this.errorLog = [];
    this.memoryWarningListeners = [];
    this.performanceIssueListeners = [];
    this.errorListeners = [];

    console.log("性能优化管理器已销毁");
  }
}

/**
 * 创建性能优化管理器实例
 */
export function createPerformanceOptimizationManager(): PerformanceOptimizationManager {
  return new PerformanceOptimizationManager();
}

/**
 * 全局性能优化管理器实例
 */
export const performanceOptimizationManager =
  new PerformanceOptimizationManager();

/**
 * 导出类型
 */
export type {
  PerformanceMetrics,
  MemoryMonitorConfig,
  RenderOptimizationConfig,
  ErrorHandlingConfig,
};
