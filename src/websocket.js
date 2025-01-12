let socket;
const listeners = [];

// 初始化 WebSocket 连接
export const initWebSocket = (url) => {
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log('WebSocket connection established');
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
    setTimeout(() => initWebSocket(url), 3000);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    listeners.forEach((listener) => listener(data));
  };
};

// 添加消息监听器
export const addMessageListener = (listener) => {
  listeners.push(listener);
};
