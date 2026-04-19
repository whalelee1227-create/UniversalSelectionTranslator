# UniversalSelectionTranslator

一款 macOS 上的全局划词翻译工具。复制任意文本后按快捷键，即可获得即时翻译结果。

## 功能特性

- **全局快捷键**: 使用 `Cmd+Shift+T` 在任何应用中快速翻译
- **语言自动检测**: 支持自动检测源语言，也可手动选择
- **多语言支持**: 支持 English、中文、日语、韩语、法语、德语、西班牙语等
- **即时重新翻译**: 切换语言后自动重新翻译当前文本
- **复制图标**: 悬停显示复制按钮，复制成功后显示反馈
- **自适应窗口**: 窗口高度根据内容长度自动调整
- **设置保存**: 快捷键、默认语言等设置自动保存

## 界面预览

```
┌────────────────────────────────────┐
│ EN → 中文                    ⚙️  ✕ │
├────────────────────────────────────┤
│                                    │
│ The quick brown fox jumps over    │
│ the lazy dog.                     │
│ ─────────────────────────────────  │
│ 快速的棕色狐狸跳过了懒惰的狗。       │
│                                    │
└────────────────────────────────────┘
```

## 技术栈

- **Electron**: 跨平台桌面应用框架
- **TypeScript**: 类型安全的 JavaScript
- **Vite**: 快速的前端构建工具
- **google-translate-api-x**: 翻译服务
- **vitest**: 单元测试框架

## 项目结构

```
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts    # 应用入口
│   │   ├── window.ts   # 翻译窗口管理
│   │   ├── selection.ts # 剪贴板读取
│   │   ├── translation.ts # 翻译服务
│   │   ├── shortcut.ts  # 全局快捷键
│   │   ├── settings.ts  # 设置管理
│   │   └── ipc-handlers.ts # IPC 通信
│   ├── preload/         # 预加载脚本
│   │   └── index.ts    # 暴露 API 给渲染进程
│   ├── renderer/       # 渲染进程 (UI)
│   │   ├── index.html # HTML 模板
│   │   ├── main.ts    # UI 逻辑
│   │   └── style.css  # 样式
│   └── shared/        # 共享类型
│       └── types.ts   # TypeScript 类型定义
├── dist/              # 构建输出
├── vitest.config.ts   # Vitest 配置
├── vite.config.ts     # Vite 配置
└── package.json
```

## 安装与运行

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建

```bash
# 构建生产版本
npm run build

# 运行生产版本
npm start
```

### 测试

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch
```

## 使用方法

1. **复制文本**: 在任意应用中选中文字并复制 (`Cmd+C`)
2. **触发翻译**: 按 `Cmd+Shift+T` 打开翻译面板
3. **切换语言**: 点击源语言/目标语言按钮选择翻译语言
4. **复制结果**: 悬停到译文旁边，点击复制图标

## 设置

点击面板右上角的 ⚙️ 图标可以配置:

- **快捷键**: 自定义触发翻译的键盘快捷键
- **默认源语言**: 翻译默认使用的源语言
- **默认目标语言**: 翻译默认使用的目标语言
- **Google API Key**: (可选) 使用 Google Cloud Translation API

## 注意事项

- 当前仅支持 macOS 系统
- 首次使用需要授予辅助功能权限（如需要）
- 使用系统剪贴板获取选中文本，需要先复制再翻译

## License

MIT
