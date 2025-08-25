# 网页视频编辑器

基于 Next.js 和 WebAV 技术栈构建的现代化在线视频编辑工具。

## 🌟 主要特性

- 🎬 **多轨道编辑** - 支持视频、音频、文字多轨道同时编辑
- ✂️ **精确剪辑** - 帧级精度的剪切、分割、合并操作
- 🎨 **丰富特效** - 内置滤镜、转场、文字叠加等效果
- 📱 **响应式界面** - 适配各种屏幕尺寸，支持触控操作
- ⚡ **高性能预览** - 基于 WebAV 的实时视频预览
- 📤 **多格式导出** - 支持 MP4、WebM 等主流格式

## 🚀 快速体验

```bash
# 克隆项目
git clone https://github.com/yourusername/video-editor.git

# 安装依赖
cd video-editor
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 开始使用。

## 💻 技术栈

- **前端**: Next.js 14 + React 18 + TypeScript
- **视频处理**: WebAV (浏览器端视频处理引擎)
- **UI组件**: Radix UI + Tailwind CSS
- **状态管理**: Zustand
- **图标**: Lucide React

## 📖 文档

- [开发文档](./docs/DEVELOPMENT.md) - 详细的开发指南和API文档
- [功能说明](#功能说明) - 主要功能介绍
- [部署指南](#部署指南) - 生产环境部署说明

## 🎯 功能说明

### 基础编辑
- 导入视频、音频、图片文件
- 拖拽式时间轴操作
- 精确的剪切和修剪工具
- 多层轨道管理

### 高级功能
- 文字标题和字幕添加
- 视频转场效果
- 音频处理和混音
- 撤销/重做操作历史

### 导出设置
- 自定义分辨率和帧率
- 码率和质量控制
- 进度监控和预览

## 🛠 开发

```bash
# 开发环境
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 构建生产版本
npm run build
```

## 📂 项目结构

```
src/
├── app/              # Next.js 应用路由
├── components/       # React 组件
│   ├── editor/      # 编辑器核心组件
│   ├── panels/      # 功能面板
│   └── ui/          # 通用UI组件
├── hooks/           # 自定义 Hooks
├── services/        # 业务服务层
├── stores/          # 状态管理
├── types/           # TypeScript 类型
└── utils/           # 工具函数
```

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支: `git checkout -b my-new-feature`
3. 提交更改: `git commit -am 'Add some feature'`
4. 推送分支: `git push origin my-new-feature`
5. 提交 Pull Request

## 📄 许可证

[MIT License](./LICENSE)

## 🙏 致谢

- [WebAV](https://github.com/hughfenghen/WebAV) - 浏览器视频处理引擎
- [Next.js](https://nextjs.org/) - React 全栈框架
- [Radix UI](https://www.radix-ui.com/) - 无障碍UI组件库