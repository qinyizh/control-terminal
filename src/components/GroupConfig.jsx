import React, { useState } from 'react';
import { Select, Input, Form, Collapse, Button, Modal } from 'antd';
import { 
  SettingOutlined, 
  DeleteOutlined, 
  CloudServerOutlined,
  DatabaseOutlined,
  LaptopOutlined
} from '@ant-design/icons';
const { Option } = Select;
const { Panel } = Collapse;

const GroupConfig = ({ 
  group, 
  onUpdate, 
  groupIndex, 
  onDelete,
  timeElapsed, 
  isRunning,
  ipMap
}) => {

  // 根据 ipMap 生成 PC 选项列表
  const ALL_PC_OPTIONS = Object.keys(ipMap || {});


  // 修改初始状态为全部展开
  const [activeKeys, setActiveKeys] = useState(() => {
    // 为每个选择创建一个展开的状态
    return group.selections.reduce((acc, _, index) => {
      acc[index] = true; // 默认展开
      return acc;
    }, {});
  });

  const toggleCollapse = (index) => {
    setActiveKeys(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 获取当前已选择的 PC 列表（排除当前下拉框的选择）
  const getSelectedPCs = (currentIndex) => {
    return group.selections.filter((selection, index) => 
      index !== currentIndex && ALL_PC_OPTIONS.includes(selection)
    );
  };

  // 获取当前下拉框可选的选项
  const getAvailableOptions = (currentIndex) => {
    const selectedPCs = getSelectedPCs(currentIndex);
    const options = ALL_PC_OPTIONS.filter(pc => !selectedPCs.includes(pc));
    console.log(`Available options for index ${currentIndex}:`, options);
    return options;
  };

  const handleSelectionChange = (value, index) => {
    const newSelections = [...group.selections];
    newSelections[index] = value;
    
    // 检查是否是该组第一个被选择的PC
    const isFirstSelectedPC = group.selections.every((sel, i) => 
      i === index || !sel  // 当前选择或空选择
    );
    
    const newConfigs = {
      ...group.configs,
      [`config${index}`]: {
        ...group.configs[`config${index}`],
        name: group.configs[`config${index}`]?.name || '',
        clientIp: ipMap[value] || '',
        characterType: group.configs[`config${index}`]?.characterType,
        isMainServer: isFirstSelectedPC,
        groupServerIp: isFirstSelectedPC ? ipMap[value] : ''
      }
    };

    // 找到当前组的主服务器
    let mainServerIP = '';
    if (isFirstSelectedPC) {
      mainServerIP = ipMap[value];
    } else {
      // 查找当前组的主服务器
      Object.entries(group.configs).forEach(([key, config]) => {
        if (config && config.isMainServer) {
          mainServerIP = config.groupServerIp;
        }
      });
    }

    // 更新所有设备的服务器IP
    Object.keys(newConfigs).forEach(key => {
      if (newConfigs[key] && !newConfigs[key].isMainServer) {
        newConfigs[key] = {
          ...newConfigs[key],
          groupServerIp: mainServerIP
        };
      }
    });

    onUpdate({
      ...group,
      selections: newSelections,
      configs: newConfigs
    }, {
      mainServerIp: isFirstSelectedPC ? ipMap[value] : undefined,
      updateCurrentGroup: isFirstSelectedPC,
      currentGroupIndex: groupIndex,
      mainServerIndex: isFirstSelectedPC ? index : undefined
    });
  };

  const handleConfigChange = (index, field, value) => {
    onUpdate({
      ...group,
      configs: {
        ...group.configs,
        [`config${index}`]: {
          ...group.configs[`config${index}`],
          [field]: value
        }
      }
    });
  };

  // 删除设备
  const handleDeleteDevice = (index) => {
    const newSelections = [...group.selections];
    newSelections[index] = '';  // 清空选择
    
    const newConfigs = {
      ...group.configs,
      [`config${index}`]: null  // 清空配置
    };

    onUpdate({
      ...group,
      selections: newSelections,
      configs: newConfigs
    });
  };

  const renderPCStatus = (pc) => {
    if (!pc || !ipMap[pc]) return null;

    return (
      <div className="pc-status">
        <span className="pc-name">{pc}状态</span>
          <span className="d-flex">
            {ipMap[pc].isServer === 1 ? <DatabaseOutlined className="status-icon success"  /> : <DatabaseOutlined className="status-icon error"  />}
            {ipMap[pc].isClient === 1 ? <LaptopOutlined className="status-icon success"  /> : <LaptopOutlined className="status-icon error"  />}
          </span>
      </div>
    );
  };

  const renderPCOption = (pc) => {
    // 添加空值检查
    if (!ipMap || !ipMap[pc]) {
      return (
        <Option key={pc} value={pc}>
          <div className="pc-option">
            <span className="d-flex">
              {ipMap[pc].isServer === 1 ? <DatabaseOutlined className="status-icon success"  /> : <DatabaseOutlined className="status-icon error"  />}
              {ipMap[pc].isClient === 1 ? <LaptopOutlined className="status-icon success"  /> : <LaptopOutlined className="status-icon error"  />}
            </span>
            {pc}
          </div>
        </Option>
      );
    }
    
    return (
      <Option key={pc} value={pc} disabled={ipMap[pc].isServer === 1 || ipMap[pc].isClient === 1}>
        <div className="pc-option">
          <span className="d-flex">
            {ipMap[pc].isServer === 1 ? <DatabaseOutlined className="status-icon success"  /> : <DatabaseOutlined className="status-icon error"  />}
            {ipMap[pc].isClient === 1 ? <LaptopOutlined className="status-icon success"  /> : <LaptopOutlined className="status-icon error"  />}
          </span>
          {pc}
        </div>
      </Option>
    );
  };

  const handleSetAsMainServer = (index) => {
    const selectedPC = group.selections[index];
    if (!selectedPC) return;

    const newServerIP = ipMap[selectedPC];
    
    // 更新当前组的所有设备的服务器IP
    const newConfigs = { ...group.configs };
    Object.keys(newConfigs).forEach(key => {
      if (newConfigs[key]) {
        newConfigs[key] = {
          ...newConfigs[key],
          groupServerIp: newServerIP,
          isMainServer: parseInt(key.slice(-1)) === index  // 只将当前设备设为主服务器
        };
      }
    });

    onUpdate({
      ...group,
      configs: newConfigs
    }, {
      mainServerIp: newServerIP,
      updateCurrentGroup: true,  // 只更新当前组
      currentGroupIndex: groupIndex,
      mainServerIndex: index
    });
  };

  const renderConfigSection = (index) => {
    if (!group.selections[index]) return null;
    
    const selectedPC = group.selections[index];
    
    return (
      <div className="config-section">
        {renderPCStatus(selectedPC)}

        <div className="player-name-container">
          <Input
            className="player-name-input"
            value={group.configs[`config${index}`]?.name || ''}
            onChange={e => handleConfigChange(index, 'name', e.target.value)}
            placeholder="玩家"
          />
          <CloudServerOutlined 
            className={`main-server-icon ${group.configs[`config${index}`]?.isMainServer ? 'active' : ''}`}
            onClick={() => handleSetAsMainServer(index)}
            title="点击设为主服务器"
          />
        </div>

        <Collapse
          activeKey={activeKeys[index] ? [index] : []}
          onChange={() => toggleCollapse(index)}
          expandIcon={({ isActive }) => (
            <SettingOutlined
              className="collapse-icon"
              rotate={isActive ? 90 : 0}
            />
          )}
          ghost
        >
          <Panel header="" key={index} showArrow={true}>
            <div className="config-form-items">
              <Form layout="horizontal" className="config-form">
                <Form.Item label="服务器IP地址">
                  <Input
                    value={group.configs[`config${index}`]?.groupServerIp.ip || ''}
                    onChange={e => handleConfigChange(index, 'groupServerIp', e.target.value)}
                    disabled
                  />
                </Form.Item>
                <Form.Item label="本机IP地址">
                  <Input
                    value={group.configs[`config${index}`]?.clientIp.ip || ''}
                    onChange={e => handleConfigChange(index, 'clientIp', e.target.value)}
                    disabled
                  />
                </Form.Item>
                <Form.Item label="角色类型">
                  <Select
                    value={group.configs[`config${index}`]?.characterType}
                    onChange={value => handleConfigChange(index, 'characterType', value)}
                  >
                    <Option value={1}>1</Option>
                    <Option value={2}>2</Option>
                    <Option value={3}>3</Option>
                  </Select>
                </Form.Item>
              </Form>
              
              <div className="device-delete">
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteDevice(index)}
                  className="device-delete-btn"
                >
                  删除设备
                </Button>
              </div>
            </div>
          </Panel>
        </Collapse>
      </div>
    );
  };

  // 删除确认对话框的状态
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // 删除确认对话框
  const showDeleteConfirm = () => {
    setIsDeleteModalVisible(true);
  };

  // 处理删除确认
  const handleDeleteConfirm = () => {
    onDelete(groupIndex);
    setIsDeleteModalVisible(false);
  };

  // 处理取消删除
  const handleDeleteCancel = () => {
    setIsDeleteModalVisible(false);
  };

  return (
    <div className="group-config">
      <div className="group-header">
        <div className="group-title-container">
          <div className="group-title">运行组{groupIndex + 1}</div>
          <Button 
            type="text" 
            icon={<DeleteOutlined />} 
            onClick={showDeleteConfirm}
            className="delete-button"
          />
        </div>
      </div>

      <div className="selection-row">
        {group.selections.map((selection, index) => (
          <div key={index} className="selection-column">
            {renderConfigSection(index)}
            {isRunning && (
              <div className="timer-overlay">
                <div className="timer">
                  {timeElapsed[index] ? 
                    (timeElapsed[index] > 0 ? `${Math.floor(timeElapsed[index])}秒` : '已完成') : 
                    '等待中...'
                  }
                </div>
              </div>
            )}
            <Select
              value={selection || undefined}
              onChange={value => handleSelectionChange(value, index)}
              className="selection-select"
              placeholder="设备列表"
              notFoundContent={!ipMap || Object.keys(ipMap).length === 0 ? '加载中...' : '无可用设备'}
            >
              {(
                getAvailableOptions(index).map(pc => renderPCOption(pc))
              )}
            </Select>
          </div>
        ))}
      </div>

      <Modal
        title="确认删除"
        visible={isDeleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        okText="确认"
        cancelText="取消"
      >
        <p>确定要删除这个运行组吗？</p>
      </Modal>
    </div>
  );
};

export default GroupConfig; 