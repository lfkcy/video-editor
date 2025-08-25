'use client';

import React, { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * 快捷键定义
 */
interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

/**
 * 快捷键帮助组件
 */
export function ShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);

  // 快捷键列表
  const shortcuts: Shortcut[] = [
    // 播放控制
    { keys: ['Space'], description: '播放/暂停', category: '播放控制' },
    { keys: ['K'], description: '播放/暂停', category: '播放控制' },
    { keys: ['M'], description: '静音/取消静音', category: '播放控制' },
    { keys: ['F'], description: '全屏切换', category: '播放控制' },
    { keys: ['←'], description: '后退1秒', category: '播放控制' },
    { keys: ['→'], description: '前进1秒', category: '播放控制' },
    { keys: ['Home'], description: '跳到开始', category: '播放控制' },
    { keys: ['End'], description: '跳到结束', category: '播放控制' },

    // 时间轴编辑
    { keys: ['S'], description: '在播放头位置分割片段', category: '时间轴编辑' },
    { keys: ['Delete'], description: '删除选中片段', category: '时间轴编辑' },
    { keys: ['Backspace'], description: '删除选中片段', category: '时间轴编辑' },
    { keys: ['Ctrl', 'A'], description: '全选片段', category: '时间轴编辑' },
    { keys: ['Ctrl', 'D'], description: '复制选中片段', category: '时间轴编辑' },
    { keys: ['Escape'], description: '取消选择', category: '时间轴编辑' },

    // 视图控制
    { keys: ['Ctrl', '+'], description: '放大时间轴', category: '视图控制' },
    { keys: ['Ctrl', '-'], description: '缩小时间轴', category: '视图控制' },
    { keys: ['Ctrl', '0'], description: '适应窗口', category: '视图控制' },

    // 撤销重做
    { keys: ['Ctrl', 'Z'], description: '撤销', category: '编辑' },
    { keys: ['Ctrl', 'Y'], description: '重做', category: '编辑' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: '重做', category: '编辑' },

    // 工具切换
    { keys: ['V'], description: '选择工具', category: '工具' },
    { keys: ['C'], description: '分割工具', category: '工具' },
    { keys: ['H'], description: '移动工具', category: '工具' },

    // 文件操作
    { keys: ['Ctrl', 'S'], description: '保存项目', category: '文件' },
    { keys: ['Ctrl', 'O'], description: '打开项目', category: '文件' },
    { keys: ['Ctrl', 'N'], description: '新建项目', category: '文件' },
    { keys: ['Ctrl', 'E'], description: '导出视频', category: '文件' },

    // 帮助
    { keys: ['?'], description: '显示快捷键帮助', category: '帮助' },
    { keys: ['F1'], description: '显示快捷键帮助', category: '帮助' },
  ];

  // 按类别分组
  const groupedShortcuts = shortcuts.reduce((groups, shortcut) => {
    if (!groups[shortcut.category]) {
      groups[shortcut.category] = [];
    }
    groups[shortcut.category].push(shortcut);
    return groups;
  }, {} as Record<string, Shortcut[]>);

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框中，不响应快捷键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // ? 或 F1 显示帮助
      if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Esc 关闭帮助
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 格式化快捷键显示
  const formatKeys = (keys: string[]) => {
    return keys.map((key, index) => (
      <span key={index} className="inline-flex items-center">
        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
          {key === 'Ctrl' ? '⌘' : key === 'Shift' ? '⇧' : key === 'Alt' ? '⌥' : key}
        </kbd>
        {index < keys.length - 1 && <span className="mx-1 text-gray-400">+</span>}
      </span>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="快捷键帮助 (?)">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Keyboard className="h-5 w-5" />
            <span>快捷键帮助</span>
          </DialogTitle>
          <DialogDescription>
            使用这些快捷键可以提高编辑效率
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="space-y-3">
              <h3 className="font-semibold text-lg border-b pb-1">
                {category}
              </h3>
              
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center space-x-1">
                      {formatKeys(shortcut.keys)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          <p>按 <kbd className="px-1 py-0.5 bg-gray-100 rounded">?</kbd> 或 <kbd className="px-1 py-0.5 bg-gray-100 rounded">F1</kbd> 随时打开此帮助</p>
          <p>按 <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> 关闭</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}