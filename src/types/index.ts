// 统一导出所有类型定义

// 项目相关类型
export * from './project';

// 时间轴相关类型
export * from './timeline';

// 媒体相关类型
export * from './media';

// 编辑器相关类型
export * from './editor';

// 通用工具类型
export interface Point2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

// 事件相关类型
export interface BaseEvent {
  type: string;
  timestamp: number;
  target?: any;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

// 分页相关类型
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 加载状态
export interface LoadingState {
  isLoading: boolean;
  error?: string;
  progress?: number;
}

// 表单验证
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// 文件操作
export interface FileOperationResult {
  success: boolean;
  fileId?: string;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
}