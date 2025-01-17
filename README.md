
## **项目概述**
该项目包含：
- 一个基于 React 的前端，用于配制和启动游戏。
- 一个基于 Node.js 和 WebSocket 的中控服务器，用于管理和同步多个 PC 的连接状态。
- PC 客户端用于与中控服务器交互，并与 Engine Server 和 Engine Client 建立连接。

---

## **功能说明**
1. **中控服务**：
   - 管理 50 台 PC 的连接状态，支持 PC 动态加入和断开，自动更新状态。
   - 支持多前端客户端（如监控面板）连接到中控服务。向所有前端客户端同步 PC 和 Engine 的实时状态。
   - 管理并定期广播位置信息。
   - 定期将所有连接状态和历史记录加密存储到 JSON 文件。在中控服务重启时，从文件加载状态，恢复之前的记录。

2. **PC 客户端**：
   - 与中控服务器连接并更新状态。
   - 与engine server 和 engine client连接并更新状态。
   - 接收并转发位置信息。

3. **前端**：
   - 可视化展示 PC 和 Engine 的状态。
   - 游戏组的创建，配制，删除
   - 按键启动客户端和启动剧情timeline
   - 计时器显示游戏进程
   - 页面刷新后可自动加载之前的状态

---

## **技术栈**
- **前端**：React, WebSocket
- **中控服务**：Node.js, WebSocket
- **PC 客户端**：Node.js, WebSocket

---

## **文件结构**
```
control-terminal/
├── pc-central/              # 中控服务代码
│   ├── index.js                 # 中控服务主逻辑
│   ├── storage.js               # 状态管理与文件存储
│   └── state.json               # 持久化状态文件
├── pc-client-simulation/                  # PC 客户端
│   ├── simulate.js              # 模拟客户端
│   ├── config.json              # PC 配置文件
├── engine/                      # Engine 服务
│   ├── engine-server.js         # 模拟 Engine Server
│   ├── engine-client.js         # 模拟 Engine Client
│   ├── config.json              # Engine 配置文件
├── react-client/                # 前端代码
│   └── components/
│       ├── DataSourceConfig.jsx # 数据源配置
│       ├── GroupConfig.jsx      # 组配置
│       ├── config.jsx           # 配置文件
│   ├── App.js                   # 前端主组件
│   └── styles/
│       ├── DataSourceConfig.scss 
│   ├── websocket.js             # WebSocket 逻辑
│   ├── package.json             # 前端依赖管理
├── README.md                    # 项目说明文档
```

---

## **安装与运行**

### **1. 克隆仓库**
```bash
git clone https://github.com/qinyizh/control-terminal.git
cd control-terminal
```

### **2. 安装依赖**

#### **中控服务**
```bash
cd pc-central
npm install
```

#### **前端**
```bash
cd react-client
npm install
```

---

### **3. 启动项目**

#### **1. 启动中控服务**
```bash
cd pc-central
node index.js
```

#### **2. 启动 PC 客户端**
```bash
cd pc-client-simulation
node simulate.js
```

#### **3. 启动前端**
```bash
cd react-client
npm run dev
```

打开浏览器访问 `http://localhost:3000`。

---

## **作者**
- **开发者**: Qinyi Zhang
- **联系邮箱**: qinyizh@gmail.com
- **GitHub**: [qinyizh](https://github.com/qinyizh)

---
