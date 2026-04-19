# 画词翻译面板设计

## 概述

一款全局翻译工具，用户在任意应用中选中文字后，按下快捷键即可弹出翻译面板，显示原文、音标/发音和翻译结果，支持复制功能。

## 目标平台

- **技术栈**: Electron
- **作用范围**: 全局生效（任何应用选中文字都能用）

## 核心功能

| 功能 | 描述 |
|------|------|
| 全局快捷键 | 默认 `Cmd+Shift+T`，可自定义 |
| 获取选中文字 | 通过系统 API（macOS: Accessibility API） |
| 翻译面板 | 靠近鼠标位置显示 |
| 翻译服务 | Google Translate API（用户自备 API Key） |
| 复制功能 | 翻译结果可一键复制 |
| 语言切换 | 支持中↔英等多语言组合 |

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│  Electron 主进程 (main process)                               │
│  ├── 全局快捷键监听 (globalShortcut)                         │
│  ├── 系统 API 交互 (获取选中文字)                              │
│  ├── 翻译服务 (translate)                                     │
│  └── 翻译窗口管理 (BrowserWindow)                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  翻译面板窗口 (translation-window)                           │
│  ├── 原文 (original text)                                    │
│  ├── 音标/发音 (pronunciation)                                │
│  ├── 翻译结果 (translation)                                   │
│  └── 复制按钮 (copy buttons)                                 │
└─────────────────────────────────────────────────────────────┘
```

## 模块设计

### main/index.ts
Electron 主进程入口。

### main/shortcut.ts
注册全局快捷键，触发翻译流程。

### main/selection.ts
| 平台 | API |
|------|-----|
| macOS | Accessibility API (`AXUIElementCopySelectedText`) |
| Windows | UI Automation API (`GetSelectedText`) |
| Linux | AT-SPI (备选) |

### main/translation.ts
调用 Google Translate API 进行翻译。

### main/window.ts
管理翻译面板窗口的创建、显示、隐藏。

### renderer/
翻译面板 UI（原生 HTML 或 React）。

## 数据流

1. 用户选中任意应用的文字
2. 用户按下快捷键 (`Cmd+Shift+T`)
3. 主进程通过系统 API 获取**当前选中文字**
4. 调用翻译 API 获取结果
5. 打开/更新翻译面板，显示原文+音标+翻译
6. 用户点击复制或点击外部/按 Esc 关闭面板

## 用户交互

| 操作 | 行为 |
|------|------|
| 选中文字 + 按快捷键 | 打开翻译面板 |
| 点击面板外部 | 关闭面板 |
| 按 Esc | 关闭面板 |
| 点击复制按钮 | 复制对应内容到剪贴板 |
| 快捷键冲突 | 设置中允许修改快捷键 |

## 设置面板

| 设置项 | 描述 |
|--------|------|
| API Key | Google Translate API Key（加密存储） |
| 快捷键 | 自定义触发快捷键 |
| 默认语言对 | 如 中↔英 |

## 错误处理

| 错误 | 处理 |
|------|------|
| 未选中文字 | 面板提示"请先选中文字" |
| 翻译失败 | 显示错误信息，提供重试按钮 |
| 权限缺失 | 提示用户开启辅助功能权限 |
| 快捷键冲突 | 允许用户在设置中修改快捷键 |

## 项目结构

```
translation-panel/
├── package.json
├── main/
│   ├── index.ts          # 主进程入口
│   ├── shortcut.ts       # 快捷键管理
│   ├── selection.ts      # 系统 API 获取选中文字
│   ├── translation.ts    # 翻译服务
│   └── window.ts         # 窗口管理
├── renderer/
│   ├── index.html        # 面板 HTML
│   ├── styles.css        # 样式
│   └── renderer.ts       # 面板逻辑
├── src/
│   └── settings.ts       # 设置管理
└── README.md
```

## 技术依赖

| 依赖 | 用途 |
|------|------|
| electron | 桌面应用框架 |
| @electron/remote | 主进程与渲染进程通信 |
| google-translate-api | 翻译 API |
| electron-store | 设置存储 |
| electron-log | 日志 |

## 备注

- macOS 需要用户授权"辅助功能"权限
- Windows 需要用户授权"UI 自动化"权限
- Linux 支持有限（备选方案）
