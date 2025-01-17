const WebSocket = require('ws');
const { exec } = require('child_process');
const config = require('./config.json');

const totalClients = 8; // 模拟客户端数量（实际可扩展到50）
const clients = [];
const RECONNECT_INTERVAL = config.reconnectInterval;
const UPDATE_STATE_INTERVAL = config.updateStateInterval;

// 动态创建模拟客户端
for (let i = 1; i <= totalClients; i++) {
  const clientIP = `192.168.1.${100 + i}`;
  const pcID = `${config.pcIDPrefix}${i}`;
  let controlWS, engineServerWS, engineClientWS;

  let engineServerConnected = false;
  let engineClientConnected = false;

    // 启动 PC 客户端
  function startPC() {
    console.log(`Starting ${pcID}: ${clientIP}...`);
    connectToControlServer();
    connectToEngineServer();
    connectToEngineClient();
  }

    // 连接到中控服务器
  function connectToControlServer() {
    controlWS = new WebSocket(config.controlServerUrl);

    controlWS.on('open', () => {
      //console.log(`${pcID} connected to Control Server`);
      sendStatusToControlServer();
      // 注册到中控服务器
      controlWS.send(
        JSON.stringify({
          type: 'RegisterPC',
          pcID,
          masterTargetIP: config.controlServerUrl,
          pcType: 'server', // 设置为 server,
          clientIP: clientIP
        })
      );
    });

    controlWS.on('message', (message) => {
      const data = JSON.parse(message);
      //console.log(` ${pcID}: ${clientIP} received from Control Server:`, data);

      if (data.type === 'LaunchGame') {
        handleLaunchGame(data);
      } else if (data.type === 'StartTimeline') {
        handleStartTimeline(data);
      } else if (data.type === 'positionBroadcast') {
       //console.log(`Received positionBroadcast for ${pcID}:`, data.positions);
        engineServerWS.send(
          JSON.stringify({
            type: 'positionUpdate',
            data,
          })
        );
      }
    });

    controlWS.on('close', () => {
      console.log(`${pcID}: ${clientIP} disconnected from Control Server, reconnecting...`);
      setTimeout(connectToControlServer, RECONNECT_INTERVAL);
    });

    controlWS.on('error', (err) => {
      console.error(`${pcID}: ${clientIP} Control Server error:`, err);
    });
  }
  function sendStatusToControlServer() {
    if (controlWS.readyState === WebSocket.OPEN) {
      controlWS.send(
        JSON.stringify({
          type: 'UpdateStatus',
          pcID,
          clientIP,
          serverConnected: engineServerConnected,
          clientConnected: engineClientConnected,
        })
      );
    }
    // 定时发送状态更新
    setTimeout(sendStatusToControlServer, UPDATE_STATE_INTERVAL);
  }

  // 连接到 Engine Server
  function connectToEngineServer() {
    engineServerWS = new WebSocket(`${config.engineServerUrl}?pcID=${pcID}`);

    engineServerWS.on('open', () => {
      console.log(`${pcID}: ${clientIP} connected to Engine Server`);
      engineServerConnected = true;
      sendStatusToControlServer();
    });

    engineServerWS.on('message', (message) => {
      const data = JSON.parse(message);
      //console.log(`${pcID}: ${clientIP} received from Engine Server:`, data);

      if (data.type === 'TimelineEnd') {
        notifyControlServer({ type: 'TimelineEnd', pcID, clientIP, success: data.success });
      } else if (data.type === 'LocationData') {
        //console.log(`${pcID} received location data from Engine Server:`, data);
        // 转发位置数据到中控服务器
        const message = {
          type: 'LocationUpdate',
          pcID,
          clientIP,
          position: data.position,
          pcType: 'server',
        }
        notifyControlServer(message);
      }
    });

    engineServerWS.on('close', () => {
      console.log(`${pcID}: ${clientIP} disconnected from Engine Server, reconnecting...`);
      engineServerConnected = false;
      sendStatusToControlServer();
      setTimeout(connectToEngineServer, RECONNECT_INTERVAL);
    });

    engineServerWS.on('error', (err) => {
      console.error(`${pcID}: ${clientIP} Engine Server error:`, err);
    });
  }

  // 连接到 Engine Client
  function connectToEngineClient() {
    engineClientWS = new WebSocket(`${config.engineClientUrl}?pcID=${pcID}`);

    engineClientWS.on('open', () => {
      console.log(`${pcID}: ${clientIP} connected to Engine Client`);
      engineClientConnected = true;
      sendStatusToControlServer();
    });

    engineClientWS.on('message', (message) => {
      const data = JSON.parse(message);
      console.log(`${pcID}: ${clientIP} received from Engine Client:`, data);

      if (data.type === 'LaunchSuccess') {
        notifyControlServer({ type: 'LaunchSuccess', pcID, success: data.success });
      }
    });

    engineClientWS.on('close', () => {
      console.log(`${pcID}: ${clientIP} disconnected from Engine Client, reconnecting...`);
      engineClientConnected = false;
      sendStatusToControlServer();
      setTimeout(connectToEngineClient, RECONNECT_INTERVAL);
    });

    engineClientWS.on('error', (err) => {
      console.error(`${pcID}: ${clientIP} Engine Client error:`, err);
    });
  }
  
  // 处理中控的 LaunchGame 指令
  function handleLaunchGame(payload) {
    const { connectionType } = payload;

    if (connectionType === 'server') {
      engineServerWS.send(JSON.stringify({ type: 'LaunchGame', ...payload }));
      console.log(`Server ${clientIP} starting...`);
      exec(config.serverExeLocation, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing server.sh: ${error}`);
          return;
        }
        console.log(`Server output: ${stdout}`);
      });
    } else if (connectionType === 'client') {
      engineClientWS.send(JSON.stringify({ type: 'LaunchGame', ...payload }));
      console.log(`Client ${clientIP} starting...`);
      exec(config.clientExeLocation, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing client.sh: ${error}`);
          return;
        }
        console.log(`Client output: ${stdout}`);
      });
    }
  }

  // 处理中控的 StartTimeline 指令
  function handleStartTimeline(payload) {
    console.log(`${pcID} handling StartTimeline:`, payload);
    engineServerWS.send(JSON.stringify({ type: 'StartTimeline', ...payload }));
    exec(config.timelineExeLocation, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing timeline.sh: ${error}`);
        return;
      }
      console.log(`Timeline output: ${stdout}`);
    });

  }

  clients.push({ controlWS, engineServerWS, engineClientWS, clientIP });
  startPC();

  // 向中控发送通知
  function notifyControlServer(message) {
    console.log('notifyControlServer', message);
    if (controlWS.readyState === WebSocket.OPEN) {
      controlWS.send(JSON.stringify(message));
    } else {
      console.warn(`${pcID} failed to notify Control Server, connection is closed.`);
    }
  }
}
