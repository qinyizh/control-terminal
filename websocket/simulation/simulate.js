const WebSocket = require('ws');

const serverUrl = 'ws://192.168.1.154:8080'; // 中控服务地址
const totalClients = 5; // 模拟客户端数量（实际可扩展到50）
const clients = [];

// 动态创建模拟客户端
for (let i = 1; i <= totalClients; i++) {
  const clientIP = `192.168.1.${100 + i}`;
  const ws = new WebSocket(serverUrl);

  ws.on('open', () => {
    console.log(`Client ${clientIP} connected`);
    registerClient(ws, clientIP);
  });

  ws.on('close', () => {
    console.log(`Client ${clientIP} disconnected`);
  });

  ws.on('error', (error) => {
    console.error(`Client ${clientIP} error:`, error);
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log(`Client ${clientIP} received:`, message);
    if (data.TimelineCommand) {
      console.log(`${clientIP} received TimelineCommand:`, data.TimelineCommand);
      // Handle timeline start logic here
    }
  });

  clients.push({ ws, clientIP });
}

// 注册客户端
function registerClient(ws, clientIP) {
  const registerMessage = {
    Register: { ClientIP: clientIP, Type: 'Servant', MasterTargetIP: '192.168.1.154' },
  };
  ws.send(JSON.stringify(registerMessage));
  setInterval(() => updateState(ws, clientIP), 5000); // 每隔5秒更新状态
}

// 更新状态
function updateState(ws, clientIP) {
  const stateUpdate = {
    UpdateState: { 
      ClientIP: clientIP, 
      isServer: Math.random() > 0.5 ? 1 : 0, 
      isClient: Math.random() > 0.5 ? 1 : 0,
      status: Math.random() > 0.5 ? 1 : 0
    },
  };
  ws.send(JSON.stringify(stateUpdate));
}
