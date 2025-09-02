// 统一导出所有类型定义

// 项目相关类型
export * from "./project";

// 时间轴相关类型
export * from "./timeline";

// 媒体相关类型
export * from "./media";

// 编辑器相关类型
export * from "./editor";

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
