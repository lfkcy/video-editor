import React from 'react';

/**
 * 性能监控服务
 * 监控应用性能指标并提供优化建议
 */

/**
 * 性能指标类型
 */
export interface PerformanceMetrics {
  // 页面加载性能
  loadTime: number;
  domContentLoadedTime: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  
  // 交互性能
  firstInputDelay?: number;
  totalBlockingTime?: number;
  
  // 内存使用
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  
  // 自定义指标
  videoLoadTime?: number;
  timelineRenderTime?: number;
  exportTime?: number;
  
  // 错误统计
  errorCount: number;
  errorRate: number;
}

/**
 * 性能阈值
 */
const PERFORMANCE_THRESHOLDS = {
  loadTime: 3000, // 3秒
  firstContentfulPaint: 1800, // 1.8秒
  largestContentfulPaint: 2500, // 2.5秒
  firstInputDelay: 100, // 100毫秒
  totalBlockingTime: 300, // 300毫秒
  memoryUsagePercentage: 80, // 80%
  errorRate: 0.05, // 5%
};

/**
 * 性能监控类
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private startTime = performance.now();
  private errorCount = 0;
  private totalRequests = 0;

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 初始化性能监控
   */
  private initializeMonitoring() {
    // 监控页面加载性能
    this.measurePageLoad();
    
    // 监控Core Web Vitals
    this.measureWebVitals();
    
    // 监控内存使用
    this.measureMemoryUsage();
    
    // 监控错误
    this.monitorErrors();
    
    // 定期收集指标
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // 每30秒收集一次
  }

  /**
   * 测量页面加载性能
   */
  private measurePageLoad() {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      this.metrics.loadTime = navigation.loadEventEnd - navigation.navigationStart;
      this.metrics.domContentLoadedTime = navigation.domContentLoadedEventEnd - navigation.navigationStart;
    });
  }

  /**
   * 测量Core Web Vitals
   */
  private measureWebVitals() {
    try {
      // First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.firstContentfulPaint = fcpEntry.startTime;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);

      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  /**
   * 测量内存使用
   */
  private measureMemoryUsage() {
    if ((performance as any).memory) {
      const updateMemory = () => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
      };

      updateMemory();
      setInterval(updateMemory, 5000); // 每5秒更新内存信息
    }
  }

  /**
   * 监控错误
   */
  private monitorErrors() {
    window.addEventListener('error', (event) => {
      this.errorCount++;
      this.updateErrorRate();
      
      console.error('Performance Monitor - JavaScript Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.errorCount++;
      this.updateErrorRate();
      
      console.error('Performance Monitor - Unhandled Promise Rejection:', event.reason);
    });
  }

  /**
   * 更新错误率
   */
  private updateErrorRate() {
    this.totalRequests++;
    this.metrics.errorCount = this.errorCount;
    this.metrics.errorRate = this.errorCount / this.totalRequests;
  }

  /**
   * 测量自定义指标
   */
  public measureCustomMetric(name: keyof PerformanceMetrics, value: number) {
    this.metrics[name] = value as any;
  }

  /**
   * 开始计时
   */
  public startTiming(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.measureCustomMetric(name as keyof PerformanceMetrics, duration);
      return duration;
    };
  }

  /**
   * 收集当前指标
   */
  private collectMetrics() {
    // 计算应用运行时间
    const runTime = performance.now() - this.startTime;
    
    // 记录当前指标
    const currentMetrics = { ...this.metrics, runTime };
    
    // 分析性能并给出建议
    const analysis = this.analyzePerformance(currentMetrics);
    
    // 在开发环境下输出性能信息
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.table(currentMetrics);
      console.log('Analysis:', analysis);
      console.groupEnd();
    }
  }

  /**
   * 分析性能并给出建议
   */
  private analyzePerformance(metrics: Partial<PerformanceMetrics>) {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // 检查加载时间
    if (metrics.loadTime && metrics.loadTime > PERFORMANCE_THRESHOLDS.loadTime) {
      issues.push('页面加载时间过长');
      suggestions.push('优化资源加载、使用代码分割、启用缓存');
    }

    // 检查First Contentful Paint
    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > PERFORMANCE_THRESHOLDS.firstContentfulPaint) {
      issues.push('首次内容绘制时间过长');
      suggestions.push('优化关键渲染路径、减少渲染阻塞资源');
    }

    // 检查内存使用
    if (metrics.memoryUsage) {
      const memoryPercentage = (metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.jsHeapSizeLimit) * 100;
      if (memoryPercentage > PERFORMANCE_THRESHOLDS.memoryUsagePercentage) {
        issues.push('内存使用率过高');
        suggestions.push('检查内存泄漏、优化大型对象的使用、及时清理不必要的引用');
      }
    }

    // 检查错误率
    if (metrics.errorRate && metrics.errorRate > PERFORMANCE_THRESHOLDS.errorRate) {
      issues.push('错误率过高');
      suggestions.push('修复错误、添加错误边界、改善错误处理');
    }

    return {
      score: this.calculatePerformanceScore(metrics),
      issues,
      suggestions,
      status: issues.length === 0 ? 'good' : issues.length <= 2 ? 'warning' : 'critical',
    };
  }

  /**
   * 计算性能分数
   */
  private calculatePerformanceScore(metrics: Partial<PerformanceMetrics>): number {
    let score = 100;

    // 根据各项指标扣分
    if (metrics.loadTime && metrics.loadTime > PERFORMANCE_THRESHOLDS.loadTime) {
      score -= 20;
    }

    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > PERFORMANCE_THRESHOLDS.firstContentfulPaint) {
      score -= 15;
    }

    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > PERFORMANCE_THRESHOLDS.largestContentfulPaint) {
      score -= 15;
    }

    if (metrics.firstInputDelay && metrics.firstInputDelay > PERFORMANCE_THRESHOLDS.firstInputDelay) {
      score -= 10;
    }

    if (metrics.memoryUsage) {
      const memoryPercentage = (metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.jsHeapSizeLimit) * 100;
      if (memoryPercentage > PERFORMANCE_THRESHOLDS.memoryUsagePercentage) {
        score -= 20;
      }
    }

    if (metrics.errorRate && metrics.errorRate > PERFORMANCE_THRESHOLDS.errorRate) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * 获取当前指标
   */
  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * 获取性能报告
   */
  public getPerformanceReport() {
    const metrics = this.getMetrics();
    const analysis = this.analyzePerformance(metrics);
    
    return {
      metrics,
      analysis,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
  }

  /**
   * 销毁监控器
   */
  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// 创建单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * React Hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = React.useState<Partial<PerformanceMetrics>>({});
  const [analysis, setAnalysis] = React.useState<any>(null);

  React.useEffect(() => {
    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getMetrics();
      const report = performanceMonitor.getPerformanceReport();
      
      setMetrics(currentMetrics);
      setAnalysis(report.analysis);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 10000); // 每10秒更新

    return () => clearInterval(interval);
  }, []);

  const measureTiming = React.useCallback((name: string) => {
    return performanceMonitor.startTiming(name);
  }, []);

  const measureCustomMetric = React.useCallback((name: keyof PerformanceMetrics, value: number) => {
    performanceMonitor.measureCustomMetric(name, value);
  }, []);

  return {
    metrics,
    analysis,
    measureTiming,
    measureCustomMetric,
    getReport: () => performanceMonitor.getPerformanceReport(),
  };
}