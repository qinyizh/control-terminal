
# Engine Server WebSocket API 文档

## 概述
该文档描述了 **Engine Server** 需要提供的与 PC 客户端对接的 WebSocket API，定义了消息类型和通信流程。**Engine Server** 通过 WebSocket 接收 PC 的指令并返回相应的游戏状态、位置信息等。

- **监听端口**: `9000`（可在 `config.json` 中配置 `serverPort`）
- **连接参数**: 必须在 WebSocket URL 查询参数中提供 `pcID`，例如: `ws://<engine-server-ip>:9000?pcID=PC1`

### Engine Server → PC 消息

#### **1. GameStatus**

- **描述**: 游戏状态更新通知。
- **消息格式**:
  ```json
  {
    "type": "GameStatus",
    "serverInGame": true
  }
  ```

---

#### **2. LocationData**

- **描述**: 发送当前位置信息。
- **消息格式**:
  ```json
  {
    "type": "LocationData",
    "position": {
      "transforms": [
        { "l": [28.8, 4.1, 0.0], "r": [55.9, 21.2, -106.3], "s": [1.0, 1.0, 1.0] },
        { "l": [10.1, 5.6, 2.0], "r": [30.0, 45.0, 90.0], "s": [2.0, 2.0, 2.0] }
      ]
    }
  }
  ```

---

#### **3. TimelineEnd**

- **描述**: 时间线结束通知。
- **消息格式**:
  ```json
  {
    "type": "TimelineEnd",
    "success": true
  }
  ```

---
---

## 消息类型

### PC → Engine Server 消息

#### **1. LaunchGame**
- **描述**: 通知 **Engine Server** 启动游戏。
- **消息格式**:
  ```json
  {
    "type": "LaunchGame"
  }
#### **2. LocationBroadcastFromCentralPC**

- **描述**: 接收中控服务器广播的位置信息。
- **消息格式**:
  ```json
  {
    "type": "LocationBroadcastFromCentralPC",
    "data": {
      "positions": {
        "192.168.1.101": {
          "transforms": [
            { "l": [28.8, 4.1, 0.0], "r": [55.9, 21.2, -106.3], "s": [1.0, 1.0, 1.0] },
            { "l": [10.1, 5.6, 2.0], "r": [30.0, 45.0, 90.0], "s": [2.0, 2.0, 2.0] }
          ]
        }
      }
    }
  }
  ```

---



## 流程说明

1. **连接建立**: PC 客户端通过 WebSocket 连接到 **Engine Server**，并通过查询参数传递 `pcID`。
2. **游戏启动**: PC 客户端发送 `LaunchGame` 指令，**Engine Server** 启动游戏并返回游戏状态。
3. **时间线开始**: PC 客户端发送 `StartTimeline` 指令，**Engine Server** 模拟位置信息并定时返回，时间线结束后发送 `TimelineEnd` 消息。
4. **位置广播处理**: **Engine Server** 接收中控服务器广播的位置信息并处理。
