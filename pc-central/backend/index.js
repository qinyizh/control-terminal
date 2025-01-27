const WebSocket = require('ws');
const cors = require('cors');
const express = require('express');
require('dotenv').config();

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 8080;
const fs = require('fs');

const path = require('path');
const { saveToFile, loadFromFile } = require('./storage');
const stateFilePath = path.join(process.cwd(), 'state.json');
const frontendPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});
// 启动 HTTP 服务
app.listen(3000, () => {
  console.log(`Frontend is running at http://localhost:${3000}`);
});


// 初始化状态文件（如果不存在或为空）
if (!fs.existsSync(stateFilePath) || !fs.readFileSync(stateFilePath, 'utf8').trim()) {
  console.log('Initializing state file with default content');
  saveToFile(stateFilePath, { connections: {}, positions: {}, padStatus: {}, padUsageCount: {} });
}
console.log('stateFilePath', loadFromFile(stateFilePath));
let state = loadFromFile(stateFilePath) || { 
  connections: {}, 
  positions: {}, 
  padStatus: {}, //{ padID: [groupID: {}] } 
  padUsageCount: {}  // 记录每个 padID 的游戏计数：{ padID: count }
};
app.use(cors());
app.use(express.json());

// 定时保存状态到文件
setInterval(() => {
  saveToFile(stateFilePath, state);
}, process.env.saveToFileInterval || 5000);

// 定时广播位置数据
setInterval(() => {
  const inGameServerPCs = Object.values(state.connections).filter((pc) => pc.connectionType === 'server' && pc.clientInGame && pc.serverInGame);
  inGameServerPCs.forEach((pc) => {
    //console.log('Broadcasting position data to servers', state.positions);
    if (pc.ws && pc.ws.readyState === WebSocket.OPEN) {
      const positionsExcludeCurrentPC = {...state.positions, dd: 'dd'};
      if (positionsExcludeCurrentPC[pc.clientIP]) {
        delete positionsExcludeCurrentPC[pc.clientIP];  
      }
      pc.ws.send(
        JSON.stringify({
          type: 'LocationBroadcastFromCentralPC',
          positions: positionsExcludeCurrentPC,
        })
      );
      // {
      //   '192.168.1.102': { transforms: [ [Object], [Object] ] },
      //   '192.168.1.105': { transforms: [ [Object], [Object] ] }
      // }

    }
  });
}, process.env.broadcastLocationInterval || 5000); 


wss.on('connection', (ws, req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const remoteAddress = req.socket.remoteAddress.replace('::ffff:', '');
  const clientIP = forwardedFor || remoteAddress;

  broadcastPCListToFrontend(); // 初始化发送 PC 列表

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'RegisterPC') {
        handleRegisterPC(ws, data);
      } else if (data.type === 'UpdateStatus') {
          state.connections[data.clientIP] = {
            ...state.connections[data.clientIP],
            serverConnected: data.serverConnected,
            clientConnected: data.clientConnected,
            clientIP: data.clientIP,
            pcID: data.pcID,
          };
          let newData = {};
          Object.entries(state.connections).forEach(([clientIP, item]) => {
            newData[clientIP] = {
              pcID: item.pcID,
              pcType: item.pcType,
              clientIP: item.clientIP,
              clientInGame: item.clientInGame,
              serverInGame: item.serverInGame,
              serverConnected: item.serverConnected,
              clientConnected: item.clientConnected,
              connectionType: item.connectionType,
              padId: item.padId,
              groupId: item.groupId,
            };
          });
          // console.log(`PC ${data.pcID} ${data.clientIP} status updated:`, state.connections[data.clientIP]);
          broadcastToFrontend({ type: 'PCStatusUpdate', status: newData});
      } else if (data.type === 'TimelineEnd') {
        console.log(`Stop signal received from ${data.clientIP}`);
        broadcastToFrontend({ type: 'TimelineEnd', clientIP: data.clientIP });
        handleTimelineEnd(data);
      } else if (data.type === 'LocationUpdate') {
        //console.log(`Received location data from ${data.clientIP}:`, data.position);
        handleLocationUpdate(data);
      }
    } catch (error) {
      console.error(`Error processing message: ${message}`, error);
    }
  });

  ws.on('close', () => {
    console.log(`Connection closed: ${clientIP}`);
    // 清理失效连接
    Object.keys(state.connections).forEach((clientIP) => {
      if (state.connections[clientIP].ws === ws) {
        delete state.connections[clientIP];
      }
    });
  });
});

function broadcastToFrontend(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function handleTimelineEnd({clientIP}) {
  console.log(`StopGame received from ${clientIP}`);
  if (state.connections[clientIP]) {
    const mainServerConnection = state.connections[clientIP];
    mainServerConnection.clientInGame = false;
    mainServerConnection.serverInGame = false;
    if (mainServerConnection.ws && mainServerConnection.ws.readyState === WebSocket.OPEN) {
      
    }
    const padId = mainServerConnection.padId;
    const groupId = mainServerConnection.groupId;
    const padGroups = state.padStatus[padId] || [];
    const group = padGroups.find((g) => g.groupId === groupId);
    // console.log('group', padGroups);
    // console.log('mainServerConnection', mainServerConnection);
    if (group) {
      group.isRunning = false;
    }
  } else {
    console.warn(`Cannot send 'server' message to ${mainServerIp}: WebSocket not open`);
  }

}
// Start Timeline Command Handler
app.post('/start-timeline', (req, res) => {
  const { mainServerIp, padId, groupId } = req.body;

  if (!mainServerIp || !state.connections[mainServerIp]) {
    return res.status(400).json({ error: 'Invalid or unregistered mainServerIp' });
  }

  const connection = state.connections[mainServerIp];
  // console.log(state.connections[mainServerIp]);
  if (connection && connection.ws && connection.ws.readyState === WebSocket.OPEN) {
    const timelineCommand = {
      type: 'StartTimeline',
    };
    connection.ws.send(JSON.stringify(timelineCommand));
    state.padStatus[padId].forEach((item)=> {
      if(item.groupId === groupId){
        item.isRunning = true;
        item.startTime = Date.now();
      }
    })
    // console.log(`Sent 'startTimeline' command to ${mainServerIp}`);
    res.json({ message: 'startTimeline command sent to server' });
  } else {
    console.warn(`No open WebSocket connection for ${mainServerIp}`);
    res.status(500).json({ error: `Cannot send to ${mainServerIp}: WebSocket not open` });
  }
});

app.post('/launch-game', (req, res) => {
  const commands = req.body;
  const configs = Object.values(Object.values(commands)[0].configs);
  const commandValue = Object.values(commands)[0];
  const padId = Object.keys(commands)[0];
  const groupId = commandValue.groupId;
  const mainServerIp = commandValue.serverIp;
  //console.log(state.connections);
  configs.forEach((config) => {
    const { MsPlayerName, MsCharacterIndex } = config;
    const clientIp = config.clientIp.clientIP;
    if (state.connections[mainServerIp]) {
      // Send 'server' message to mainServerIp
      // console.log(state.connections[mainServerIp]);
      let mainServerConnection = state.connections[mainServerIp];
      mainServerConnection.connectionType = 'server';
      mainServerConnection.clientInGame = true;
      mainServerConnection.serverInGame = true;
      mainServerConnection.padId = padId;
      mainServerConnection.groupId = groupId;
      if (mainServerConnection.ws && mainServerConnection.ws.readyState === WebSocket.OPEN && mainServerIp === clientIp) {
        const serverMessage = {
          connectionType: 'server',
          MsPlayerName,
          MsCharacterIndex,
          padId,
          groupId,
          type: 'LaunchGame',
          IpAddress: mainServerIp
        };
        mainServerConnection.ws.send(JSON.stringify(serverMessage));
        console.log(`Sent 'server' message to ${mainServerIp}:`, serverMessage);
      }
    } else {
      console.warn(`Cannot send 'server' message to ${mainServerIp}: WebSocket not open`);
    }

    if (state.connections[clientIp]) {
      // Send 'client' message to clientIp
      let clientConnection = state.connections[clientIp];
      clientConnection.connectionType = 'client';
      clientConnection.clientInGame = true;
      clientConnection.serverInGame = true;
      clientConnection.padId = padId;
      clientConnection.groupId = groupId;

      if (clientConnection.ws && clientConnection.ws.readyState === WebSocket.OPEN) {
        const clientMessage = {
          connectionType: 'client',
          MsPlayerName,
          MsCharacterIndex,
          padId,
          groupId,
          type: 'LaunchGame',
          IpAddress: mainServerIp
        };
        clientConnection.ws.send(JSON.stringify(clientMessage));
        console.log(`Sent 'client' message to ${clientIp}:`, clientMessage);
      }
    } else {
      console.warn(`Cannot send 'client' message to ${clientIp}: WebSocket not open`);
    }
  });
  if (!state.padStatus[padId]) {
    state.padStatus[padId] = [];
  }
  state.padStatus[padId].push({
    groupId: groupId,
    uiData: Object.values(commands)[0]
  });
  state.padUsageCount[padId] = (state.padUsageCount[padId] || 0) + 1;
  res.json({ message: 'LaunchGame commands sent to PCs' });
});

function handleRegisterPC(ws, { pcID, pcType, clientIP }) {
  state.connections[clientIP] = {
    pcID,
    pcType,
    clientIP,
    ws,
    clientInGame: false,
    serverInGame: false
  };
  //console.log(`PC registered: ${pcID}, Type: ${pcType}`);
  broadcastPCListToFrontend(); // 广播 PC 列表更新
}

// 广播 PC 列表更新给所有前端连接
function broadcastPCListToFrontend() {
  const pcList = Object.values(state.connections).map((pc) => ({
    pcID: pc.pcID,
    type: pc.type,
    lastActive: pc.lastActive,
    clientIP: pc.clientIP,
    clientInGame: false,
    serverInGame: false
  }));
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const padStatus = state.padStatus;
      client.send(JSON.stringify({ type: 'LoadState', padStatus }));
     //console.log('Broadcasting PC list to client', pcList);
    } else {
      console.log('Client not ready');
    }
  });
}

// 处理位置数据更新
function handleLocationUpdate({ clientIP, position }) {
  state.positions[clientIP] = position; // 储存位置信息
  console.log(`Location updated from ${clientIP}:`, position);
}

server.listen(port, () => {
  console.log(`Control server is running on port ${port}`);
});