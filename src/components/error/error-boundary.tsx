'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * 错误边界组件
 * 捕获子组件中的JavaScript错误，记录错误并显示友好的备用UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新状态以显示备用UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误处理回调
    this.props.onError?.(error, errorInfo);

    // 这里可以将错误发送到错误报告服务
    this.reportError(error, errorInfo);
  }

  /**
   * 报告错误到监控服务
   */
  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // 这里可以集成错误监控服务，如 Sentry, LogRocket 等
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      console.log('Error report:', errorReport);
      
      // 示例：发送到监控服务
      // fetch('/api/error-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  /**
   * 重置错误状态
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * 刷新页面
   */
  private handleRefresh = () => {
    window.location.reload();
  };

  /**
   * 返回首页
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * 复制错误信息
   */
  private handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const errorText = `
错误信息: ${error?.message}
错误堆栈: ${error?.stack}
组件堆栈: ${errorInfo?.componentStack}
时间: ${new Date().toISOString()}
用户代理: ${navigator.userAgent}
页面URL: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      toast.success('错误信息已复制到剪贴板');
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 如果提供了自定义备用UI，使用它
      if (fallback) {
        return fallback;
      }

      // 默认错误UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-xl">出现了一个错误</CardTitle>
              <CardDescription>
                很抱歉，应用程序遇到了一个意外错误。我们已经记录了这个问题。
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* 错误信息 */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center">
                  <Bug className="h-4 w-4 mr-2" />
                  错误详情
                </h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <div>
                    <strong>错误消息:</strong> {error?.message}
                  </div>
                  {process.env.NODE_ENV === 'development' && (
                    <>
                      <div>
                        <strong>错误堆栈:</strong>
                        <pre className="mt-1 text-xs bg-background p-2 rounded overflow-auto max-h-32">
                          {error?.stack}
                        </pre>
                      </div>
                      {errorInfo?.componentStack && (
                        <div>
                          <strong>组件堆栈:</strong>
                          <pre className="mt-1 text-xs bg-background p-2 rounded overflow-auto max-h-32">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleRefresh}
                  className="flex-1"
                >
                  刷新页面
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </div>

              {/* 开发环境下的额外操作 */}
              {process.env.NODE_ENV === 'development' && (
                <div className="pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={this.handleCopyError}
                    className="w-full"
                  >
                    复制错误信息
                  </Button>
                </div>
              )}

              {/* 帮助信息 */}
              <div className="text-xs text-muted-foreground text-center pt-2">
                如果问题持续存在，请联系技术支持。
                <br />
                错误ID: {Date.now().toString(36)}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * 带有错误边界的包装组件
 */
interface WithErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function WithErrorBoundary({ children, fallback, onError }: WithErrorBoundaryProps) {
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * HOC: 为组件添加错误边界
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}