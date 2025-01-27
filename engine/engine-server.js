const WebSocket = require('ws');
const config = require('./config.json');

const port = config.serverPort || 9000; // Engine Server 监听端口
const wss = new WebSocket.Server({ port });

let serverInGame = false; // 游戏状态标识符
console.log(`Engine Server running on port ${port}`);

wss.on('connection', (ws, req) => {
  const pcID = new URL(req.url, `ws://${req.headers.host}`).searchParams.get('pcID');
  console.log(`PC ${pcID} connected to Engine Server`);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received from PC ${pcID}:', data);

    if (data.type === 'LaunchGame') {
      console.log('Launching game ...');
      serverInGame = true; // 更新游戏状态
      ws.send(JSON.stringify({ type: 'GameStatus', serverInGame: serverInGame }));

    } else if (data.type === 'StartTimeline') {
      console.log('Starting Timeline...');

      const interval = setInterval(() => {
        const positionData = {
          type: 'LocationData',
          position: {
            transforms: [
              { l: [28.8, 4.1, 0.0], r: [55.9, 21.2, -106.3], s: [1.0, 1.0, 1.0] },
              { l: [10.1, 5.6, 2.0], r: [30.0, 45.0, 90.0], s: [2.0, 2.0, 2.0] },
            ],
          }
        };
        ws.send(JSON.stringify(positionData));
        console.log('Sent location data to PC:', positionData);
      }, 2000); // 每 2 秒发送一次
      // 模拟游戏运行
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'TimelineEnd', success: true }));;
        console.log('Timeline ended, notifying PC');
        clearInterval(interval);
        serverInGame = false; // 停止游戏
        ws.send(JSON.stringify({ type: 'GameStatus', serverInGame: serverInGame }));
      }, 20000); 
    } else if (data.type === 'LocationBroadcastFromCentralPC') {
      console.log('LocationBroadcastFromCentralPC from PC:', data.data.positions);
      // 在此处理 position 数据
    }
  });

  ws.on('close', () => {
    console.log('PC ${pcID} disconnected from Engine Server');
  });

  ws.on('error', (err) => {
    console.error('Engine Server error:', err);
  });
});
