import React, { useState, useEffect, useRef } from 'react';
import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import GroupConfig from './GroupConfig';
import { initWebSocket, addMessageListener } from '../websocket';

const WEBSOCKET_URL = 'ws://192.168.1.154:8080';

const DataSourceConfig = () => {
  const [groups, setGroups] = useState([]);
  const timerMap = useRef(new Map()); // Use Map to store timer data
  const [timeElapsed, setTimeElapsed] = useState({}); // { serverIp: { deviceIndex: time } }
  const [ipMap, setIpMap] = useState({});

  useEffect(() => {
    initWebSocket(WEBSOCKET_URL);

    addMessageListener((data) => {
      if (data.type === 'StatusUpdate') {
        const idMap = {};
        data.status.forEach((item) => {
          idMap[item.ip] = item;
        });
        setIpMap(idMap);
      } else if (data.type === 'stop') {
        console.log(`Stop signal received from ${data.ip}`);

        const serverIp = data.ip;
        stopTimer(serverIp); 
      }
    });
  }, []);

  // 启动计时器
  const startTimer = (serverIp) => {

    const startTime = Date.now();
    const timer = setInterval(() => {
      setTimeElapsed(prev => ({
        ...prev,
        [serverIp]: {
          0: (Date.now() - startTime) / 1000,
          1: (Date.now() - startTime) / 1000,
          2: (Date.now() - startTime) / 1000
        }
      }));
    }, 100);
    timerMap.current.set(serverIp, { timer, isRunning: true });
  };
  // 停止计时器
  const stopTimer = (serverIp) => {

    if (timerMap.current.has(serverIp)) {
      const timerData = timerMap.current.get(serverIp);
      clearInterval(timerData.timer); // Clear the interval
      timerMap.current.set(serverIp, { ...timerData, isRunning: false }); // Update signal state
      setTimeElapsed(prev => ({
        ...prev,
        [serverIp]: {
          0: 0,
          1: 0,
          2: 0
        }
      }));
      console.log(`Timer with ID ${serverIp} stopped`);
    } else {
      console.log(`No timer found with ID ${serverIp}`);
    }
  };

  const handleAddGroup = () => {
    const newGroup = {
      id: Date.now(),
      serverIp: '',
      selections: [undefined, undefined, undefined],
      configs: {
        config0: {
          playerName: '',
          groupServerIp: '',
          clientIp: '',
          characterType: undefined,
          isMainServer: false
        },
        config1: {
          playerName: '',
          groupServerIp: '',
          clientIp: '',
          characterType: undefined,
          isMainServer: false
        },
        config2: {
          playerName: '',
          groupServerIp: '',
          clientIp: '',
          characterType: undefined,
          isMainServer: false
        }
      }
    };

    setGroups([...groups, newGroup]);
  };

  const handleDeleteGroup = (index) => {
    const newGroups = [...groups];
    newGroups.splice(index, 1);
    setGroups(newGroups);
  };

  const handleGroupUpdate = (index, updatedGroup, options = {}) => {
    const newGroups = [...groups];
    newGroups[index] = updatedGroup;

    if (options.updateCurrentGroup && options.mainServerIp) {
      // 只更新当前组的服务器IP
      const currentGroup = newGroups[options.currentGroupIndex];
      if (currentGroup) {
        Object.keys(currentGroup.configs).forEach(key => {
          if (currentGroup.configs[key]) {
            currentGroup.configs[key] = {
              ...currentGroup.configs[key],
              groupServerIp: options.mainServerIp,
              isMainServer: parseInt(key.slice(-1)) === options.mainServerIndex
            };
          }
        });
        currentGroup.serverIp = options.mainServerIp.ip;
      }
    }

    setGroups(newGroups);
  };

  const handleLaunchGame = (group) => {
    const params = []
    Object.values(group['configs']).forEach((config, index) => {
      params.push({
        characterType: config.characterType,
        mainServerIp: config.groupServerIp.ip,
        playerName: config.playerName,
        clientIp: config.clientIp.ip
      })
    })
    fetch('http://192.168.1.154:8080/launch-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
      .then((response) => response.json())
      .then((data) => console.log('LaunchGame Response:', data))
      .catch((error) => console.error('Error launching game:', error));
  };

  const handleStartTimeline = (group) => {
    console.log('group', group);
    fetch('http://192.168.1.154:8080/start-timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mainServerIp: group.serverIp }),
    })
      .then((response) => {
        response.json(); 
        startTimer(group.serverIp);
        message.success('剧情Timeline启动成功');
       // checkTimelineStatus(); 
      })
      .then((data) => console.log('Timeline Command Response:', data))
      .catch((error) => {
        message.error('无法连接到服务器');
        console.error('Error:', error);
      });
  };

  return (
    <div className="data-source-config">
      <div className="config-content">
        {groups.length === 0 ? (
          <div className="empty-state">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddGroup}
            >
              添加组
            </Button>
          </div>
        ) : (
          <div>
            {groups.map((group, index) => (
              <GroupConfig 
                key={group.id} 
                group={group}
                groupIndex={index}
                onUpdate={(updatedGroup, options) => handleGroupUpdate(index, updatedGroup, options)}
                onDelete={handleDeleteGroup}
                timeElapsed={timeElapsed[group.serverIp] || {}}
                isRunning={timerMap.current.get(group.serverIp) || {}}
                ipMap={ipMap}
                onStartClient={handleLaunchGame}
                onStartTimeline={handleStartTimeline}
              />
            ))}
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddGroup}
              style={{ marginTop: 16 }}
            >
              添加组
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSourceConfig; 