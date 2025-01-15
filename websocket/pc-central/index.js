const WebSocket = require('ws');
const cors = require('cors');
const express = require('express');
require('dotenv').config();

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });
const port = process.env.PORT || 8080;

const connections = new Map(); 
const locations = new Map(); // { ip: { locationData } }
app.use(cors());
app.use(express.json());

wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress.replace('::ffff:', '');
  console.log(`New connection from: ${ip}`);
  connections.set(ip, { ws, isServer: 0, isClient: 0, status: 0 }); 

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.Register) {
        // 记录注册信息
        connections.set(data.Register.ClientIP, { ws, isServer: 0, isClient: 0, status: 0 });
        console.log(`Registered: ${data.Register.ClientIP}`);
        broadcastStatus();
      } else if (data.UpdateState) {
        // 更新状态
        const { ClientIP, isServer, isClient, status } = data.UpdateState;
        if (connections.has(ClientIP)) {
          const pc = connections.get(ClientIP);
          connections.set(ClientIP, { ...pc, isServer, isClient, status });
          //console.log(`State update from ${ClientIP}:`, { isServer, isClient, status });
          broadcastStatus();
        }
      } else if (data.LaunchGame) {
        // 启动游戏逻辑
        const { UeType, PlayerName, CharacterType } = data.LaunchGame;
        console.log(`Launching game: ${UeType}, Player=${PlayerName}, Character=${CharacterType}`);
        // 广播消息给所有 servant
        connections.forEach(({ ws }, key) => {
          ws.send(JSON.stringify({ Command: "LaunchGame", UeType, PlayerName, CharacterType }));
        });
      } else if (data.type === 'stop') {
        console.log(`Stop signal received from ${data.clientIP}`);
        broadcastToFrontend({ type: 'stop', ip: data.clientIP });
      } else if (data.type === 'location') {
        console.log(`Received location data from ${ip}:`, data.location);
        locations.set(ip, data.location);

        // Broadcast updated locations to all servers except the sender
        broadcastLocations(ip);
      }
    } catch (error) {
      console.error(`Error processing message: ${message}`, error);
    }
  });

  ws.on('close', () => {
    console.log(`Connection closed: ${ip}`);
    connections.delete(ip);
    locations.delete(ip);
  });
});
// Broadcast locations to all servers except the sender
function broadcastLocations(senderIp) {
  const allLocations = Array.from(locations.entries()).map(([ip, location]) => ({ ip, location }));

  connections.forEach((connection, ip) => {
    if (connection.type === 'server' && ip !== senderIp) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({ type: 'locations', locations: allLocations }));
        console.log(`Broadcasted locations to ${ip}`);
      }
    }
  });
}

function broadcastToFrontend(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

function broadcastStatus() {
  const status = Array.from(connections.entries()).map(([ip, state]) => ({
    ip,
    isServer: state.isServer,
    isClient: state.isClient,
    status: state.status
  }));
  const message = JSON.stringify({ type: 'StatusUpdate', status });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Start Timeline Command Handler
app.post('/start-timeline', (req, res) => {
  const { mainServerIp } = req.body;

  if (!mainServerIp || !connections.has(mainServerIp)) {
    return res.status(400).json({ error: 'Invalid or unregistered mainServerIp' });
  }

  const connection = connections.get(mainServerIp);
  if (connection && connection.ws && connection.ws.readyState === WebSocket.OPEN) {
    const timelineCommand = {
      command: 'startTimeline',
    };
    connection.ws.send(JSON.stringify(timelineCommand));
    console.log(`Sent 'startTimeline' command to ${mainServerIp}`);
    res.json({ message: 'startTimeline command sent to server' });
  } else {
    console.warn(`No open WebSocket connection for ${mainServerIp}`);
    res.status(500).json({ error: `Cannot send to ${mainServerIp}: WebSocket not open` });
  }
});


app.post('/launch-game', (req, res) => {
  const commands = req.body; // Array of commands from the UI

  if (!Array.isArray(commands)) {
    return res.status(400).json({ error: 'Invalid data format. Expected an array.' });
  }

  // Process each command and send to respective PCs
  commands.forEach((command) => {
    const { mainServerIp, clientIp, playerName, characterType } = command;

    if (connections.has(mainServerIp)) {
      // Send 'server' message to mainServerIp
      const mainServerConnection = connections.get(mainServerIp);
      mainServerConnection.type = 'server';
      if (mainServerConnection.ws && mainServerConnection.ws.readyState === WebSocket.OPEN && mainServerIp === clientIp) {
        const serverMessage = {
          type: 'server',
          playerName,
          characterType,
        };
        mainServerConnection.ws.send(JSON.stringify({ LaunchGame: serverMessage }));
        console.log(`Sent 'server' message to ${mainServerIp}:`, serverMessage);
      }
    } else {
      console.warn(`Cannot send 'server' message to ${mainServerIp}: WebSocket not open`);
    }

    if (connections.has(clientIp)) {
      // Send 'client' message to clientIp
      const clientConnection = connections.get(clientIp);
      clientConnection.type = 'client';
      if (clientConnection.ws && clientConnection.ws.readyState === WebSocket.OPEN) {
        const clientMessage = {
          type: 'client',
          playerName,
          characterType,
        };
        clientConnection.ws.send(JSON.stringify({ LaunchGame: clientMessage }));
        console.log(`Sent 'client' message to ${clientIp}:`, clientMessage);
      }
    } else {
      console.warn(`Cannot send 'client' message to ${clientIp}: WebSocket not open`);
    }
  });

  res.json({ message: 'LaunchGame commands sent to PCs' });
});

server.listen(port, () => {
  console.log(`Control server is running on port ${port}`);
});