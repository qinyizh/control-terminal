import React, { useState, useEffect, useRef } from 'react';
import { Button, message } from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import GroupConfig from './GroupConfig';
import { initWebSocket, addMessageListener } from '../websocket';

const WEBSOCKET_URL = 'ws://192.168.1.154:8080';

const DataSourceConfig = () => {
  const [groups, setGroups] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [timers, setTimers] = useState({});  // 存储每个组的计时器
  const [timeElapsed, setTimeElapsed] = useState({}); // { groupId: { deviceIndex: time } }
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
        setTimers({});
        setTimeElapsed({});
        setIsRunning(false);
      }
    });
  }, []);

  // 启动计时器
  const startTimer = (groupId) => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      setTimeElapsed(prev => ({
        ...prev,
        [groupId]: {
          0: (Date.now() - startTime) / 1000,
          1: (Date.now() - startTime) / 1000,
          2: (Date.now() - startTime) / 1000
        }
      }));
    }, 100);

    setTimers(prev => ({
      ...prev,
      [groupId]: timer
    }));
  };

  // 停止计时器
  const stopTimer = (groupId) => {
    if (timers[groupId]) {
      clearInterval(timers[groupId]);
      setTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[groupId];
        return newTimers;
      });
      // 清零该组的计时器
      setTimeElapsed(prev => ({
        ...prev,
        [groupId]: {
          0: 0,
          1: 0,
          2: 0
        }
      }));
    }
  };

  const handleAddGroup = () => {
    const newGroup = {
      id: Date.now(),
      selections: [undefined, undefined, undefined],
      configs: {
        config0: {
          name: '',
          groupServerIp: '',
          localIp: '',
          roleType: undefined,
          isMainServer: false
        },
        config1: {
          name: '',
          groupServerIp: '',
          localIp: '',
          roleType: undefined,
          isMainServer: false
        },
        config2: {
          name: '',
          groupServerIp: '',
          localIp: '',
          roleType: undefined,
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

  // 检查 Timeline 状态
  // const checkTimelineStatus = async () => {
  //   try {
  //     const response = await fetch('http://192.168.1.154:8080/timeline-status');
  //     const data = await response.json();
      
  //     if (data.status === 'completed') {
  //       // Timeline 结束
  //       setIsRunning(false);
  //       // 停止所有计时器并清零
  //       Object.keys(timers).forEach(stopTimer);
  //       message.success('Timeline执行完成');
  //     } else if (data.status === 'running') {
  //       // 继续检查
  //       setTimeout(checkTimelineStatus, 1000);
  //     }
  //   } catch (error) {
  //     console.error('检查状态失败:', error);
  //     setTimeout(checkTimelineStatus, 1000);
  //   }
  // };

  // 在组件卸载时清理计时器
  useEffect(() => {
    return () => {
      Object.keys(timers).forEach(stopTimer);
    };
  }, []);

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
      }
    }

    setGroups(newGroups);
  };

  const handleLaunchGame = () => {
    const params = []
    Object.values(groups[0]['configs']).forEach((config, index) => {
      params.push({
        characterType: config.characterType,
        mainServerIp: config.groupServerIp.ip,
        playerName: config.name,
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

  const handleStartTimeline = () => {
    fetch('http://192.168.1.154:8080/start-timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mainServerIp: groups[0]['configs']['config0'].groupServerIp.ip }),
    })
      .then((response) => {
        response.json(); 
        groups.forEach(group => startTimer(group.id));
        message.success('剧情Timeline启动成功');
        setIsRunning(true);
       // checkTimelineStatus(); 
      })
      .then((data) => console.log('Timeline Command Response:', data))
      .catch((error) => {
        message.error('无法连接到服务器');
        console.error('Error:', error);
        // 停止所有计时器并清零
        Object.keys(timers).forEach(stopTimer);
      });
  };

  return (
    <div className={`data-source-config ${isRunning ? 'disabled' : ''}`}>
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
                timeElapsed={timeElapsed[group.id] || {}}
                isRunning={isRunning}
                ipMap={ipMap}
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

      <div className="bottom-buttons">
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleLaunchGame}
          className="start-client-btn"
          disabled={isRunning}
        >
          启动客户端
        </Button>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleStartTimeline}
          className="start-timeline-btn"
          disabled={isRunning}
        >
          启动剧情Timeline
        </Button>
      </div>

      {isRunning && <div className="page-mask" />}
    </div>
  );
};

export default DataSourceConfig; 