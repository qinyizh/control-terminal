# PC Client WebSocket API 文档

## 概述
该 API 文档描述了 PC 客户端与中控服务器和 Engine Server/Client 的通信。PC 客户端在启动时通过 WebSocket 连接到中控服务器和 Engine Server/Client，支持游戏启动、状态更新、位置数据转发等功能。

### 配置文件
- **配置文件路径**: `config.json`（必须位于可执行文件同目录）
- **主要配置项**:
  - `controlServerUrl`: 中控服务器的 WebSocket URL
  - `engineServerUrl`: Engine Server 的 WebSocket URL
  - `engineClientUrl`: Engine Client 的 WebSocket URL
  - `pcID`: 当前 PC 的唯一标识符
  - `clientIP`: 当前 PC 的 IP 地址
  - `serverExeLocation`: 执行 Engine Server 程序的位置
  - `clientExeLocation`: 执行 Engine Client 程序的位置
  - `timelineExeLocation`: 执行时间线程序的位置

---

## WebSocket 消息类型

### 客户端 → 中控服务器消息

#### **1. RegisterPC**
- **描述**: 客户端启动时，注册到中控服务器。
- **消息格式**:
  ```json
  {
    "type": "RegisterPC",
    "pcID": "PC1",
    "pcType": "server",
    "clientIP": "192.168.1.101"
  }
