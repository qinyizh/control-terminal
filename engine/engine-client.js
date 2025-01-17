const WebSocket = require('ws');
const config = require('./config.json');

const port = config.clientPort || 9001; // Engine Client 监听端口
const wss = new WebSocket.Server({ port });

console.log(`Engine Client running on port ${port}`);
let clientInGame = false; // 游戏状态标识符

wss.on('connection', (ws, req) => {
  const pcID = new URL(req.url, `ws://${req.headers.host}`).searchParams.get('pcID');
  console.log(`PC ${pcID} connected to Engine Client`);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received from PC ${pcID}:', data);

    if (data.type === 'LaunchGame') {
      console.log('Launching game client...');
      clientInGame = true; // 更新游戏状态
      ws.send(JSON.stringify({ type: 'GameStatus', clientInGame: clientInGame }));

    } else if (data.type === 'StopGame') {
      console.log(`StopGame received for PC ${pcID}`);
      clientInGame = false; // 停止游戏
      ws.send(JSON.stringify({ type: 'GameStatus', clientInGame: clientInGame }));
    }
  });

  ws.on('close', () => {
    console.log('PC disconnected from Engine Client');
  });

  ws.on('error', (err) => {
    console.error('Engine Client error:', err);
  });
});
