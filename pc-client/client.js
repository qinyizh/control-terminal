const WebSocket = require('ws');
const { exec } = require('child_process');

const fs = require('fs');
const path = require('path');
const configFilePath = path.join(path.dirname(process.execPath), 'config.json');
const playerInfoFilePath = path.join(process.cwd(), 'playerInfo.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
} catch (error) {
  console.error('Failed to load config.json:', error);
  process.exit(1);
}

const RECONNECT_INTERVAL = config.reconnectInterval || 5000;
const UPDATE_STATE_INTERVAL = config.updateStateInterval || 10000;

const pcID = config.pcID; // 每个 PC 的唯一标识符
const clientIP = config.clientIP; // 当前 PC 的 IP 地址
let controlWS, engineServerWS, engineClientWS;
let engineServerConnected = false;
let engineClientConnected = false;

  // 启动 PC 客户端
function startPC() {
  connectToControlServer();
  connectToEngineServer();
  connectToEngineClient();
}

  // 连接到中控服务器
function connectToControlServer() {
  controlWS = new WebSocket(config.controlServerUrl);

  controlWS.on('open', () => {
    console.log(`${pcID} connected to Control Server`);
    sendStatusToControlServer();
    // 注册到中控服务器
    controlWS.send(
      JSON.stringify({
        type: 'RegisterPC',
        pcID,
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
  } else if (data.type === 'LocationBroadcastFromCentralPC') {
    //console.log(`Received positionBroadcast for ${pcID}:`, data.positions);
    engineServerWS.send(
      JSON.stringify({
        type: 'LocationBroadcastFromCentralPC',
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
    engineServerConnected = true;
    sendStatusToControlServer();
  });

  engineServerWS.on('message', (message) => {
    const data = JSON.parse(message);
 
    if (data.type === 'TimelineEnd') {
      notifyControlServer({ type: 'TimelineEnd', pcID, clientIP, success: data.success });
    } else if (data.type === 'LocationData') {
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
    if (data.type === 'LaunchSuccess') {
      notifyControlServer({ type: 'LaunchSuccess', pcID, success: data.success });
    }
  });

  engineClientWS.on('close', () => {
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
  const { connectionType, MsPlayerName, MsCharacterIndex, IpAddress } = payload;
  // 保存玩家信息到 playerInfo.json
  const playerInfo = {
    MsPlayerName,
    MsCharacterIndex,
    IpAddress,
    connectionType, // server 或 client
    pcID,
    clientIP,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(playerInfo, null, 2));
  try {
    // 写入玩家信息到 JSON 文件
    fs.writeFileSync(playerInfoFilePath, JSON.stringify(playerInfo, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to save player info: ${error.message}`);
    return;
  }

  if (connectionType === 'server') {
    console.log('handleLaunchGame sever')
    exec(config.serverExeLocation, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing server.sh: ${error}`);
        return;
      }
      console.log(`Server output: ${stdout}`);
    });
  } else if (connectionType === 'client') {
    console.log('handleLaunchGame client')
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
  engineServerWS.send(JSON.stringify({ type: 'StartTimeline', ...payload }));
  exec(config.timelineExeLocation, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing timeline.sh: ${error}`);
      return;
    }
  });
}

// 向中控发送通知
function notifyControlServer(message) {
  if (controlWS.readyState === WebSocket.OPEN) {
    controlWS.send(JSON.stringify(message));
  } else {
    console.warn(`${pcID} failed to notify Control Server, connection is closed.`);
  }
}

// 启动 PC 客户端
startPC();
