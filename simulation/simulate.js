const WebSocket = require('ws');
const { exec } = require('child_process');

const serverUrl = 'ws://192.168.1.154:8080'; // 中控服务地址
const totalClients = 8; // 模拟客户端数量（实际可扩展到50）
const clients = [];

// 动态创建模拟客户端
for (let i = 1; i <= totalClients; i++) {
  const clientIP = `192.168.1.${100 + i}`;
  const ws = new WebSocket(serverUrl);

  ws.on('open', () => {
    console.log(`Client ${clientIP} connected`);
    registerClient(ws, clientIP);
    sendLocationData(ws, clientIP);
  });

  ws.on('close', () => {
    console.log(`Client ${clientIP} disconnected`);
  });

  ws.on('error', (error) => {
    console.error(`Client ${clientIP} error:`, error);
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
   // console.log(`Client ${clientIP} received:`, data);
    if (data.command === 'startTimeline') {
      // console.log(`Client ${clientIP} received 'startTimeline' command`);
      exec('./timeline.sh', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing timeline.sh: ${error}`);
          return;
        }
        console.log(`Timeline output: ${stdout}`);
      });
      // Wait for 10 seconds, then send terminate signal
      setTimeout(() => {
        sendTerminateSignal(ws, clientIP);
      }, 5000);
    } else if (data['LaunchGame'] && data['LaunchGame']['type'] === 'server') {
      console.log(`Server ${clientIP} starting server...`);
      exec('./server.sh', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing server.sh: ${error}`);
          return;
        }
        console.log(`Server output: ${stdout}`);
      });
    } else if (data['LaunchGame'] && data['LaunchGame']['type'] === 'client') {
      console.log(`Client ${clientIP} starting client...`);
      exec('./client.sh', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing client.sh: ${error}`);
          return;
        }
        console.log(`Client output: ${stdout}`);
      });
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
// Send terminate signal
function sendTerminateSignal(ws, clientIP) {
  const stopMessage = {
    type: 'stop',
    clientIP
  };
  ws.send(JSON.stringify(stopMessage));
  console.log(`Client ${clientIP} sent terminate signal`);
}
// Send location data periodically
function sendLocationData(ws, serverIp) {
  setInterval(() => {
    const locationData = {
      "transforms": [
        {
          "l": [28.812731, 4.087652, 0.0],
          "r": [55.925688, 21.269879, -106.349658],
          "s": [1.0, 1.0, 1.0]
        },
        {
          "l": [10.123456, 5.654321, 2.0],
          "r": [30.0, 45.0, 90.0],
          "s": [2.0, 2.0, 2.0]
        },
        {
          "l": [15.0, 3.5, 7.2],
          "r": [0.0, 180.0, 45.0],
          "s": [0.5, 0.5, 0.5]
        },
        {
          "l": [9.876543, 2.345678, 1.0],
          "r": [90.0, 0.0, 270.0],
          "s": [1.5, 1.5, 1.5]
        }
      ]
    };
    ws.send(JSON.stringify({ location: locationData }));
    console.log(`Server ${serverIp} sent location:`, locationData);
  }, 5000);
}