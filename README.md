# 仝心 TongXin

<div align="center">
  <img src="https://img.shields.io/badge/Vue-3.x-green.svg" alt="Vue">
  <img src="https://img.shields.io/badge/Node.js-18.x-blue.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.x-blue.svg" alt="Express">
  <img src="https://img.shields.io/badge/MySQL-8.x-orange.svg" alt="MySQL">
  <img src="https://img.shields.io/badge/DeepSeek-API-purple.svg" alt="DeepSeek">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</div>

## 📋 项目简介

仝心 TongXin 是一个基于 Vue 3 和 Node.js 开发的智能心理健康服务平台，旨在为用户提供专业的心理健康支持和自助工具。

### ✨ 核心功能

- **智能AI对话**：基于DeepSeek API的专业心理健康对话，支持上下文记忆
- **情绪追踪**：记录和分析用户情绪变化，提供可视化数据
- **自助工具**：
  - 心理健康测试
  - 放松练习指导
  - 心理健康资源中心
- **数据中心**：用户数据统计和分析，可视化展示
- **个人中心**：用户信息管理和偏好设置
- **管理员功能**：内容管理和用户管理

## 🛠️ 技术栈

### 前端
- **框架**：Vue 3 + Vite
- **状态管理**：Pinia
- **路由**：Vue Router
- **UI组件库**：Element Plus
- **HTTP客户端**：Axios
- **图表库**：ECharts
- **富文本编辑器**：WangEditor

### 后端
- **语言**：Node.js
- **框架**：Express
- **数据库**：MySQL
- **ORM**：mysql2/promise
- **认证**：JWT (JSON Web Token)
- **AI接口**：DeepSeek API

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- MySQL >= 8.x
- npm >= 9.x

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd TongXin
```

2. **安装后端依赖**
```bash
cd TongXin-server
npm install
```

3. **安装前端依赖**
```bash
cd ../TongXin-web
npm install
```

### 数据库配置

1. 创建MySQL数据库
```sql
CREATE DATABASE tongxin;
```

2. 配置 AI Key
```bash
# 在 TongXin-server/src/config/aiConfig.js 中配置：
# auth.deepseekApiKey
# auth.zhipuApiKey
```

### 启动服务

#### 方法一：使用启动脚本（推荐）
```bash
# PowerShell
.\start-dev.ps1

# 或 Batch
start-dev.bat
```

#### 方法二：手动启动
```bash
# 启动后端
cd TongXin-server
npm start

# 启动前端（新终端）
cd TongXin-web
npm run dev
```

### 访问地址

- 前端：http://localhost:5173
- 后端API：http://localhost:3000

## 📁 项目结构

```
TongXin/
├── TongXin-server/           # 后端服务
│   ├── config/              # 配置文件
│   │   └── database.js      # 数据库配置
│   ├── controllers/         # 控制器
│   │   ├── authController.js      # 认证控制器
│   │   ├── messageController.js   # 消息控制器
│   │   └── sessionController.js   # 会话控制器
│   ├── routes/              # 路由
│   │   ├── auth.js          # 认证路由
│   │   ├── messages.js      # 消息路由
│   │   └── sessions.js      # 会话路由
│   ├── server.js            # 主服务文件
│   ├── package.json         # 依赖配置
│   └── .env                 # 环境变量
├── TongXin-web/             # 前端项目（Vue + Vite）
│   ├── src/                 # 源代码
│   ├── public/              # 静态资源
│   ├── package.json         # 依赖配置
│   └── vite.config.js       # Vite配置
├── start-dev.bat            # Windows启动脚本
├── start-dev.ps1            # PowerShell启动脚本
└── README.md                # 项目说明
```

## 📖 API文档

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户信息

### 消息相关

- `POST /api/messages` - 发送消息
- `GET /api/messages/:sessionId` - 获取会话消息
- `POST /api/messages/session` - 创建新会话

### 会话相关

- `GET /api/sessions` - 获取用户会话列表
- `DELETE /api/sessions/:sessionId` - 删除会话

## 🔧 开发说明

### 环境变量

#### 开发环境 (.env.development)
- 自动登录已启用
- API地址: http://localhost:3000
- 前端地址: http://localhost:5173

#### 生产环境 (.env.production)
- 自动登录已关闭
- 需要手动输入用户名密码

### 自动登录功能

开发环境下，系统会自动登录，无需手动输入：
- 用户名: admin
- 密码: admin123

如需修改自动登录账号，请编辑 `.env.development` 文件：
```
VITE_AUTO_LOGIN_USER=your_username
VITE_AUTO_LOGIN_PASSWORD=your_password
```

## 🚀 部署说明

### 前端部署
```bash
cd TongXin-web
npm run build
# 部署 dist 目录到静态服务器
```

### 后端部署
```bash
cd TongXin-server
npm start
# 使用 PM2 等进程管理器管理服务
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Vue.js](https://vuejs.org/)
- [Element Plus](https://element-plus.org/)
- [DeepSeek](https://www.deepseek.com/)
- [Express](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)

---

**注意**: 本项目仅供学习和参考，正式使用时请确保遵守相关法律法规和平台规定。