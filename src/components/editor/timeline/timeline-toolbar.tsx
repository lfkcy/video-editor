'use client';

import React from 'react';
import { 
  MousePointer, 
  Scissors, 
  Copy, 
  Trash2, 
  Undo, 
  Redo,
  ZoomIn,
  ZoomOut,
  Grid,
  Move,
} from 'lucide-react';
import { useTimelineStore, useHistoryStore } from '@/stores';
import { useTimelineInteraction } from '@/hooks/use-timeline-interaction';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 时间轴工具栏组件
 */
export function TimelineToolbar() {
  const {
    scale,
    snapToGrid,
    selectedClips,
    activeTool,
    setActiveTool,
    setScale,
    setSnapToGrid,
    zoomIn,
    zoomOut,
    zoomToFit,
  } = useTimelineStore();
  
  const {
    canUndo,
    canRedo,
    undo,
    redo,
  } = useHistoryStore();
  
  const {
    splitAtPlayhead,
    deleteSelectedClips,
    duplicateSelectedClips,
    selectAllClips,
  } = useTimelineInteraction();

  const tools = [
    {
      id: 'select',
      icon: MousePointer,
      label: '选择工具',
      shortcut: 'V',
    },
    {
      id: 'razor',
      icon: Scissors,
      label: '分割工具',
      shortcut: 'C',
    },
    {
      id: 'hand',
      icon: Move,
      label: '移动工具',
      shortcut: 'H',
    },
  ];

  const handleToolChange = (toolId: string) => {
    setActiveTool(toolId as any);
  };

  const handleUndo = () => {
    const action = undo();
    if (action) {
      console.log('Undoing:', action.description);
    }
  };

  const handleRedo = () => {
    const action = redo();
    if (action) {
      console.log('Redoing:', action.description);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-2 bg-muted/30 border-b border-border">
      {/* 工具选择 */}
      <div className="flex items-center space-x-1 border-r border-border pr-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleToolChange(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className="h-8 w-8 p-0"
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>

      {/* 撤销重做 */}
      <div className="flex items-center space-x-1 border-r border-border pr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUndo}
          disabled={!canUndo()}
          title="撤销 (Ctrl+Z)"
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRedo}
          disabled={!canRedo()}
          title="重做 (Ctrl+Y)"
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* 编辑操作 */}
      <div className="flex items-center space-x-1 border-r border-border pr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={splitAtPlayhead}
          title="在播放头位置分割 (S)"
          className="h-8 w-8 p-0"
        >
          <Scissors className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={duplicateSelectedClips}
          disabled={selectedClips.length === 0}
          title="复制选中片段 (Ctrl+D)"
          className="h-8 w-8 p-0"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={deleteSelectedClips}
          disabled={selectedClips.length === 0}
          title="删除选中片段 (Delete)"
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* 缩放控制 */}
      <div className="flex items-center space-x-1 border-r border-border pr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomOut}
          title="缩小 (Ctrl+-)"
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground min-w-12 text-center">
          {Math.round(scale * 100)}%
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomIn}
          title="放大 (Ctrl++)"
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomToFit}
          title="适应窗口 (Ctrl+0)"
          className="text-xs px-2 h-8"
        >
          适应
        </Button>
      </div>

      {/* 网格对齐 */}
      <div className="flex items-center space-x-1">
        <Button
          variant={snapToGrid ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSnapToGrid(!snapToGrid)}
          title="网格对齐"
          className="h-8 w-8 p-0"
        >
          <Grid className="h-4 w-4" />
        </Button>
      </div>

      {/* 状态信息 */}
      <div className="ml-auto flex items-center space-x-4 text-xs text-muted-foreground">
        {selectedClips.length > 0 && (
          <span>已选择 {selectedClips.length} 个片段</span>
        )}
        <span>网格: {snapToGrid ? '开启' : '关闭'}</span>
      </div>
    </div>
  );
}