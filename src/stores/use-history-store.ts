import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { EditAction, EditActionType, EditActionData } from '@/types';

/**
 * 历史记录操作接口
 */
interface HistoryActions {
  // 核心操作
  pushAction: (action: Omit<EditAction, 'id' | 'timestamp'>) => void;
  undo: () => EditAction | null;
  redo: () => EditAction | null;
  
  // 批量操作
  startBatch: (description: string) => void;
  endBatch: () => void;
  cancelBatch: () => void;
  
  // 管理操作
  clear: () => void;
  setMaxSize: (size: number) => void;
  getActionHistory: () => EditAction[];
  
  // 状态查询
  canUndo: () => boolean;
  canRedo: () => boolean;
  getCurrentIndex: () => number;
  getTotalActions: () => number;
  
  // 工具方法
  getLastAction: () => EditAction | null;
  findActionById: (id: string) => EditAction | null;
  removeActionsAfter: (index: number) => void;
}

/**
 * 历史记录状态
 */
interface HistoryState {
  history: EditAction[];
  currentIndex: number; // 当前位置索引，-1表示在历史开始之前
  maxSize: number;
  isBatching: boolean;
  batchActions: EditAction[];
  batchDescription: string;
}

/**
 * 历史记录 Store 接口
 */
interface HistoryStore extends HistoryState, HistoryActions {}

/**
 * 生成唯一 ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 创建编辑操作
 */
const createEditAction = (
  type: EditActionType,
  description: string,
  data: EditActionData,
  undoData?: EditActionData
): EditAction => ({
  id: generateId(),
  type,
  timestamp: new Date(),
  description,
  data,
  undoData,
});

/**
 * 历史记录状态管理 Store
 */
export const useHistoryStore = create<HistoryStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      history: [],
      currentIndex: -1,
      maxSize: 100,
      isBatching: false,
      batchActions: [],
      batchDescription: '',

      // 核心操作
      pushAction: (actionData) => {
        const { 
          history, 
          currentIndex, 
          maxSize, 
          isBatching, 
          batchActions,
          removeActionsAfter 
        } = get();

        const action = createEditAction(
          actionData.type,
          actionData.description,
          actionData.data,
          actionData.undoData
        );

        // 如果正在批处理，添加到批处理列表
        if (isBatching) {
          set({ batchActions: [...batchActions, action] });
          return;
        }

        // 如果当前不在历史末尾，移除后续的历史
        if (currentIndex < history.length - 1) {
          removeActionsAfter(currentIndex);
        }

        // 添加新动作到历史
        let newHistory = [...history, action];
        let newIndex = newHistory.length - 1;

        // 如果超过最大大小，移除最早的动作
        if (newHistory.length > maxSize) {
          newHistory = newHistory.slice(1);
          newIndex = newHistory.length - 1;
        }

        set({
          history: newHistory,
          currentIndex: newIndex,
        });
      },

      undo: () => {
        const { history, currentIndex } = get();
        
        if (currentIndex < 0) return null;

        const action = history[currentIndex];
        set({ currentIndex: currentIndex - 1 });
        
        return action;
      },

      redo: () => {
        const { history, currentIndex } = get();
        
        if (currentIndex >= history.length - 1) return null;

        const newIndex = currentIndex + 1;
        const action = history[newIndex];
        set({ currentIndex: newIndex });
        
        return action;
      },

      // 批量操作
      startBatch: (description) => {
        set({
          isBatching: true,
          batchActions: [],
          batchDescription: description,
        });
      },

      endBatch: () => {
        const { 
          batchActions, 
          batchDescription, 
          pushAction,
          isBatching 
        } = get();

        if (!isBatching || batchActions.length === 0) {
          set({
            isBatching: false,
            batchActions: [],
            batchDescription: '',
          });
          return;
        }

        // 将批处理操作合并为单个操作
        const batchAction = createEditAction(
          'batch' as EditActionType,
          batchDescription,
          { batchActions },
          { batchActions: [] }
        );

        set({
          isBatching: false,
          batchActions: [],
          batchDescription: '',
        });

        // 直接添加到历史，避免递归调用
        const { history, currentIndex, maxSize, removeActionsAfter } = get();

        if (currentIndex < history.length - 1) {
          removeActionsAfter(currentIndex);
        }

        let newHistory = [...history, batchAction];
        let newIndex = newHistory.length - 1;

        if (newHistory.length > maxSize) {
          newHistory = newHistory.slice(1);
          newIndex = newHistory.length - 1;
        }

        set({
          history: newHistory,
          currentIndex: newIndex,
        });
      },

      cancelBatch: () => {
        set({
          isBatching: false,
          batchActions: [],
          batchDescription: '',
        });
      },

      // 管理操作
      clear: () => {
        set({
          history: [],
          currentIndex: -1,
          isBatching: false,
          batchActions: [],
          batchDescription: '',
        });
      },

      setMaxSize: (size) => {
        const { history, currentIndex } = get();
        const newMaxSize = Math.max(1, size);
        
        if (history.length > newMaxSize) {
          const startIndex = history.length - newMaxSize;
          const newHistory = history.slice(startIndex);
          const newIndex = Math.max(-1, currentIndex - startIndex);
          
          set({
            history: newHistory,
            currentIndex: newIndex,
            maxSize: newMaxSize,
          });
        } else {
          set({ maxSize: newMaxSize });
        }
      },

      getActionHistory: () => {
        return get().history;
      },

      // 状态查询
      canUndo: () => {
        const { currentIndex, isBatching } = get();
        return !isBatching && currentIndex >= 0;
      },

      canRedo: () => {
        const { history, currentIndex, isBatching } = get();
        return !isBatching && currentIndex < history.length - 1;
      },

      getCurrentIndex: () => {
        return get().currentIndex;
      },

      getTotalActions: () => {
        return get().history.length;
      },

      // 工具方法
      getLastAction: () => {
        const { history } = get();
        return history.length > 0 ? history[history.length - 1] : null;
      },

      findActionById: (id) => {
        const { history } = get();
        return history.find(action => action.id === id) || null;
      },

      removeActionsAfter: (index) => {
        const { history } = get();
        const newHistory = history.slice(0, index + 1);
        set({ history: newHistory });
      },
    }),
    { name: 'HistoryStore' }
  )
);

/**
 * 历史记录操作的工厂方法
 */
export const createHistoryAction = {
  addClip: (clipId: string, trackId: string, clipData: any): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'add-clip',
    description: `添加片段 ${clipData.source?.name || clipId}`,
    data: { clipIds: [clipId], properties: { trackId, ...clipData } },
    undoData: { clipIds: [clipId] },
  }),

  removeClip: (clipId: string, clipData: any): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'remove-clip',
    description: `删除片段 ${clipData.source?.name || clipId}`,
    data: { clipIds: [clipId] },
    undoData: { clipIds: [clipId], properties: clipData },
  }),

  moveClip: (clipId: string, oldPosition: any, newPosition: any): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'move-clip',
    description: `移动片段`,
    data: { clipIds: [clipId], newValues: newPosition },
    undoData: { clipIds: [clipId], oldValues: oldPosition },
  }),

  trimClip: (clipId: string, oldTrim: any, newTrim: any): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'trim-clip',
    description: `修剪片段`,
    data: { clipIds: [clipId], newValues: newTrim },
    undoData: { clipIds: [clipId], oldValues: oldTrim },
  }),

  splitClip: (originalClipId: string, newClipIds: string[]): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'split-clip',
    description: `分割片段`,
    data: { clipIds: newClipIds, properties: { originalClipId } },
    undoData: { clipIds: [originalClipId] },
  }),

  addTrack: (trackId: string, trackData: any): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'add-track',
    description: `添加轨道 ${trackData.name}`,
    data: { trackIds: [trackId], properties: trackData },
    undoData: { trackIds: [trackId] },
  }),

  removeTrack: (trackId: string, trackData: any): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'remove-track',
    description: `删除轨道 ${trackData.name}`,
    data: { trackIds: [trackId] },
    undoData: { trackIds: [trackId], properties: trackData },
  }),

  changeProperty: (
    targetIds: string[], 
    propertyName: string, 
    oldValue: any, 
    newValue: any,
    targetType: 'clip' | 'track' = 'clip'
  ): Omit<EditAction, 'id' | 'timestamp'> => ({
    type: 'change-property',
    description: `修改${targetType === 'clip' ? '片段' : '轨道'}属性 ${propertyName}`,
    data: { 
      [targetType === 'clip' ? 'clipIds' : 'trackIds']: targetIds,
      newValues: { [propertyName]: newValue }
    },
    undoData: { 
      [targetType === 'clip' ? 'clipIds' : 'trackIds']: targetIds,
      oldValues: { [propertyName]: oldValue }
    },
  }),
};