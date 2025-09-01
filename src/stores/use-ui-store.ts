import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  EditorMode,
  EditorPanel,
  EditorTheme,
  ZoomFitMode,
  ThumbnailSize,
  PreviewQuality,
  LayoutConfig,
  UIConfig,
} from "@/types";

/**
 * UI操作接口
 */
interface UIActions {
  // 模式和面板
  setMode: (mode: EditorMode) => void;
  setActivePanel: (panel: EditorPanel) => void;
  togglePanel: (panel: EditorPanel) => void;
  showPanel: (panel: EditorPanel) => void;
  hidePanel: (panel: EditorPanel) => void;

  // 主题和外观
  setTheme: (theme: EditorTheme) => void;
  toggleTheme: () => void;
  setThumbnailSize: (size: ThumbnailSize) => void;

  // 布局控制
  setLayout: (layout: Partial<LayoutConfig>) => void;
  setPanelSize: (panel: string, size: number) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  setLeftPanelVisible: (visible: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  setBottomPanelVisible: (visible: boolean) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
  resetLayout: () => void;

  // 全屏和缩放
  setFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;
  setZoomFitMode: (mode: ZoomFitMode) => void;

  // 预览设置
  setPreviewQuality: (quality: PreviewQuality) => void;
  togglePreviewAudio: () => void;
  togglePreviewOverlays: () => void;
  toggleSafeArea: () => void;

  // 工作区设置
  setShowTimecode: (show: boolean) => void;
  setShowWaveforms: (show: boolean) => void;
  setShowThumbnails: (show: boolean) => void;
  setTrackHeight: (height: number) => void;
  setTimelineHeight: (height: number) => void;

  // 加载状态
  setLoading: (component: string, loading: boolean) => void;
  clearAllLoading: () => void;

  // 错误处理
  setError: (component: string, error: string | null) => void;
  clearAllErrors: () => void;

  // 通知系统
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // 对话框管理
  openDialog: (dialog: DialogConfig) => void;
  closeDialog: (dialogId?: string) => void;
  closeAllDialogs: () => void;

  // 工具提示
  setTooltip: (tooltip: TooltipConfig | null) => void;

  // 键盘快捷键
  setShortcutsEnabled: (enabled: boolean) => void;
  toggleShortcuts: () => void;
}

/**
 * 通知配置
 */
interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  duration?: number; // 自动关闭时间，毫秒
  action?: NotificationAction;
}

/**
 * 通知操作
 */
interface NotificationAction {
  label: string;
  onClick: () => void;
}

/**
 * 对话框配置
 */
interface DialogConfig {
  id: string;
  type: "confirm" | "alert" | "prompt" | "custom";
  title: string;
  message?: string;
  component?: React.ComponentType<any>;
  props?: Record<string, any>;
  onConfirm?: (value?: any) => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

/**
 * 工具提示配置
 */
interface TooltipConfig {
  content: string;
  position: { x: number; y: number };
  placement?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

/**
 * UI状态
 */
interface UIState {
  // 模式和面板
  mode: EditorMode;
  activePanel: EditorPanel;
  visiblePanels: Set<EditorPanel>;

  // 主题和外观
  theme: EditorTheme;
  thumbnailSize: ThumbnailSize;

  // 布局
  layout: LayoutConfig;
  panelSizes: Record<string, number>;

  // 全屏和缩放
  isFullscreen: boolean;
  zoomFitMode: ZoomFitMode;

  // 预览设置
  previewQuality: PreviewQuality;
  previewAudio: boolean;
  previewOverlays: boolean;
  showSafeArea: boolean;

  // 工作区设置
  showTimecode: boolean;
  showWaveforms: boolean;
  showThumbnails: boolean;
  trackHeight: number;
  timelineHeight: number;

  // 加载状态
  loadingStates: Record<string, boolean>;

  // 错误状态
  errors: Record<string, string>;

  // 通知
  notifications: Notification[];

  // 对话框
  dialogs: DialogConfig[];

  // 工具提示
  tooltip: TooltipConfig | null;

  // 键盘快捷键
  shortcutsEnabled: boolean;
}

/**
 * UI Store 接口
 */
interface UIStore extends UIState, UIActions {}

/**
 * 默认布局配置
 */
const defaultLayout: LayoutConfig = {
  showLeftPanel: true,
  showRightPanel: true,
  showBottomPanel: true,
  leftPanelWidth: 300,
  rightPanelWidth: 350,
  bottomPanelHeight: 300,
};

/**
 * 默认面板大小
 */
const defaultPanelSizes: Record<string, number> = {
  media: 300,
  properties: 350,
  timeline: 300,
  effects: 300,
  audio: 250,
};

/**
 * UI状态管理 Store
 */
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        mode: "edit",
        activePanel: "timeline",
        visiblePanels: new Set([
          "timeline",
          "media",
          "properties",
        ] as EditorPanel[]),

        theme: "light",
        thumbnailSize: "medium",

        layout: defaultLayout,
        panelSizes: defaultPanelSizes,

        isFullscreen: false,
        zoomFitMode: "none",

        previewQuality: "high",
        previewAudio: true,
        previewOverlays: true,
        showSafeArea: false,

        showTimecode: true,
        showWaveforms: true,
        showThumbnails: true,
        trackHeight: 80,
        timelineHeight: 300,

        loadingStates: {},
        errors: {},
        notifications: [],
        dialogs: [],
        tooltip: null,
        shortcutsEnabled: true,

        // 模式和面板
        setMode: (mode) => {
          set({ mode });
        },

        setActivePanel: (panel) => {
          set({ activePanel: panel });
        },

        togglePanel: (panel) => {
          const { visiblePanels } = get();
          const newVisiblePanels = new Set(visiblePanels);

          if (newVisiblePanels.has(panel)) {
            newVisiblePanels.delete(panel);
          } else {
            newVisiblePanels.add(panel);
          }

          set({ visiblePanels: newVisiblePanels });
        },

        showPanel: (panel) => {
          const { visiblePanels } = get();
          const newVisiblePanels = new Set(visiblePanels);
          newVisiblePanels.add(panel);
          set({ visiblePanels: newVisiblePanels });
        },

        hidePanel: (panel) => {
          const { visiblePanels } = get();
          const newVisiblePanels = new Set(visiblePanels);
          newVisiblePanels.delete(panel);
          set({ visiblePanels: newVisiblePanels });
        },

        // 主题和外观
        setTheme: (theme) => {
          set({ theme });
          // 应用主题到document
          document.documentElement.setAttribute("data-theme", theme);
        },

        toggleTheme: () => {
          const { theme } = get();
          const newTheme = theme === "light" ? "dark" : "light";
          get().setTheme(newTheme);
        },

        setThumbnailSize: (size) => {
          set({ thumbnailSize: size });
        },

        // 布局控制
        setLayout: (layout) => {
          const { layout: currentLayout } = get();
          set({ layout: { ...currentLayout, ...layout } });
        },

        setPanelSize: (panel, size) => {
          const { panelSizes } = get();
          set({
            panelSizes: { ...panelSizes, [panel]: size },
          });
        },

        toggleLeftPanel: () => {
          const { layout } = get();
          get().setLayout({ showLeftPanel: !layout.showLeftPanel });
        },

        toggleRightPanel: () => {
          const { layout } = get();
          get().setLayout({ showRightPanel: !layout.showRightPanel });
        },

        toggleBottomPanel: () => {
          const { layout } = get();
          get().setLayout({ showBottomPanel: !layout.showBottomPanel });
        },

        setLeftPanelVisible: (visible) => {
          get().setLayout({ showLeftPanel: visible });
        },

        setRightPanelVisible: (visible) => {
          get().setLayout({ showRightPanel: visible });
        },

        setBottomPanelVisible: (visible) => {
          get().setLayout({ showBottomPanel: visible });
        },

        setLeftPanelWidth: (width) => {
          get().setLayout({ leftPanelWidth: width });
        },

        setRightPanelWidth: (width) => {
          get().setLayout({ rightPanelWidth: width });
        },

        setBottomPanelHeight: (height) => {
          get().setLayout({ bottomPanelHeight: height });
        },

        resetLayout: () => {
          set({
            layout: defaultLayout,
            panelSizes: defaultPanelSizes,
          });
        },

        // 全屏和缩放
        setFullscreen: (fullscreen) => {
          set({ isFullscreen: fullscreen });
        },

        toggleFullscreen: () => {
          const { isFullscreen } = get();
          get().setFullscreen(!isFullscreen);
        },

        setZoomFitMode: (mode) => {
          set({ zoomFitMode: mode });
        },

        // 预览设置
        setPreviewQuality: (quality) => {
          set({ previewQuality: quality });
        },

        togglePreviewAudio: () => {
          const { previewAudio } = get();
          set({ previewAudio: !previewAudio });
        },

        togglePreviewOverlays: () => {
          const { previewOverlays } = get();
          set({ previewOverlays: !previewOverlays });
        },

        toggleSafeArea: () => {
          const { showSafeArea } = get();
          set({ showSafeArea: !showSafeArea });
        },

        // 工作区设置
        setShowTimecode: (show) => {
          set({ showTimecode: show });
        },

        setShowWaveforms: (show) => {
          set({ showWaveforms: show });
        },

        setShowThumbnails: (show) => {
          set({ showThumbnails: show });
        },

        setTrackHeight: (height) => {
          set({ trackHeight: Math.max(40, Math.min(200, height)) });
        },

        setTimelineHeight: (height) => {
          set({ timelineHeight: Math.max(200, Math.min(600, height)) });
        },

        // 加载状态
        setLoading: (component, loading) => {
          const { loadingStates } = get();
          set({
            loadingStates: { ...loadingStates, [component]: loading },
          });
        },

        clearAllLoading: () => {
          set({ loadingStates: {} });
        },

        // 错误处理
        setError: (component, error) => {
          const { errors } = get();
          if (error) {
            set({ errors: { ...errors, [component]: error } });
          } else {
            const newErrors = { ...errors };
            delete newErrors[component];
            set({ errors: newErrors });
          }
        },

        clearAllErrors: () => {
          set({ errors: {} });
        },

        // 通知系统
        addNotification: (notification) => {
          const { notifications } = get();
          const newNotifications = [...notifications, notification];
          set({ notifications: newNotifications });

          // 自动移除通知
          if (notification.duration) {
            setTimeout(() => {
              get().removeNotification(notification.id);
            }, notification.duration);
          }
        },

        removeNotification: (id) => {
          const { notifications } = get();
          set({
            notifications: notifications.filter((n) => n.id !== id),
          });
        },

        clearNotifications: () => {
          set({ notifications: [] });
        },

        // 对话框管理
        openDialog: (dialog) => {
          const { dialogs } = get();
          set({ dialogs: [...dialogs, dialog] });
        },

        closeDialog: (dialogId) => {
          const { dialogs } = get();
          if (dialogId) {
            set({
              dialogs: dialogs.filter((d) => d.id !== dialogId),
            });
          } else {
            // 关闭最后一个对话框
            set({ dialogs: dialogs.slice(0, -1) });
          }
        },

        closeAllDialogs: () => {
          set({ dialogs: [] });
        },

        // 工具提示
        setTooltip: (tooltip) => {
          set({ tooltip });
        },

        // 键盘快捷键
        setShortcutsEnabled: (enabled) => {
          set({ shortcutsEnabled: enabled });
        },

        toggleShortcuts: () => {
          const { shortcutsEnabled } = get();
          set({ shortcutsEnabled: !shortcutsEnabled });
        },
      }),
      {
        name: "video-editor-ui",
        partialize: (state) => ({
          theme: state.theme,
          layout: state.layout,
          panelSizes: state.panelSizes,
          thumbnailSize: state.thumbnailSize,
          previewQuality: state.previewQuality,
          previewAudio: state.previewAudio,
          previewOverlays: state.previewOverlays,
          showSafeArea: state.showSafeArea,
          showTimecode: state.showTimecode,
          showWaveforms: state.showWaveforms,
          showThumbnails: state.showThumbnails,
          trackHeight: state.trackHeight,
          timelineHeight: state.timelineHeight,
          shortcutsEnabled: state.shortcutsEnabled,
        }),
      }
    ),
    { name: "UIStore" }
  )
);

/**
 * 通知工厂方法
 */
export const createNotification = {
  info: (title: string, message?: string, duration = 3000): Notification => ({
    id: Math.random().toString(36).substr(2, 9),
    type: "info",
    title,
    message,
    duration,
  }),

  success: (
    title: string,
    message?: string,
    duration = 3000
  ): Notification => ({
    id: Math.random().toString(36).substr(2, 9),
    type: "success",
    title,
    message,
    duration,
  }),

  warning: (
    title: string,
    message?: string,
    duration = 5000
  ): Notification => ({
    id: Math.random().toString(36).substr(2, 9),
    type: "warning",
    title,
    message,
    duration,
  }),

  error: (title: string, message?: string, duration = 0): Notification => ({
    id: Math.random().toString(36).substr(2, 9),
    type: "error",
    title,
    message,
    duration, // 错误通知不自动消失
  }),
};

// 导出类型
export type { Notification, DialogConfig, TooltipConfig };
