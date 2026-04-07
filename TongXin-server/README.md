# 仝心 TongXin - 后端服务

## 目录

当前目录即后端服务目录：

```text
TongXin-server/
```

## 环境要求

- Node.js >= 18
- MySQL >= 8

## 安装依赖

```bash
cd TongXin-server
npm install
```

## 初始化数据库

```bash
node scripts/run-init-sql.js
```

默认会创建并使用数据库 `tongxin`。

## 启动服务

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务地址：

- http://localhost:3000

## 常见问题

- 若连接数据库失败，请检查 `src/config/db.js` 中的 MySQL 连接配置（host/user/password/database）。
- 若 DeepSeek / 智谱接口调用失败，请检查 `src/config/aiConfig.js` 中 `auth.deepseekApiKey` 与 `auth.zhipuApiKey` 是否正确。

## RAG 说明

- 启动后端时会自动读取根目录 `Kb/` 下全部知识文件（支持 `.md/.markdown/.txt`），切片并写入向量表 `rag_documents`。
- 用户新增或修改情绪日记后，会自动刷新最近 7 天情绪摘要向量。
- 聊天接口会检索「手册知识 + 用户近期心理活动」后再生成回复。
- 若你更新了手册内容，可手动重建索引：

```bash
POST /api/messages/rag/reindex?force=true
```

说明：当前 DeepSeek 账户若无 Embedding 模型权限，会自动降级为本地哈希向量，不影响 RAG 流程可用性。
