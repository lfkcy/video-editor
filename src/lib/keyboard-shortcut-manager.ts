import { ClipOperationManager, ClipOperationParams } from './clip-operation-manager';
import { PlaybackSyncManager } from './playback-sync-manager';
import { useTimelineStore, useUIStore } from '@/stores';

/**
 * 快捷键定义
 */
interface ShortcutDefinition {
  key: string;
  modifiers: string[];
  action: string;
  description: string;
  category: string;
}

/**
 * 快捷键上下文
 */
interface ShortcutContext {
  clipOperationManager?: ClipOperationManager;
  playbackSyncManager?: PlaybackSyncManager;
  selectedClipIds: string[];
  currentTime: number;
}

/**
 * 键盘快捷键管理器
 * 处理视频编辑器的所有键盘快捷键
 */
export class KeyboardShortcutManager {
  private shortcuts: ShortcutDefinition[] = [];
  private isListening = false;
  private context: ShortcutContext = {
    selectedClipIds: [],
    currentTime: 0
  };

  constructor() {
    this.initializeDefaultShortcuts();
  }

  /**
   * 初始化默认快捷键
   */
  private initializeDefaultShortcuts(): void {
    this.shortcuts = [
      // 播放控制
      {
        key: 'Space',
        modifiers: [],
        action: 'togglePlayPause',
        description: '播放/暂停',
        category: '播放控制'
      },
      {
        key: 'Home',
        modifiers: [],
        action: 'jumpToStart',
        description: '跳转到开始',
        category: '播放控制'
      },
      {
        key: 'End',
        modifiers: [],
        action: 'jumpToEnd',
        description: '跳转到结束',
        category: '播放控制'
      },
      {
        key: 'ArrowLeft',
        modifiers: [],
        action: 'skipBack',
        description: '后退5秒',
        category: '播放控制'
      },
      {
        key: 'ArrowRight',
        modifiers: [],
        action: 'skipForward',
        description: '前进5秒',
        category: '播放控制'
      },
      {
        key: 'KeyJ',
        modifiers: [],
        action: 'skipBackFrame',
        description: '后退一帧',
        category: '播放控制'
      },
      {
        key: 'KeyL',
        modifiers: [],
        action: 'skipForwardFrame',
        description: '前进一帧',
        category: '播放控制'
      },

      // 片段操作
      {
        key: 'Delete',
        modifiers: [],
        action: 'deleteSelectedClips',
        description: '删除选中的片段',
        category: '片段编辑'
      },
      {
        key: 'Backspace',
        modifiers: [],
        action: 'deleteSelectedClips',
        description: '删除选中的片段',
        category: '片段编辑'
      },
      {
        key: 'KeyS',
        modifiers: [],
        action: 'splitAtPlayhead',
        description: '在播放头位置分割',
        category: '片段编辑'
      },
      {
        key: 'KeyD',
        modifiers: ['ctrl'],
        action: 'duplicateSelectedClips',
        description: '复制选中的片段',
        category: '片段编辑'
      },
      {
        key: 'KeyC',
        modifiers: ['ctrl'],
        action: 'copySelectedClips',
        description: '复制选中的片段',
        category: '片段编辑'
      },
      {
        key: 'KeyV',
        modifiers: ['ctrl'],
        action: 'pasteClips',
        description: '粘贴片段',
        category: '片段编辑'
      },
      {
        key: 'KeyX',
        modifiers: ['ctrl'],
        action: 'cutSelectedClips',
        description: '剪切选中的片段',
        category: '片段编辑'
      },

      // 选择操作
      {
        key: 'KeyA',
        modifiers: ['ctrl'],
        action: 'selectAllClips',
        description: '选择所有片段',
        category: '选择'
      },
      {
        key: 'Escape',
        modifiers: [],
        action: 'clearSelection',
        description: '清除选择',
        category: '选择'
      },

      // 撤销重做
      {
        key: 'KeyZ',
        modifiers: ['ctrl'],
        action: 'undo',
        description: '撤销',
        category: '编辑'
      },
      {
        key: 'KeyY',
        modifiers: ['ctrl'],
        action: 'redo',
        description: '重做',
        category: '编辑'
      },
      {
        key: 'KeyZ',
        modifiers: ['ctrl', 'shift'],
        action: 'redo',
        description: '重做',
        category: '编辑'
      },

      // 缩放操作
      {
        key: 'Equal',
        modifiers: ['ctrl'],
        action: 'zoomIn',
        description: '放大时间轴',
        category: '视图'
      },
      {
        key: 'Minus',
        modifiers: ['ctrl'],
        action: 'zoomOut',
        description: '缩小时间轴',
        category: '视图'
      },
      {
        key: 'Digit0',
        modifiers: ['ctrl'],
        action: 'zoomToFit',
        description: '缩放到适合大小',
        category: '视图'
      },

      // 保存和导出
      {
        key: 'KeyS',
        modifiers: ['ctrl'],
        action: 'saveProject',
        description: '保存项目',
        category: '文件'
      },
      {
        key: 'KeyE',
        modifiers: ['ctrl'],
        action: 'exportVideo',
        description: '导出视频',
        category: '文件'
      },

      // 调试快捷键
      {
        key: 'F12',
        modifiers: [],
        action: 'toggleDevTools',
        description: '开发者工具',
        category: '调试'
      }
    ];
  }

  /**
   * 开始监听键盘事件
   */
  startListening(): void {
    if (this.isListening) return;

    document.addEventListener('keydown', this.handleKeyDown);
    this.isListening = true;
    
    console.log('键盘快捷键管理器开始监听');
  }

  /**
   * 停止监听键盘事件
   */
  stopListening(): void {
    if (!this.isListening) return;

    document.removeEventListener('keydown', this.handleKeyDown);
    this.isListening = false;
    
    console.log('键盘快捷键管理器停止监听');
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // 如果焦点在输入框中，不处理快捷键
    if (this.isInputFocused(event.target)) {
      return;
    }

    const modifiers: string[] = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');

    const shortcut = this.findShortcut(event.code, modifiers);
    if (shortcut) {
      event.preventDefault();
      this.executeAction(shortcut.action);
    }
  };

  /**
   * 检查焦点是否在输入框中
   */
  private isInputFocused(target: EventTarget | null): boolean {
    if (!target) return false;
    
    const element = target as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      element.contentEditable === 'true' ||
      element.getAttribute('role') === 'textbox'
    );
  }

  /**
   * 查找匹配的快捷键
   */
  private findShortcut(key: string, modifiers: string[]): ShortcutDefinition | null {
    return this.shortcuts.find(shortcut => {
      return (
        shortcut.key === key &&
        this.arraysEqual(shortcut.modifiers.sort(), modifiers.sort())
      );
    }) || null;
  }

  /**
   * 比较两个数组是否相等
   */
  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  /**
   * 执行快捷键动作
   */
  private async executeAction(action: string): Promise<void> {
    try {
      console.log('执行快捷键动作:', action);

      switch (action) {
        // 播放控制
        case 'togglePlayPause':
          await this.context.playbackSyncManager?.togglePlayPause();
          break;

        case 'jumpToStart':
          await this.context.playbackSyncManager?.seekTo(0);
          break;

        case 'jumpToEnd':
          const timelineStore = useTimelineStore.getState();
          await this.context.playbackSyncManager?.seekTo(timelineStore.duration / 1000);
          break;

        case 'skipBack':
          await this.context.playbackSyncManager?.skipBack(5);
          break;

        case 'skipForward':
          await this.context.playbackSyncManager?.skipForward(5);
          break;

        case 'skipBackFrame':
          await this.context.playbackSyncManager?.skipBack(1/30); // 假设30fps
          break;

        case 'skipForwardFrame':
          await this.context.playbackSyncManager?.skipForward(1/30);
          break;

        // 片段操作
        case 'deleteSelectedClips':
          if (this.context.selectedClipIds.length > 0) {
            await this.context.clipOperationManager?.deleteClips({
              actionIds: this.context.selectedClipIds
            });
          }
          break;

        case 'splitAtPlayhead':
          if (this.context.selectedClipIds.length > 0) {
            await this.context.clipOperationManager?.splitClips({
              actionIds: this.context.selectedClipIds,
              splitTime: this.context.currentTime / 1000
            });
          }
          break;

        case 'duplicateSelectedClips':
          if (this.context.selectedClipIds.length > 0) {
            await this.context.clipOperationManager?.duplicateClips({
              actionIds: this.context.selectedClipIds,
              offset: 1 // 1秒偏移
            });
          }
          break;

        case 'copySelectedClips':
          // TODO: 实现剪贴板功能
          console.log('复制功能待实现');
          break;

        case 'pasteClips':
          // TODO: 实现剪贴板功能
          console.log('粘贴功能待实现');
          break;

        case 'cutSelectedClips':
          // TODO: 实现剪贴板功能
          console.log('剪切功能待实现');
          break;

        // 选择操作
        case 'selectAllClips':
          // TODO: 实现全选功能
          console.log('全选功能待实现');
          break;

        case 'clearSelection':
          useTimelineStore.getState().clearSelection();
          break;

        // 撤销重做
        case 'undo':
          // TODO: 通过历史记录store实现
          console.log('撤销功能待实现');
          break;

        case 'redo':
          // TODO: 通过历史记录store实现
          console.log('重做功能待实现');
          break;

        // 缩放操作
        case 'zoomIn':
          useTimelineStore.getState().zoomIn();
          break;

        case 'zoomOut':
          useTimelineStore.getState().zoomOut();
          break;

        case 'zoomToFit':
          useTimelineStore.getState().zoomToFit();
          break;

        // 文件操作
        case 'saveProject':
          // TODO: 实现保存功能
          console.log('保存功能待实现');
          break;

        case 'exportVideo':
          // TODO: 触发导出对话框
          console.log('导出功能待实现');
          break;

        // 调试功能
        case 'toggleDevTools':
          console.log('开发者工具切换');
          break;

        default:
          console.warn('未知的快捷键动作:', action);
      }
    } catch (error) {
      console.error('执行快捷键动作失败:', action, error);
    }
  }

  /**
   * 更新上下文
   */
  updateContext(newContext: Partial<ShortcutContext>): void {
    this.context = {
      ...this.context,
      ...newContext
    };
  }

  /**
   * 添加自定义快捷键
   */
  addShortcut(shortcut: ShortcutDefinition): void {
    // 检查是否已存在相同的快捷键
    const existing = this.findShortcut(shortcut.key, shortcut.modifiers);
    if (existing) {
      console.warn('快捷键已存在:', shortcut.key, shortcut.modifiers);
      return;
    }

    this.shortcuts.push(shortcut);
    console.log('添加自定义快捷键:', shortcut);
  }

  /**
   * 移除快捷键
   */
  removeShortcut(key: string, modifiers: string[]): boolean {
    const index = this.shortcuts.findIndex(shortcut => {
      return (
        shortcut.key === key &&
        this.arraysEqual(shortcut.modifiers.sort(), modifiers.sort())
      );
    });

    if (index > -1) {
      this.shortcuts.splice(index, 1);
      console.log('移除快捷键:', key, modifiers);
      return true;
    }

    return false;
  }

  /**
   * 获取所有快捷键
   */
  getAllShortcuts(): ShortcutDefinition[] {
    return [...this.shortcuts];
  }

  /**
   * 按类别获取快捷键
   */
  getShortcutsByCategory(category: string): ShortcutDefinition[] {
    return this.shortcuts.filter(shortcut => shortcut.category === category);
  }

  /**
   * 获取所有类别
   */
  getCategories(): string[] {
    const categories = new Set(this.shortcuts.map(shortcut => shortcut.category));
    return Array.from(categories);
  }

  /**
   * 格式化快捷键显示
   */
  formatShortcut(shortcut: ShortcutDefinition): string {
    const modifierMap: Record<string, string> = {
      ctrl: navigator.platform.includes('Mac') ? '⌘' : 'Ctrl',
      shift: 'Shift',
      alt: navigator.platform.includes('Mac') ? '⌥' : 'Alt'
    };

    const keyMap: Record<string, string> = {
      Space: '空格',
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
      Enter: '回车',
      Escape: 'Esc',
      Delete: 'Del',
      Backspace: '退格',
      Home: 'Home',
      End: 'End'
    };

    const modifierParts = shortcut.modifiers.map(mod => modifierMap[mod] || mod);
    const keyPart = keyMap[shortcut.key] || shortcut.key.replace('Key', '').replace('Digit', '');

    return [...modifierParts, keyPart].join('+');
  }

  /**
   * 销毁快捷键管理器
   */
  destroy(): void {
    this.stopListening();
    this.shortcuts = [];
    this.context = { selectedClipIds: [], currentTime: 0 };
    
    console.log('键盘快捷键管理器已销毁');
  }
}

/**
 * 创建键盘快捷键管理器
 */
export function createKeyboardShortcutManager(): KeyboardShortcutManager {
  return new KeyboardShortcutManager();
}