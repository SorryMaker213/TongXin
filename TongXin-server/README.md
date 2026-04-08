# 仝心 TongXin - 后端服务 (TongXin-server)

## 项目简介

这是仝心 TongXin 智能心理健康服务平台的后端核心支撑系统。基于 Node.js 和 Express 构建，并深度整合了大语言模型（如 DeepSeek、智谱等）及 LangChain 框架，旨在提供稳定、安全的 RESTful API。后端服务不仅处理常规的用户认证、情绪打卡追踪、心理测评数据分析，还提供专业级别的智能 AI 心理顾问对话生成能力。

## 核心技术栈

- **运行环境**：Node.js >= 18
- **服务框架**：Express
- **数据库**：MySQL >= 8.x + `mysql2/promise` (纯 Promise 驱动)
- **鉴权认证**：JWT (JSON Web Token)
- **AI 与大模型设施**：LangChain `(@langchain/openai, @langchain/core)`
- **主要配置模块**：dotenv, cors

## 快速开始

### 1. 安装依赖

```bash
cd TongXin-server
npm install
```

### 2. 数据库配置及初始化

请确保宿主机上已运行 MySQL >= 8.0 实例。然后运行提供的初始化脚手架脚本：

```bash
# 执行数据库建表和默认记录预置
node scripts/run-init-sql.js
```
该命令将尝试通过 `root` 用户连接，自动创建且选中应用数据库 `tongxin`。

### 3. 配置环境变量和 AI 密钥

针对复杂的数据库连接信息等需求，您可于本目录创建 `.env` 文件。
AI 模型服务密钥目前主要配置在 `src/config/aiConfig.js` 中（也支持通过环境参数注入）：
- `auth.deepseekApiKey` - 驱动核心问答的 DeepSeek API Key。
- `auth.zhipuApiKey` - 备选预留的大模型服务接口密钥。

### 4. 启动服务

**开发模式（支持热重载）：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

服务默认运行并侦听：
- [http://localhost:3000](http://localhost:3000)

## 项目结构说明

```text
TongXin-server/
├── scripts/                # 自动化建库与维护脚本
│   ├── init-db.sql         # 数据库表结构和测试数据约束
│   └── run-init-sql.js     # 初始化 SQL 的一键执行入口
├── src/
│   ├── config/             # 配置中心层
│   │   ├── aiConfig.js     # AI 模型及其底层参数配置
│   │   ├── db.js           # MySQL 连接池实例创建 
│   │   └── env.js          # 系统级全局变量引入
│   ├── controllers/        # 核心业务逻辑控制器
│   │   ├── assessmentController.js   # 测评问卷下发及统计逻辑
│   │   ├── authController.js         # JWT 用户身份验证生成与检查
│   │   ├── chatController.js         # 智能对话中控与消息管理
│   │   └── emotionController.js      # 情绪数据打卡、记录分析
│   ├── routes/             # 各接口路由配置及绑定
│   ├── services/           # 高级计算层 (LangChain、RAG服务与封装)
│   │   ├── langchainService.js # 对接大模型的格式化封装和生成链 
│   │   └── ragService.js     # RAG 核心支持系统与知识库操作
│   ├── utils/              # 通用的独立工具函数
│   ├── app.js              # Express 实例化及全局中间件应用池
│   └── server.js           # 应用程序启动网关
└── package.json            # 依赖锁定
```

## RAG (检索增强生成) 说明

- 本端在启动服务时，系统会自动探查并读取外层根目录 `Kb/` 下包含的全部知识文件（兼容 `.md/.markdown/.txt`）。读取完成后将其进行语义化切片，进而提取向量特征并写入至检索从表 `rag_documents` 中。
- **动态情绪背景注入**：得益于模块联动，用户每次新增或修改“情绪日记/追踪”后，RAG 系统会在后台自驱动地刷新其最近 7 天内的情绪摘要向量。
- **对话混合检索**：在此配置下，聊天接口在响应客户诉求的过程中，将实时调配检索「本地知识手册」与「用户近期心理活动剪影」，以此作为 Prompt 支持再生成后续答复。
- **强制重建机制**：假如您更新或覆写了外设手册资源，可向后端手动发起 API 以全量重建知识索引库：
  ```bash
  POST /api/messages/rag/reindex?force=true
  ```
- **降级适配服务**：考虑到不同云服务提供商限额影响，当前绑定的 DeepSeek 账户若无法使用 Embedding 子模型解析文本向量，本端会自动启用降级模式：计算映射「本地哈希向量检索」。这能稳定保障基础 RAG 服务正常运行而不致奔溃。

## 常见问题排查

- 若遇到数据库“连接失败”或“鉴权拒绝”等报错，请自查 `src/config/db.js` 或 `.env` 的配置（含 host/user/password/database），确保本地已赋权且对应服务正在运行中。
- 当大模型端点遭遇频繁连接拒绝调用或“未授权”的情况时，推荐您核查 `src/config/aiConfig.js` 中注册的 `auth.deepseekApiKey` 等密钥条目是否有效，以避免引发对话失联或无响应异常。
