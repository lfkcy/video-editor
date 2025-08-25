'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * 性能监控类型
 */
interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  storage: {
    used: number;
    available: number;
    percentage: number;
  };
  network: {
    online: boolean;
    speed: 'fast' | 'slow' | 'offline';
  };
}

/**
 * 状态反馈组件
 */
export function StatusFeedback() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: { used: 0, total: 0, percentage: 0 },
    cpu: { usage: 0 },
    storage: { used: 0, available: 0, percentage: 0 },
    network: { online: true, speed: 'fast' },
  });

  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [showDetails, setShowDetails] = useState(false);

  // 模拟性能监控
  useEffect(() => {
    const updateMetrics = () => {
      // 检查网络状态
      const online = navigator.onLine;
      
      // 模拟性能数据（在真实应用中应该使用实际的API）
      const newMetrics: PerformanceMetrics = {
        memory: {
          used: Math.random() * 1000,
          total: 2000,
          percentage: Math.random() * 80 + 10,
        },
        cpu: {
          usage: Math.random() * 60 + 10,
        },
        storage: {
          used: Math.random() * 5000,
          available: 10000,
          percentage: Math.random() * 70 + 10,
        },
        network: {
          online,
          speed: online ? (Math.random() > 0.8 ? 'slow' : 'fast') : 'offline',
        },
      };

      // 检查内存使用情况
      if ((performance as any).memory) {
        const memInfo = (performance as any).memory;
        newMetrics.memory = {
          used: memInfo.usedJSHeapSize / 1024 / 1024,
          total: memInfo.totalJSHeapSize / 1024 / 1024,
          percentage: (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100,
        };
      }

      setMetrics(newMetrics);
      setLastUpdateTime(Date.now());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, []);

  // 获取状态颜色
  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  // 获取网络状态图标
  const getNetworkIcon = () => {
    if (!metrics.network.online) {
      return <WifiOff className="h-3 w-3 text-red-500" />;
    }
    return <Wifi className={cn("h-3 w-3", metrics.network.speed === 'slow' ? 'text-yellow-500' : 'text-green-500')} />;
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return `${Math.floor(diff / 3600000)}小时前`;
  };

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          {/* 网络状态 */}
          {getNetworkIcon()}
          
          {/* 内存使用情况 */}
          <div className="flex items-center space-x-1">
            <MemoryStick className={cn("h-3 w-3", getStatusColor(metrics.memory.percentage))} />
            <span>{Math.round(metrics.memory.percentage)}%</span>
          </div>

          {/* CPU使用情况 */}
          <div className="flex items-center space-x-1">
            <Cpu className={cn("h-3 w-3", getStatusColor(metrics.cpu.usage))} />
            <span>{Math.round(metrics.cpu.usage)}%</span>
          </div>

          {/* 状态指示器 */}
          <div className="flex items-center space-x-1">
            {metrics.network.online ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-red-500" />
            )}
            <span className="hidden sm:inline">
              {metrics.network.online ? '正常' : '离线'}
            </span>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">系统状态</h4>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(lastUpdateTime)}
            </Badge>
          </div>

          {/* 网络状态 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getNetworkIcon()}
                <span className="text-sm font-medium">网络</span>
              </div>
              <Badge variant={metrics.network.online ? "default" : "destructive"}>
                {metrics.network.online ? 
                  (metrics.network.speed === 'fast' ? '快速' : '缓慢') : '离线'}
              </Badge>
            </div>
          </div>

          {/* 内存使用 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MemoryStick className="h-4 w-4" />
                <span className="text-sm font-medium">内存</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatBytes(metrics.memory.used * 1024 * 1024)} / {formatBytes(metrics.memory.total * 1024 * 1024)}
              </span>
            </div>
            <Progress value={metrics.memory.percentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {Math.round(metrics.memory.percentage)}% 已使用
            </div>
          </div>

          {/* CPU使用 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4" />
                <span className="text-sm font-medium">处理器</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(metrics.cpu.usage)}%
              </span>
            </div>
            <Progress value={metrics.cpu.usage} className="h-2" />
          </div>

          {/* 存储空间 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4" />
                <span className="text-sm font-medium">存储</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatBytes(metrics.storage.used * 1024 * 1024)} / {formatBytes(metrics.storage.available * 1024 * 1024)}
              </span>
            </div>
            <Progress value={metrics.storage.percentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {Math.round(metrics.storage.percentage)}% 已使用
            </div>
          </div>

          {/* 性能建议 */}
          <div className="border-t pt-3">
            <h5 className="text-sm font-medium mb-2">性能建议</h5>
            <div className="space-y-1 text-xs text-muted-foreground">
              {metrics.memory.percentage > 80 && (
                <div className="flex items-center space-x-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>内存使用过高，建议关闭不必要的应用</span>
                </div>
              )}
              {metrics.cpu.usage > 80 && (
                <div className="flex items-center space-x-1 text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>CPU使用过高，可能影响编辑性能</span>
                </div>
              )}
              {!metrics.network.online && (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>网络连接断开，某些功能可能不可用</span>
                </div>
              )}
              {metrics.memory.percentage < 50 && metrics.cpu.usage < 50 && metrics.network.online && (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>系统运行状态良好</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}