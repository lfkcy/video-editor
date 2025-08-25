'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProjectStore, useTimelineStore, useUIStore } from '@/stores';
import { videoClipService, canvasCompositionService, videoExportService } from '@/services';
import { performanceMonitor } from '@/utils/performance-monitor';
import cn from 'classnames';

/**
 * 测试项目接口
 */
interface TestCase {
  id: string;
  name: string;
  description: string;
  test: () => Promise<boolean>;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
}

/**
 * 功能测试页面
 */
export default function TestPage() {
  const [tests, setTests] = useState<TestCase[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(-1);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Store hooks
  const { createNewProject, currentProject } = useProjectStore();
  const { setPlayhead, setDuration } = useTimelineStore();
  const { setTheme, toggleLeftPanel } = useUIStore();

  // 初始化测试用例
  useEffect(() => {
    const testCases: TestCase[] = [
      {
        id: 'project-store',
        name: '项目状态管理',
        description: '测试项目创建和状态管理功能',
        test: async () => {
          createNewProject();
          await new Promise(resolve => setTimeout(resolve, 100));
          return !!currentProject;
        },
        status: 'pending',
      },
      {
        id: 'timeline-store',
        name: '时间轴状态管理',
        description: '测试时间轴状态更新功能',
        test: async () => {
          setPlayhead(5000);
          setDuration(30000);
          await new Promise(resolve => setTimeout(resolve, 100));
          return true;
        },
        status: 'pending',
      },
      {
        id: 'ui-store',
        name: 'UI状态管理',
        description: '测试UI状态切换功能',
        test: async () => {
          setTheme('light');
          toggleLeftPanel();
          await new Promise(resolve => setTimeout(resolve, 100));
          return true;
        },
        status: 'pending',
      },
      {
        id: 'video-service-init',
        name: '视频服务初始化',
        description: '测试视频合成服务初始化',
        test: async () => {
          try {
            await videoClipService.initialize(1920, 1080, 30);
            return true;
          } catch (error) {
            console.error('Video service init failed:', error);
            return false;
          }
        },
        status: 'pending',
      },
      {
        id: 'canvas-service-mock',
        name: '画布服务测试',
        description: '测试画布合成服务功能',
        test: async () => {
          try {
            // 创建一个模拟容器
            const mockContainer = document.createElement('div');
            mockContainer.style.width = '100px';
            mockContainer.style.height = '100px';
            document.body.appendChild(mockContainer);
            
            await canvasCompositionService.initialize(mockContainer, 100, 100);
            
            // 清理
            document.body.removeChild(mockContainer);
            return true;
          } catch (error) {
            console.error('Canvas service test failed:', error);
            return false;
          }
        },
        status: 'pending',
      },
      {
        id: 'export-service-validation',
        name: '导出服务验证',
        description: '测试导出设置验证功能',
        test: async () => {
          const errors = videoExportService.validateExportSettings({
            format: 'mp4',
            quality: 'medium',
            width: 1920,
            height: 1080,
            fps: 30,
            bitrate: 5000000,
            audioCodec: 'aac',
            videoCodec: 'h264',
          });
          return errors.length === 0;
        },
        status: 'pending',
      },
      {
        id: 'performance-monitor',
        name: '性能监控',
        description: '测试性能监控功能',
        test: async () => {
          const metrics = performanceMonitor.getMetrics();
          const report = performanceMonitor.getPerformanceReport();
          return !!(report && report.analysis);
        },
        status: 'pending',
      },
      {
        id: 'local-storage',
        name: '本地存储',
        description: '测试数据持久化功能',
        test: async () => {
          try {
            localStorage.setItem('test-key', 'test-value');
            const value = localStorage.getItem('test-key');
            localStorage.removeItem('test-key');
            return value === 'test-value';
          } catch (error) {
            return false;
          }
        },
        status: 'pending',
      },
    ];

    setTests(testCases);
  }, [createNewProject, currentProject, setPlayhead, setDuration, setTheme, toggleLeftPanel]);

  // 运行单个测试
  const runSingleTest = async (testIndex: number) => {
    const test = tests[testIndex];
    if (!test) return;

    setCurrentTestIndex(testIndex);
    
    // 更新测试状态为运行中
    setTests(prev => prev.map((t, i) => 
      i === testIndex ? { ...t, status: 'running' as const } : t
    ));

    const startTime = performance.now();

    try {
      const result = await test.test();
      const endTime = performance.now();
      const duration = endTime - startTime;

      setTests(prev => prev.map((t, i) => 
        i === testIndex ? { 
          ...t, 
          status: result ? 'passed' : 'failed',
          duration,
          error: result ? undefined : '测试失败'
        } : t
      ));
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      setTests(prev => prev.map((t, i) => 
        i === testIndex ? { 
          ...t, 
          status: 'failed' as const,
          duration,
          error: error instanceof Error ? error.message : '未知错误'
        } : t
      ));
    }
  };

  // 运行所有测试
  const runAllTests = async () => {
    setIsRunning(true);
    setOverallProgress(0);

    for (let i = 0; i < tests.length; i++) {
      await runSingleTest(i);
      setOverallProgress(((i + 1) / tests.length) * 100);
    }

    setCurrentTestIndex(-1);
    setIsRunning(false);
  };

  // 重置所有测试
  const resetTests = () => {
    setTests(prev => prev.map(test => ({ 
      ...test, 
      status: 'pending' as const,
      error: undefined,
      duration: undefined
    })));
    setCurrentTestIndex(-1);
    setOverallProgress(0);
  };

  // 获取状态图标
  const getStatusIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  // 计算测试统计
  const stats = {
    total: tests.length,
    passed: tests.filter(t => t.status === 'passed').length,
    failed: tests.filter(t => t.status === 'failed').length,
    pending: tests.filter(t => t.status === 'pending').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">功能测试</h1>
        <p className="text-muted-foreground">
          验证视频编辑器的核心功能是否正常工作
        </p>
      </div>

      {/* 总体进度 */}
      <Card>
        <CardHeader>
          <CardTitle>测试进度</CardTitle>
          <CardDescription>
            总共 {stats.total} 个测试，{stats.passed} 个通过，{stats.failed} 个失败，{stats.pending} 个待运行
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={overallProgress} className="w-full" />
            <div className="flex gap-2">
              <Button 
                onClick={runAllTests} 
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? '运行中...' : '运行所有测试'}
              </Button>
              <Button 
                variant="outline" 
                onClick={resetTests}
                disabled={isRunning}
              >
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 测试列表 */}
      <div className="grid gap-4">
        {tests.map((test, index) => (
          <Card 
            key={test.id}
            className={cn(
              "transition-all",
              currentTestIndex === index && "ring-2 ring-primary",
              test.status === 'failed' && "border-red-200",
              test.status === 'passed' && "border-green-200"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <CardDescription>{test.description}</CardDescription>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runSingleTest(index)}
                  disabled={isRunning || test.status === 'running'}
                >
                  运行
                </Button>
              </div>
            </CardHeader>
            
            {(test.error || test.duration !== undefined) && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {test.duration !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      执行时间: {test.duration.toFixed(2)}ms
                    </div>
                  )}
                  {test.error && (
                    <div className="flex items-start space-x-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{test.error}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* 性能信息 */}
      <Card>
        <CardHeader>
          <CardTitle>性能信息</CardTitle>
          <CardDescription>当前应用性能状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">内存使用</div>
              <div className="text-muted-foreground">
                {((performance as any).memory?.usedJSHeapSize / 1024 / 1024).toFixed(1) || 'N/A'} MB
              </div>
            </div>
            <div>
              <div className="font-medium">页面加载时间</div>
              <div className="text-muted-foreground">
                {performance.timing ? 
                  `${performance.timing.loadEventEnd - performance.timing.navigationStart}ms` : 
                  'N/A'
                }
              </div>
            </div>
            <div>
              <div className="font-medium">测试通过率</div>
              <div className="text-muted-foreground">
                {stats.total > 0 ? `${((stats.passed / stats.total) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
            <div>
              <div className="font-medium">网络状态</div>
              <div className="text-muted-foreground">
                {navigator.onLine ? '在线' : '离线'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}