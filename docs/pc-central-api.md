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

#### **2. UpdateStatus**
- **描述**: 客户端定期发送自身的状态更新。
- **消息格式**:
  ```json
  {
    "type": "UpdateStatus",
    "pcID": "PC1",
    "clientIP": "192.168.1.101",
    "serverConnected": true,
    "clientConnected": false
  }
  ```
---

#### **3. TimelineEnd**
- **描述**: 客户端发送时间线结束信号。
- **消息格式**:
  ```json
  {
    "type": "TimelineEnd",
    "clientIP": "192.168.1.101"
  }
  ```
---

#### **4. LocationUpdate**
- **描述**: 客户端发送自身位置信息。
- **消息格式**:
  ```json
  {
    "type": "LocationUpdate",
    "clientIP": "192.168.1.101",
    "position": {
      "transforms": [
        {
          "l": [28.81, 4.08, 0.0],
          "r": [55.92, 21.26, -106.34],
          "s": [1.0, 1.0, 1.0]
        }
      ]
    }
  }
  ```


### 中控 → 客户端消息

#### **1. LaunchGame**
- **描述**: 中控向客户端发送启动游戏指令。
- **消息格式**:
  ```json
  {
    "type": "LaunchGame",
    "connectionType": "server",
    "MsPlayerName": "Player1",
    "MsCharacterIndex": 2,
    "padId": "0.123",
    "groupId": "1001"
  }
  ```
---

#### **2. StartTimeline**
- **描述**: 中控通知客户端开始时间线。
- **消息格式**:
  ```json
  {
    "type": "StartTimeline"
  }
  ```
---
#### **3. LocationBroadcastFromCentralPC**
- **描述**: 中控广播所有位置信息。
- **消息格式**:
  ```json
  {
    "type": "LocationBroadcastFromCentralPC",
    "positions": {
      '192.168.1.102': { transforms: [ [Object], [Object] ] },
      '192.168.1.105': { transforms: [ [Object], [Object] ] }
    }
  }
  ```
---

### HTTP API

#### **1. POST `/launch-game`**
- **描述**: 向多个客户端发送启动游戏指令。
- **请求格式**:
  ```json
  {
    "0.123": {
      "groupId": 1001,
      "serverIp": "192.168.1.101",
      "configs": {
        "config0": {
          "MsPlayerName": "Player1",
          "MsCharacterIndex": 2,
          "clientIp": "192.168.1.102"
        }
      }
    }
  }
  ```
- **响应**:
  ```json
  { "message": "LaunchGame commands sent to PCs" }
  ```

---

#### **2. POST `/start-timeline`**
- **描述**: 启动时间线。
- **请求格式**:
  ```json
  {
    "mainServerIp": "192.168.1.101",
    "padId": "0.123",
    "groupId": 1001
  }
  ```
- **响应**:
  ```json
  { "message": "startTimeline command sent to server" }
  ```

---
