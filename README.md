# 仝心 TongXin - 智能心理健康服务平台

## 项目简介

仝心 TongXin 是一个基于 Vue 3 和 Node.js 开发的智能心理健康服务平台，结合 LangChain 框架与 RAG（检索增强生成）技术，旨在为用户提供专业的心理健康支持、情绪追踪以及自助干预工具。项目依托于大语言模型（如 DeepSeek），为您搭建一个随时倾听、提供专业心理指导的 AI 助手。

## 核心功能

- **智能 AI 对话 (RAG 增强)**：基于 LangChain 整合本地心理学知识库（RAG），结合 DeepSeek 模型的强大能力，提供具有专业背景知识的心理健康与疏导对话。
- **情绪追踪与可视化**：每日记录用户情绪状态，利用 ECharts 提供直观的情绪波动周期图表分析。
- **专业心理评测**：内置专业的心理健康测评问卷体系，支持多维度的数据结果分析。
- **心理自助工具箱**：提供放松练习音频指导以及心理健康相关资料等自主舒缓工具。
- **数据中心与内容管理**：用户数据全方位统计和可视化展示。
- **个人中心设置**：支持主题切换（白天/暗夜模式）及细致的个人信息管理。

## 技术栈

### 前端 (TongXin-web)
- **核心框架**：Vue 3 + Vite
- **状态管理**：Pinia
- **路由控制**：Vue Router 4
- **UI 组件库**：Element Plus
- **图表展示**：ECharts
- **文档渲染**：Marked + DOMPurify
- **富文本**：WangEditor

### 后端 (TongXin-server)
- **运行环境**：Node.js + Express
- **AI 与大模型驱动**：LangChain + @langchain/openai
- **持久化存储**：MySQL 8.x + mysql2 (Promise 封装)
- **鉴权认证**：JWT (JSON Web Token)

## 快速开始

### 运行环境要求

- Node.js >= 18.x
- MySQL >= 8.x
- npm >= 9.x

### 安装与数据库配置

1. **克隆项目并安装依赖**
```bash
git clone <repository-url>
cd TongXin

# 安装后端依赖
cd TongXin-server
npm install

# 安装前端依赖
cd ../TongXin-web
npm install
```

2. **数据库初始化**
   - 创建名为 `tongxin` 的 MySQL 数据库。
   - 运行后端提供的初始化脚本以构建数据表结构：
     ```bash
     cd TongXin-server
     node scripts/run-init-sql.js
     ```

3. **环境变量及模型配置**
   - 在后端通过 `.env` 文件填入数据库连接信息及鉴权密钥。
   - 配置大模型 API Key。在 `TongXin-server/src/config/aiConfig.js` 中设定（如 DeepSeek API 或兼容 OpenAI 的智谱大模型配置）。
   - 前端可在 `.env.development` 中配置自动登录凭证：
     ```env
     VITE_AUTO_LOGIN_USER=admin
     VITE_AUTO_LOGIN_PASSWORD=admin123
     ```

### 启动服务

**方法一：使用启动脚本（推荐）**
```bash
# PowerShell
.\start-dev.ps1

# 或 Batch
start-dev.bat
```

**方法二：手动启动**
```bash
# 启动后端服务服务（推荐在新终端运行）
cd TongXin-server
npm start 或者 npm run dev

# 启动前端应用（推荐在新终端运行）
cd TongXin-web
npm run dev
```

- 前端默认访问地址：[http://localhost:5173](http://localhost:5173)
- 后端默认 API 地址：[http://localhost:3000](http://localhost:3000)

## 项目结构

```text
TongXin/
├── Kb/                         # 本地心理学知识库（针对 RAG 检索建模）
│   └── 心理治疗手册.md
├── TongXin-server/             # 后端 Express 服务
│   ├── scripts/                # 脚本工具 (init-db.sql, run-init-sql.js 等)
│   ├── src/
│   │   ├── config/             # DB 连接、环境变量与 AI 参数配置
│   │   ├── controllers/        # 业务逻辑控制器 (assessment, auth, chat, emotion)
│   │   ├── routes/             # RESTful API 路由模块
│   │   ├── services/           # 核心支持服务 (langchainService, ragService)
│   │   ├── utils/              # 助手工具类 (helpers, pixues 等)
│   │   ├── app.js              # Express 实例及中间件组装
│   │   └── server.js           # 主应用入口
│   └── package.json            # 后端依赖配置
├── TongXin-web/                # 前端 Vue 3 Web 应用
│   ├── public/                 # 静态资源 (如音频/relax)
│   ├── src/
│   │   ├── api/                # 后端 Axios 请求接口封装 (auth 等)
│   │   ├── components/         # 全局复用组件 (Navbar, Sidebar, ThemeSwitcher)
│   │   ├── layouts/            # 页面骨架层 (AdminLayout)
│   │   ├── router/             # Vue Router 配置
│   │   ├── stores/             # Pinia 状态管理器 (auth, layout)
│   │   ├── utils/              # 纯功能工具 (request, storage, theme)
│   │   └── views/              # 系统视图功能区
│   │       ├── admin/          # 管理员功能
│   │       ├── analytics/      # 数据分析报告
│   │       ├── assessment/     # 问卷评测业务
│   │       ├── auth/           # 认证登录中心
│   │       ├── chat/           # 智能辅导对话流
│   │       ├── emotion/        # 情绪追踪展示
│   │       ├── profile/        # 个人信息及设置
│   │       └── tools/          # 自治协助工具
│   ├── vite.config.js          # Vite 构建配置
│   └── package.json            # 前端依赖配置
├── start-dev.bat               # Windows 快捷启动脚手架
└── start-dev.ps1               # PowerShell 启动脚本
```

## 部署说明

### 前端生产环境构建
```bash
cd TongXin-web
npm run build
```
编译生成的静态页面将输出至 `dist` 目录，可直挂于 Nginx 等各类静态 Web 服务下做代理引流。

### 后端生产环境部署
1. 确保目标服务器装有 Node.js 及 MySQL 等底层系统要求。
2. 配置好线上数据库连接及大模型的鉴权 Key。
3. 推荐使用 `PM2` 进程管理套件进行后台守护和资源调控：
```bash
cd TongXin-server
npm install -g pm2
pm2 start src/server.js --name "TongXin-API"
```