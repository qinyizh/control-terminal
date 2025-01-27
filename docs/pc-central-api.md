# WebSocket API 文档

## 概述
该 WebSocket API 是为中控服务器设计的，用于与前端和多个客户端（PC、Engine 等）通信，支持游戏启动、状态更新、位置数据广播等功能。

- **服务器地址**: `ws://<server-ip>:8080`
- **HTTP API 地址**: `http://<server-ip>:3000`
- **WebSocket 端口**: `8080`
- **前端静态文件服务端口**: `3000`
- **认证方式**: 无需认证

---

## 功能概述

### WebSocket 消息类型

| **消息类型**             | **方向**         | **描述**                                   |
|--------------------------|------------------|--------------------------------------------|
| `RegisterPC`             | Client → Server | 客户端向中控服务器注册自身信息              |
| `UpdateStatus`           | Client → Server | 客户端更新状态信息（连接状态、游戏状态等）  |
| `TimelineEnd`            | Client → Server | 客户端向中控发送时间线结束信号              |
| `LocationUpdate`         | Client → Server | 客户端发送位置信息更新                      |
| `PCStatusUpdate`         | Server → Frontend | 中控广播 PC 状态更新                        |
| `LocationBroadcastFromCentralPC` | Server → Client | 中控向客户端广播所有服务器的位置信息         |
| `LaunchGame`             | Server → Client | 中控通知客户端启动游戏                      |
| `StartTimeline`          | Server → Client | 中控通知客户端开始时间线                    |

---

## WebSocket 消息说明

### 客户端 → 中控消息

#### **1. RegisterPC**
- **描述**: 客户端连接后发送注册信息。
- **消息格式**:
  ```json
  {
    "type": "RegisterPC",
    "pcID": "PC1",
    "pcType": "server",
    "clientIP": "192.168.1.101"
  }

