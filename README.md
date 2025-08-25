# 视频编辑器 (Video Editor)

> 基于 Next.js 和 WebAV 构建的现代化网页视频编辑器

![视频编辑器预览](./docs/preview.png)

## ✨ 功能特性

### 🎬 核心编辑功能
- **多轨道视频编辑** - 支持多个视频轨道同时编辑
- **精确剪辑** - 帧级精度的视频剪切、分割、合并
- **实时预览** - 高性能的视频预览和播放
- **时间轴操作** - 直观的时间轴界面，支持拖拽操作

### 🎨 媒体处理
- **多格式支持** - 支持主流视频、音频、图片格式
- **文本叠加** - 添加文字、标题、字幕
- **视频特效** - 内置多种视频滤镜和转场效果
- **音频处理** - 音频轨道编辑、音量调节、音效添加

### 📱 用户体验
- **响应式设计** - 适配不同屏幕尺寸
- **主题切换** - 支持明暗主题
- **快捷键支持** - 完整的键盘快捷键系统
- **撤销/重做** - 无限步数的操作历史记录

### 📤 导出功能
- **多格式导出** - 支持 MP4、WebM 等主流格式
- **自定义参数** - 分辨率、帧率、码率等可调节
- **批量处理** - 支持批量导出和处理

## 🛠 技术栈

### 前端框架
- **Next.js 14.2.5** - React 全栈框架
- **React 18.3.1** - 用户界面库
- **TypeScript 5.5.4** - 类型安全的 JavaScript

### UI 组件
- **Radix UI** - 无障碍的 UI 组件库
- **Tailwind CSS 3.4.9** - 实用优先的 CSS 框架
- **Lucide React** - 现代化图标库

### 视频处理
- **WebAV** - 浏览器端视频处理引擎
  - `@webav/av-canvas` - 视频画布渲染
  - `@webav/av-cliper` - 视频剪辑功能

### 状态管理
- **Zustand 4.5.4** - 轻量级状态管理库

### 开发工具
- **ESLint** - 代码质量检查
- **PostCSS** - CSS 后处理器
- **Autoprefixer** - CSS 前缀自动添加

## 🚀 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm、yarn 或 pnpm 包管理器
- 现代浏览器（支持 WebAssembly）

### 安装依赖

```bash
# 使用 npm
npm install

# 使用 yarn
yarn install

# 使用 pnpm
pnpm install
```

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 或使用 yarn
yarn dev

# 或使用 pnpm
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建项目

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

### 代码检查

```bash
# 运行 ESLint
npm run lint

# 类型检查
npm run type-check
```

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/             # React 组件
│   ├── editor/            # 编辑器核心组件
│   │   ├── overlays/      # 叠加层组件
│   │   ├── timeline/      # 时间轴组件
│   │   ├── video-editor.tsx    # 主编辑器
│   │   ├── video-preview.tsx   # 视频预览
│   │   └── ...
│   ├── panels/            # 面板组件
│   ├── ui/                # 通用 UI 组件
│   ├── export/            # 导出相关组件
│   └── error/             # 错误处理组件
├── hooks/                 # 自定义 React Hooks
├── lib/                   # 工具库
├── services/              # 业务服务
├── stores/                # 状态管理
├── types/                 # TypeScript 类型定义
└── utils/                 # 工具函数
```

## 🎯 核心概念

### 项目 (Project)
每个编辑项目包含：
- 项目设置（分辨率、帧率等）
- 媒体资源
- 轨道和片段
- 导出配置

### 轨道 (Track)
- **视频轨道** - 存放视频片段
- **音频轨道** - 存放音频片段
- **文本轨道** - 存放文字叠加

### 片段 (Clip)
- 媒体文件在时间轴上的实例
- 支持裁剪、移动、调整
- 可应用特效和变换

### 叠加层 (Overlay)
- 文本叠加
- 图片叠加
- 形状和装饰元素

## 🔧 配置

### 环境变量

创建 `.env.local` 文件：

```bash
# 开发环境配置
NEXT_PUBLIC_APP_NAME=视频编辑器
NEXT_PUBLIC_APP_VERSION=0.1.0

# API 配置（如果需要）
# NEXT_PUBLIC_API_URL=https://api.example.com
```

### Next.js 配置

项目已配置支持：
- WebAssembly 异步加载
- Worker 文件处理
- CORS 头设置
- 跨域资源访问

## 🎨 自定义主题

编辑器支持明暗主题切换，可通过以下方式自定义：

1. 修改 `tailwind.config.js` 中的颜色变量
2. 更新 `src/app/globals.css` 中的 CSS 变量
3. 使用 UI Store 切换主题模式

## 📝 开发指南

### 添加新功能

1. 在 `src/types/` 中定义相关类型
2. 在 `src/services/` 中实现业务逻辑
3. 创建对应的 React 组件
4. 更新状态管理（如需要）
5. 添加相应的测试

### 状态管理

项目使用 Zustand 进行状态管理，主要 Store：

- `useProjectStore` - 项目数据管理
- `useTimelineStore` - 时间轴状态
- `useUIStore` - UI 界面状态
- `useHistoryStore` - 操作历史记录

### 性能优化

- 使用 React.memo 优化组件渲染
- 合理使用 useMemo 和 useCallback
- 虚拟化长列表（时间轴片段）
- Web Worker 处理重计算任务

## 🔍 故障排除

### 常见问题

**Q: 视频无法播放或预览**
A: 检查浏览器是否支持相应的视频格式，确保文件路径正确

**Q: 导出失败**
A: 确保浏览器支持 WebAssembly，检查导出参数设置

**Q: 性能问题**
A: 减少同时处理的轨道数量，降低预览质量设置

**Q: 类型错误**
A: 运行 `npm run type-check` 检查 TypeScript 类型问题

### 调试模式

开发环境下启用详细日志：

```javascript
// 在浏览器控制台中
localStorage.setItem('debug', 'video-editor:*');
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 配置
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名
- 提交信息遵循 Conventional Commits

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 维护团队

- **开发者** - [Your Name](https://github.com/yourusername)

## 📞 支持

- 🐛 [报告 Bug](https://github.com/yourusername/video-editor/issues)
- 💡 [功能建议](https://github.com/yourusername/video-editor/issues)
- 📧 [联系邮箱](mailto:your.email@example.com)

## 🎉 致谢

感谢以下开源项目：

- [WebAV](https://github.com/hughfenghen/WebAV) - 强大的浏览器视频处理库
- [Radix UI](https://www.radix-ui.com/) - 无障碍 UI 组件
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Zustand](https://github.com/pmndrs/zustand) - 简单的状态管理

---

⭐ 如果这个项目对你有帮助，请给它一个 star！