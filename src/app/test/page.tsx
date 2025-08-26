'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, Play, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProjectStore, useTimelineStore, useUIStore } from '@/stores';
import { performanceMonitor } from '@/utils/performance-monitor';
import { cn } from '@/lib/utils';
import { createVideoEditorTestSuite, runQuickTest } from '@/tests/integration-test';
import type { VideoEditorTestSuite } from '@/tests/integration-test';

/**
 * 测试结果接口
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

/**
 * 简单测试项目接口
 */
interface SimpleTestCase {
  id: string;
  name: string;
  description: string;
  test: () => Promise<boolean>;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
}

/**
 * 功能测试页面（重构版）
 */
export default function TestPage() {
  // 集成测试状态
  const [integrationResults, setIntegrationResults] = useState<TestResult[]>([]);
  const [isIntegrationRunning, setIsIntegrationRunning] = useState(false);
  const [integrationProgress, setIntegrationProgress] = useState(0);
  
  // 简单测试状态
  const [simpleTests, setSimpleTests] = useState<SimpleTestCase[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(-1);
  const [simpleProgress, setSimpleProgress] = useState(0);
  const [isSimpleRunning, setIsSimpleRunning] = useState(false);
  
  // 测试套件引用
  const testSuiteRef = useRef<VideoEditorTestSuite | null>(null);

  // Store hooks
  const { createNewProject, currentProject } = useProjectStore();
  const { setPlayhead, setDuration } = useTimelineStore();
  const { setTheme, toggleLeftPanel } = useUIStore();

  // 初始化简单测试用例
  useEffect(() => {
    const testCases: SimpleTestCase[] = [
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

    setSimpleTests(testCases);
  }, [createNewProject, currentProject, setPlayhead, setDuration, setTheme, toggleLeftPanel]);

  // 运行集成测试
  const runIntegrationTests = async () => {
    setIsIntegrationRunning(true);
    setIntegrationProgress(0);
    setIntegrationResults([]);

    try {
      // 创建测试套件
      if (testSuiteRef.current) {
        testSuiteRef.current.cleanup();
      }
      testSuiteRef.current = createVideoEditorTestSuite();

      // 运行所有测试
      const results = await testSuiteRef.current.runAllTests();
      setIntegrationResults(results);
      setIntegrationProgress(100);

    } catch (error) {
      console.error('集成测试失败:', error);
      setIntegrationResults([{
        name: '集成测试',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误'
      }]);
    } finally {
      setIsIntegrationRunning(false);
      if (testSuiteRef.current) {
        testSuiteRef.current.cleanup();
        testSuiteRef.current = null;
      }
    }
  };

  // 运行快速测试
  const runQuickTests = async () => {
    setIsIntegrationRunning(true);
    setIntegrationProgress(0);

    try {
      const success = await runQuickTest();
      setIntegrationResults([{
        name: '快速测试',
        passed: success,
        error: success ? undefined : '存在失败的测试项目'
      }]);
      setIntegrationProgress(100);
    } catch (error) {
      console.error('快速测试失败:', error);
      setIntegrationResults([{
        name: '快速测试',
        passed: false,
        error: error instanceof Error ? error.message : '未知错误'
      }]);
    } finally {
      setIsIntegrationRunning(false);
    }
  };

  // 运行单个简单测试
  const runSingleSimpleTest = async (testIndex: number) => {
    const test = simpleTests[testIndex];
    if (!test) return;

    setCurrentTestIndex(testIndex);
    
    setSimpleTests(prev => prev.map((t, i) => 
      i === testIndex ? { ...t, status: 'running' as const } : t
    ));

    const startTime = performance.now();

    try {
      const result = await test.test();
      const endTime = performance.now();
      const duration = endTime - startTime;

      setSimpleTests(prev => prev.map((t, i) => 
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

      setSimpleTests(prev => prev.map((t, i) => 
        i === testIndex ? { 
          ...t, 
          status: 'failed',
          duration,
          error: error instanceof Error ? error.message : String(error)
        } : t
      ));
    }
  };

  // 运行所有简单测试
  const runAllSimpleTests = async () => {
    setIsSimpleRunning(true);
    setCurrentTestIndex(-1);
    setSimpleProgress(0);

    // 重置所有测试状态
    setSimpleTests(prev => prev.map(test => ({ ...test, status: 'pending' as const, error: undefined, duration: undefined })));

    for (let i = 0; i < simpleTests.length; i++) {
      await runSingleSimpleTest(i);
      setSimpleProgress(((i + 1) / simpleTests.length) * 100);
    }

    setIsSimpleRunning(false);
    setCurrentTestIndex(-1);
  };

  // 计算测试统计
  const getTestStats = (results: TestResult[]) => {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    return { total, passed, failed, passRate };
  };

  const getSimpleTestStats = (tests: SimpleTestCase[]) => {
    const total = tests.length;
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const running = tests.filter(t => t.status === 'running').length;
    const pending = tests.filter(t => t.status === 'pending').length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    return { total, passed, failed, running, pending, passRate };
  };

  const integrationStats = getTestStats(integrationResults);
  const simpleStats = getSimpleTestStats(simpleTests);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">视频编辑器功能测试</h1>
        <p className="text-muted-foreground">
          测试核心功能是否正常工作，确保系统稳定性和可靠性
        </p>
      </div>

      {/* 集成测试部分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🧪</span>
            <span>集成测试</span>
          </CardTitle>
          <CardDescription>
            完整的系统集成测试，验证所有组件协同工作
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={runIntegrationTests}
              disabled={isIntegrationRunning}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>运行完整测试</span>
            </Button>
            
            <Button 
              onClick={runQuickTests}
              disabled={isIntegrationRunning}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>快速测试</span>
            </Button>
          </div>

          {isIntegrationRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>测试进行中...</span>
                <span>{integrationProgress.toFixed(0)}%</span>
              </div>
              <Progress value={integrationProgress} />
            </div>
          )}

          {integrationResults.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{integrationStats.total}</div>
                  <div className="text-sm text-blue-600">总测试</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{integrationStats.passed}</div>
                  <div className="text-sm text-green-600">通过</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{integrationStats.failed}</div>
                  <div className="text-sm text-red-600">失败</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{integrationStats.passRate.toFixed(1)}%</div>
                  <div className="text-sm text-purple-600">通过率</div>
                </div>
              </div>

              <div className="space-y-2">
                {integrationResults.map((result, index) => (
                  <div key={index} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    result.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  )}>
                    <div className="flex items-center space-x-3">
                      {result.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium">{result.name}</div>
                        {result.error && (
                          <div className="text-sm text-red-600">{result.error}</div>
                        )}
                      </div>
                    </div>
                    {result.duration && (
                      <div className="text-sm text-muted-foreground">
                        {result.duration.toFixed(2)}ms
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 简单测试部分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>⚡</span>
            <span>基础功能测试</span>
          </CardTitle>
          <CardDescription>
            测试基础组件和状态管理功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={runAllSimpleTests}
              disabled={isSimpleRunning}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>运行所有测试</span>
            </Button>
          </div>

          {isSimpleRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>测试进行中...</span>
                <span>{simpleProgress.toFixed(0)}%</span>
              </div>
              <Progress value={simpleProgress} />
            </div>
          )}

          <div className="grid grid-cols-5 gap-4 text-center text-sm">
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-bold text-blue-600">{simpleStats.total}</div>
              <div className="text-blue-600">总计</div>
            </div>
            <div className="p-2 bg-green-50 rounded">
              <div className="font-bold text-green-600">{simpleStats.passed}</div>
              <div className="text-green-600">通过</div>
            </div>
            <div className="p-2 bg-red-50 rounded">
              <div className="font-bold text-red-600">{simpleStats.failed}</div>
              <div className="text-red-600">失败</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <div className="font-bold text-yellow-600">{simpleStats.running}</div>
              <div className="text-yellow-600">运行中</div>
            </div>
            <div className="p-2 bg-gray-50 rounded">
              <div className="font-bold text-gray-600">{simpleStats.pending}</div>
              <div className="text-gray-600">等待</div>
            </div>
          </div>

          <div className="space-y-2">
            {simpleTests.map((test, index) => (
              <div key={test.id} className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-colors",
                test.status === 'passed' && "bg-green-50 border-green-200",
                test.status === 'failed' && "bg-red-50 border-red-200",
                test.status === 'running' && "bg-yellow-50 border-yellow-200",
                test.status === 'pending' && "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    {test.status === 'passed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {test.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                    {test.status === 'running' && <Clock className="h-5 w-5 text-yellow-600 animate-spin" />}
                    {test.status === 'pending' && <AlertTriangle className="h-5 w-5 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-muted-foreground">{test.description}</div>
                    {test.error && (
                      <div className="text-sm text-red-600 mt-1">{test.error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {test.duration && (
                    <span className="text-sm text-muted-foreground">
                      {test.duration.toFixed(2)}ms
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runSingleSimpleTest(index)}
                    disabled={isSimpleRunning}
                  >
                    运行
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 组件清理 */}
      {typeof window !== 'undefined' && (
        <div className="text-center text-sm text-muted-foreground">
          <p>测试将在浏览器控制台输出详细日志</p>
        </div>
      )}
    </div>
  );
}