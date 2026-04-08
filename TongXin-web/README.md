# 仝心 TongXin - 前端应用 (TongXin-web)

## 项目简介

这是仝心 TongXin 智能心理健康服务平台的前端应用。项目基于 Vue 3 (Composition API) + Vite 构建，结合 Element Plus 提供清爽易用的用户界面，为用户提供智能 AI 心理对话、情绪每日追踪、专业心理评测、以及放松自助等一站式客户端服务体验。

## 核心技术栈

- **框架支持**：Vue 3 + Vite
- **状态管理**：Pinia
- **路由控制**：Vue Router 4
- **UI 组件库**：Element Plus
- **图表展示**：ECharts（情绪波动图等可视化）
- **Markdown 渲染**：Marked + DOMPurify（防止 XSS 的同时支持 Markdown 内容，用于 AI 对话）
- **富文本**：WangEditor
- **请求封装**：Axios

## 核心功能模块

- **智能会话 (views/chat)**：深度定制的对话流 UI，支持连续对话与 Markdown 格式回答展现。
- **情绪监测 (views/emotion)**：通过 ECharts 展示不同时间粒度下用户的情绪波动轨迹。
- **心理评测 (views/assessment)**：支持多阶段问卷调查流程与结果数据展示。
- **自助工具区 (views/tools)**：包含放松练习音频等本地静态资源体验。
- **用户档案与主题管理**：集成了全局响应式主题切换（`ThemeSwitcher`，支持黑夜/白天模式）与资料管理。
- **管理与统计 (views/admin, views/analytics)**：独立的鉴权布局和数据可视化面板组件。

## 快速开发与构建

### 1. 安装依赖

确保已安装好 Node.js >= 18.x 及合适版本的 npm，切换到该目录下执行：

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

启动后访问：[http://localhost:5173](http://localhost:5173)

**注意**：接口默认通过 Vite 服务代理解析转发到 `http://localhost:3000`。关于代理的详细配置请于 `vite.config.js` 中调整查阅，并且请确保您的后端(TongXin-server)同样在运行中。

### 3. 构建生产发布包

```bash
npm run build
```

产出物将被放置于 `dist` 目录内，可用其部署发布于任何静态 Web 服务器 (Nginx, Vercel 等)。

### 4. 预览生产构建

```bash
npm run preview
```

## 目录结构说明

```text
TongXin-web/
├── public/                 # 根级公共静态资源 (包括放松训练音频与基础应用图标)
├── src/
│   ├── api/                # Axios 请求服务接口聚合封装 (如 auth.js)
│   ├── assets/             # 需被打包系统处理的局部静态资源
│   ├── components/         # 页面公共零散组件 (Navbar, Sidebar, ThemeSwitcher 等)
│   ├── config/             # 客户端功能模块相关配置
│   ├── layouts/            # 核心路由的布局容器配置 (如 AdminLayout.vue)
│   ├── router/             # 前端应用的路由配置信息表中心
│   ├── stores/             # Pinia 的数据中心 (诸如身份状态 auth.js, GUI 状态 layout.js 等)
│   ├── utils/              # 通用业务脱离工具类 (如 request, storage, theme)
│   └── views/              # 用户产品主导的 Vue 视图文件群
│       ├── admin/          # 管理级主控台视图
│       ├── analytics/      # 可视化数据分析流层
│       ├── assessment/     # 用户心理状态测评业务流
│       ├── auth/           # 用户进销登录鉴权界面
│       ├── chat/           # 智能对话聊天窗UI
│       ├── emotion/        # 情绪打卡追踪模块
│       ├── profile/        # 用户系统设定项视图
│       └── tools/          # 综合援助性功能小工具
├── vite.config.js          # Vite 构建与运行策略配置
└── package.json            # 核心声明信息及包管理目录
```
