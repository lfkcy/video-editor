'use client';

import React, { useState, useEffect } from 'react';
import { 
  PanelLeft, 
  PanelRight, 
  PanelBottom,
  Maximize2,
  Minimize2,
  Monitor,
  Tablet,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

/**
 * 屏幕尺寸类型
 */
type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'large';

/**
 * 布局预设
 */
interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  layout: {
    showLeftPanel: boolean;
    showRightPanel: boolean;
    showBottomPanel: boolean;
    leftPanelWidth: number;
    rightPanelWidth: number;
    bottomPanelHeight: number;
  };
  minScreenSize: ScreenSize;
}

/**
 * 响应式布局管理组件
 */
export function ResponsiveLayoutManager() {
  const {
    layout,
    setLeftPanelVisible,
    setRightPanelVisible,
    setBottomPanelVisible,
    setLeftPanelWidth,
    setRightPanelWidth,
    setBottomPanelHeight,
  } = useUIStore();

  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // 布局预设
  const layoutPresets: LayoutPreset[] = [
    {
      id: 'full',
      name: '完整布局',
      description: '显示所有面板，适合大屏幕',
      icon: Monitor,
      layout: {
        showLeftPanel: true,
        showRightPanel: true,
        showBottomPanel: true,
        leftPanelWidth: 320,
        rightPanelWidth: 320,
        bottomPanelHeight: 320,
      },
      minScreenSize: 'desktop',
    },
    {
      id: 'edit-focused',
      name: '编辑聚焦',
      description: '隐藏侧边栏，专注于时间轴编辑',
      icon: Maximize2,
      layout: {
        showLeftPanel: false,
        showRightPanel: false,
        showBottomPanel: true,
        leftPanelWidth: 280,
        rightPanelWidth: 280,
        bottomPanelHeight: 360,
      },
      minScreenSize: 'tablet',
    },
    {
      id: 'preview-focused',
      name: '预览聚焦',
      description: '隐藏时间轴，专注于视频预览',
      icon: PanelBottom,
      layout: {
        showLeftPanel: true,
        showRightPanel: true,
        showBottomPanel: false,
        leftPanelWidth: 280,
        rightPanelWidth: 280,
        bottomPanelHeight: 280,
      },
      minScreenSize: 'tablet',
    },
    {
      id: 'mobile',
      name: '移动布局',
      description: '适合小屏幕的简化布局',
      icon: Smartphone,
      layout: {
        showLeftPanel: false,
        showRightPanel: false,
        showBottomPanel: true,
        leftPanelWidth: 250,
        rightPanelWidth: 250,
        bottomPanelHeight: 250,
      },
      minScreenSize: 'mobile',
    },
  ];

  // 监听屏幕尺寸变化
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else if (width < 1440) {
        setScreenSize('desktop');
      } else {
        setScreenSize('large');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // 自动应用响应式布局
  useEffect(() => {
    const width = window.innerWidth;
    
    // 移动设备自动应用移动布局
    if (width < 768) {
      applyLayoutPreset('mobile');
    }
    // 平板设备隐藏侧边栏
    else if (width < 1024) {
      setLeftPanelVisible(false);
      setRightPanelVisible(false);
    }
  }, [screenSize]);

  // 应用布局预设
  const applyLayoutPreset = (presetId: string) => {
    const preset = layoutPresets.find(p => p.id === presetId);
    if (!preset) return;

    const { layout: presetLayout } = preset;
    
    setLeftPanelVisible(presetLayout.showLeftPanel);
    setRightPanelVisible(presetLayout.showRightPanel);
    setBottomPanelVisible(presetLayout.showBottomPanel);
    setLeftPanelWidth(presetLayout.leftPanelWidth);
    setRightPanelWidth(presetLayout.rightPanelWidth);
    setBottomPanelHeight(presetLayout.bottomPanelHeight);

    setShowLayoutMenu(false);
  };

  // 切换面板显示
  const togglePanel = (panel: 'left' | 'right' | 'bottom') => {
    switch (panel) {
      case 'left':
        setLeftPanelVisible(!layout.showLeftPanel);
        break;
      case 'right':
        setRightPanelVisible(!layout.showRightPanel);
        break;
      case 'bottom':
        setBottomPanelVisible(!layout.showBottomPanel);
        break;
    }
  };

  // 获取屏幕尺寸图标
  const getScreenSizeIcon = () => {
    switch (screenSize) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
      case 'large':
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // 获取可用的布局预设
  const getAvailablePresets = () => {
    const sizeOrder = ['mobile', 'tablet', 'desktop', 'large'];
    const currentSizeIndex = sizeOrder.indexOf(screenSize);
    
    return layoutPresets.filter(preset => {
      const presetSizeIndex = sizeOrder.indexOf(preset.minScreenSize);
      return presetSizeIndex <= currentSizeIndex;
    });
  };

  return (
    <div className="flex items-center space-x-1">
      {/* 面板切换按钮 */}
      <Button
        variant={layout.showLeftPanel ? "default" : "ghost"}
        size="icon"
        onClick={() => togglePanel('left')}
        className="h-7 w-7"
        title="切换左侧面板"
      >
        <PanelLeft className="h-3 w-3" />
      </Button>

      <Button
        variant={layout.showRightPanel ? "default" : "ghost"}
        size="icon"
        onClick={() => togglePanel('right')}
        className="h-7 w-7"
        title="切换右侧面板"
      >
        <PanelRight className="h-3 w-3" />
      </Button>

      <Button
        variant={layout.showBottomPanel ? "default" : "ghost"}
        size="icon"
        onClick={() => togglePanel('bottom')}
        className="h-7 w-7"
        title="切换底部面板"
      >
        <PanelBottom className="h-3 w-3" />
      </Button>

      {/* 布局预设菜单 */}
      <Popover open={showLayoutMenu} onOpenChange={setShowLayoutMenu}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="布局预设"
          >
            {getScreenSizeIcon()}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">布局预设</h4>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                {getScreenSizeIcon()}
                <span className="capitalize">{screenSize}</span>
              </div>
            </div>

            <div className="space-y-1">
              {getAvailablePresets().map((preset) => {
                const Icon = preset.icon;
                const isActive = 
                  layout.showLeftPanel === preset.layout.showLeftPanel &&
                  layout.showRightPanel === preset.layout.showRightPanel &&
                  layout.showBottomPanel === preset.layout.showBottomPanel;

                return (
                  <Button
                    key={preset.id}
                    variant={isActive ? "default" : "ghost"}
                    onClick={() => applyLayoutPreset(preset.id)}
                    className="w-full justify-start h-auto p-3"
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {preset.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* 当前屏幕信息 */}
            <div className="border-t pt-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>屏幕宽度:</span>
                <span>{window.innerWidth}px</span>
              </div>
              <div className="flex items-center justify-between">
                <span>屏幕高度:</span>
                <span>{window.innerHeight}px</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}