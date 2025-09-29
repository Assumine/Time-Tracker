import React, { useState, useRef, useEffect } from "react";
import "../assets/css/Settings.css";
import WorkCalendar from './WorkCalendar';
import BlackWhiteSettings from "./BlackWhiteSettings";
import TipsDialog from '../components/TipsDialog';
import { getMonthName, getWeeksInMonth, isWeekPast, formatWeekRange } from '../utils/dateUtils';




// 配置列表占位数据
const mockConfigs = [
  { id: 1, name: '示例配置', type: '示例', status: '已启用', isEnabled: true },
];

export default function SettingsPage() {
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("main");
  const [configs, setConfigs] = useState(mockConfigs);
  // 创建BlackWhiteSettings组件的引用，用于调用其方法
  const blackWhiteSettingsRef = useRef(null);
  // 添加遮罩状态
  const [showOverlay, setShowOverlay] = useState(false);



  // 获取当前日期所在的周在月份中的索引
  const getCurrentWeekIndex = (year, month) => {
    const today = new Date();
    // 如果当前日期不是目标月份，返回0
    if (today.getFullYear() !== year || today.getMonth() !== month) {
      return 0;
    }

    // 获取月份中的所有周
    const weeks = getWeeksInMonth(month, year);

    // 查找当前日期所在的周
    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      // 检查当前日期是否在本周范围内（包括开始和结束日期）
      if (today >= week.start && today <= week.end) {
        return i;
      }
    }

    // 如果没有找到，返回0
    return 0;
  };

  // 处理月份切换
  const handleMonthChange = (direction) => {
    setCurrentMonth(prevMonth => {
      const newMonth = prevMonth + direction;
      // 如果月份超出范围，更新年份
      if (newMonth < 0) {
        setCurrentYear(prevYear => prevYear - 1);
        return 11; // 12月（0-11索引）
      } else if (newMonth > 11) {
        setCurrentYear(prevYear => prevYear + 1);
        return 0; // 1月
      }
      return newMonth;
    });
    
    // 切换月份后检查当前选中周是否为过去周
    setTimeout(() => {
      const weeks = getWeeksInMonth(currentMonth + direction, currentYear);
      if (weeks.length > 0 && activeWeek < weeks.length) {
        const isPast = isWeekPast(weeks[activeWeek]);
        setShowOverlay(isPast);
      }
    }, 0);
  };

  // 处理周变化
  const handleWeekChange = (newDate) => {
    // 计算新的周索引
    const weeks = getWeeksInMonth(currentMonth, currentYear);
    let newWeekIndex = 0;
    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];
      if (newDate >= week.start && newDate <= week.end) {
        newWeekIndex = i;
        break;
      }
    }
    setActiveWeek(newWeekIndex);
    
    // 检查选中的周是否为过去周，如果是则显示遮罩
    const isPast = isWeekPast(weeks[newWeekIndex]);
    setShowOverlay(isPast);
  };

  // 月份和周数管理状态 - 默认选中当前月份和当前周
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [activeWeek, setActiveWeek] = useState(() => {
    const today = new Date();
    return getCurrentWeekIndex(today.getFullYear(), today.getMonth());
  });
  
  // 计算选中的周信息
  const selectedWeek = getWeeksInMonth(currentMonth, currentYear)[activeWeek];

  // 初始化时检查当前周是否为过去周
  useEffect(() => {
    const weeks = getWeeksInMonth(currentMonth, currentYear);
    if (weeks.length > 0 && activeWeek < weeks.length) {
      const isPast = isWeekPast(weeks[activeWeek]);
      setShowOverlay(isPast);
    }
  }, []);

  // 对话框状态管理
  const [dialogState, setDialogState] = useState({
    visible: false,
    title: '',
    type: 'info', // info, warning, error, success
    message: '',
    inputPlaceholder: '',
    inputValue: '',
    confirmAction: null,
    confirmParams: null
  });

  // 打开对话框
  const openDialog = (options) => {
    setDialogState({
      visible: true,
      title: options.title || '',
      type: options.type || 'info',
      message: options.message || '',
      inputPlaceholder: options.inputPlaceholder || '',
      inputValue: options.inputValue || '',
      confirmAction: options.confirmAction,
      confirmParams: options.confirmParams
    });
  };

  // 关闭对话框
  const closeDialog = () => {
    setDialogState({ ...dialogState, visible: false });
  };

  // 确认对话框操作
  const confirmDialog = (inputValue) => {
    if (dialogState.confirmAction && typeof dialogState.confirmAction === 'function') {
      dialogState.confirmAction(dialogState.confirmParams, inputValue);
    }
    closeDialog();
  };

  // 处理开关状态变化
  const handleToggleStatus = (id) => {
    setConfigs(configs.map(config => {
      if (config.id === id) {
        const isEnabled = !config.isEnabled;
        return {
          ...config,
          isEnabled,
          status: isEnabled ? '已启用' : '未启用'
        };
      }
      return config;
    }));
  };

  // 处理重命名功能
  const handleRename = (id) => {
    const configToRename = configs.find(config => config.id === id);
    if (configToRename) {
      openDialog({
        title: '重命名配置',
        type: 'info',
        message: '请输入新的配置名称:',
        inputPlaceholder: '配置名称',
        inputValue: configToRename.name,
        confirmAction: (params, newName) => {
          if (newName && newName.trim() !== '') {
            setConfigs(configs.map(config =>
              config.id === params.id ? { ...config, name: newName.trim() } : config
            ));
          }
        },
        confirmParams: { id }
      });
    }
  };

  // 处理复制功能
  const handleCopy = (id) => {
    const configToCopy = configs.find(config => config.id === id);
    if (configToCopy) {
      const newConfig = {
        ...configToCopy,
        id: Date.now(), // 使用时间戳作为唯一ID
        name: `${configToCopy.name} (副本)`,
        isEnabled: false // 复制的配置默认禁用
      };
      setConfigs([...configs, newConfig]);
    }
  };

  // 处理删除功能
  const handleDelete = (id) => {
    openDialog({
      title: '删除配置',
      type: 'warning',
      message: '确定要删除这个配置吗？此操作无法撤销。',
      confirmAction: (params) => {
        setConfigs(configs.filter(config => config.id !== params.id));
      },
      confirmParams: { id }
    });
  };

  // 处理新建功能
  const handleCreate = () => {
    openDialog({
      title: '新建配置',
      type: 'info',
      message: '请输入新配置的名称:',
      inputPlaceholder: '配置名称',
      confirmAction: (params, name) => {
        if (name && name.trim() !== '') {
          const newConfig = {
            id: Date.now(), // 使用时间戳作为唯一ID
            name: name.trim(),
            type: '自定义',
            status: '未启用',
            isEnabled: false
          };
          setConfigs([...configs, newConfig]);
        }
      }
    });
  };

  // 配置缓存状态
  const [configCache, setConfigCache] = useState(null);
  
  // 编辑窗口文本缓存状态
  const [editTextCache, setEditTextCache] = useState({});
  
  // 编辑窗口事件缓存状态
  // 事件缓存状态和相关函数
  const [eventsCache, setEventsCache] = useState({});
  
  // 生成唯一的周标识符（与WorkCalendar.jsx保持一致）
  const generateWeekKey = (date) => {
    const m = moment(date);
    const year = m.year();
    const week = m.week(); // 使用ISO周数
    return `${year}-W${week}`;
  };
  
  // 保存事件数据到缓存
  const saveEventsCache = (weekKey, events) => {
    setEventsCache(prev => ({
      ...prev,
      [weekKey]: events
    }));
  };
  
  // 从缓存获取事件数据
  const getEventsCache = (weekKey) => {
    return eventsCache[weekKey] || null;
  };
  
  // 清除事件缓存
  const clearEventsCache = () => {
    setEventsCache({});
  };

  // 清除编辑窗口文本缓存
  const clearEditTextCache = () => {
    setEditTextCache({});
  };

  /**
   * 从localStorage加载配置缓存
   * @param {number} configId - 配置ID
   * @returns {Object|null} 缓存的配置数据
   */
  const loadConfigCache = (configId) => {
    try {
      const cacheKey = `at_settings_cache_${configId}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error('加载配置缓存失败:', error);
    }
    return null;
  };
  
  /**
   * 保存配置缓存到localStorage
   * @param {number} configId - 配置ID
   * @param {Object} configData - 配置数据
   */
  const saveConfigCache = (configId, configData) => {
    try {
      const cacheKey = `at_settings_cache_${configId}`;
      const cache = {
        lastEdited: new Date().toISOString(),
        data: configData
      };
      localStorage.setItem(cacheKey, JSON.stringify(cache));
      setConfigCache(cache);
    } catch (error) {
      console.error('保存配置缓存失败:', error);
    }
  };
  
  /**
   * 清除配置缓存
   * @param {number} configId - 配置ID
   */
  const clearConfigCache = (configId) => {
    try {
      const cacheKey = `at_settings_cache_${configId}`;
      localStorage.removeItem(cacheKey);
      setConfigCache(null);
    } catch (error) {
      console.error('清除配置缓存失败:', error);
    }
  };
  
  /**
   * 保存编辑窗口文本缓存
   * @param {string} tab - 当前tab名称
   * @param {Object} textData - 文本数据
   */
  const saveEditTextCache = (tab, textData) => {
    setEditTextCache(prev => ({
      ...prev,
      [tab]: textData
    }));
  };
  
  /**
   * 获取编辑窗口文本缓存
   * @param {string} tab - 当前tab名称
   * @returns {Object} 缓存的文本数据
   */
  const getEditTextCache = (tab) => {
    return editTextCache[tab] || {};
  };
  
  
  
  /**
     * 导出配置函数
     * @param {Object} configData - 要导出的配置数据
     * @param {string} configName - 配置名称
     */
    const exportConfig = (configData, configName) => {
      try {
        // 核心逻辑：优先获取编辑窗口中的实际配置数据
        let actualConfigData = {};
        
        // 最重要的数据源：从BlackWhiteSettings组件获取当前正在编辑的实时数据
        if (blackWhiteSettingsRef.current && blackWhiteSettingsRef.current.getCurrentSettings) {
          try {
            const componentData = blackWhiteSettingsRef.current.getCurrentSettings();
            if (componentData) {
              actualConfigData = componentData;
              console.log('成功从编辑窗口获取配置数据');
            }
          } catch (e) {
            console.log('无法从组件获取当前设置:', e);
          }
        }
        
        // 第二优先级：如果组件数据获取失败，尝试从缓存中获取最近编辑的数据
        if (Object.keys(actualConfigData).length === 0 && configCache && configCache.data) {
          actualConfigData = configCache.data;
          console.log('从缓存获取配置数据');
        }
        
        // 最后优先级：使用传入的基础配置数据
        if (Object.keys(actualConfigData).length === 0 && configData) {
          actualConfigData = configData;
          console.log('使用传入的配置数据');
        }
        
        // 创建配置数据对象，确保包含所有必要字段
        const exportData = {
          // 配置名称，作为根级字段
          ConfigName: configName || '未命名配置',
          // 添加导出时间戳
          exportTime: new Date().toISOString(),
          
          // 核心配置数据，确保包含所有必要字段
          main: actualConfigData.main || {
            minWorkingTime: 480,
            strictMode: false,
            resetPolicy: 'off',
            negativeRewardRatio: 1,
            fixedWorkingTime: false,
            dailyWorkingHours: 480
          },
          
          // 工作时间段配置
          workPeriods: actualConfigData.workPeriods || [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '18:00' }
          ],
          
          // 休息日配置
          restDays: actualConfigData.restDays || [],
          
          // 黑白名单配置 - 直接从实际编辑数据中获取
          blacklist: actualConfigData.blacklist || [],
          whitelist: actualConfigData.whitelist || [],
          
          // 路径黑白名单配置
          pathsList: actualConfigData.pathsList || {
            black: [],
            white: []
          },
          
          // 名称黑白名单配置
          namesList: actualConfigData.namesList || {
            black: [],
            white: []
          },
          
          // 升级配额配置
          normalUpgradeQuota: actualConfigData.normalUpgradeQuota || 2,
          whiteUpgradeQuota: actualConfigData.whiteUpgradeQuota || 2,
          
          // 应用级别配置 - 从实际编辑数据中获取
          appLevels: actualConfigData.appLevels || {},
          
          // 每周数据配置 - 从实际编辑数据中获取
          weeklyData: actualConfigData.weeklyData || {}
        };
        
        // 将配置数据转换为JSON字符串，美化格式
        const jsonStr = JSON.stringify(exportData, null, 2);
        
        // 创建Blob对象
        const blob = new Blob([jsonStr], { type: 'application/json' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${configName || '未命名配置'}_${new Date().toISOString().split('T')[0]}.json`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 使用showToast代替alert，保持UI交互一致性
        showToast('配置导出成功');
      } catch (error) {
        console.error('导出配置失败:', error);
        // 使用showToast显示错误信息
        showToast('配置导出失败，请重试');
      }
    };
  
  // 处理编辑功能
  const handleEdit = (config) => {
    setSelectedConfig(config);
    
    // 检查是否有未保存的缓存
    const cachedData = loadConfigCache(config.id);
    if (cachedData) {
      openDialog({
        title: '发现未保存的更改',
        type: 'info',
        message: '检测到有未保存的配置更改，是否恢复？',
        confirmAction: (params) => {
          // 应用缓存的数据到各个组件
          setConfigCache(cachedData);
          setEditDialogOpen(true);
        },
        confirmParams: config
      });
    } else {
      setEditDialogOpen(true);
    }
  };
  
  // 处理保存按钮点击，根据当前激活的标签调用相应组件的保存方法
  const handleSaveSettings = () => {
    let saveSuccess = true;
    
    if (activeTab === "blackwhite" && blackWhiteSettingsRef.current) {
      // 调用BlackWhiteSettings组件的saveSettings方法
      saveSuccess = blackWhiteSettingsRef.current.saveSettings();
    }
    
    if (saveSuccess && selectedConfig) {
      // 清除缓存
      clearConfigCache(selectedConfig.id);
      // 清除编辑窗口文本缓存
      clearEditTextCache();
      // 清除编辑窗口事件缓存
      clearEventsCache();
      
      // 可以在这里添加保存成功的反馈
      setEditDialogOpen(false);
      alert('设置保存成功！');
    }
  };
  
  // 处理取消编辑
  const handleCancelEdit = () => {
    if (selectedConfig && configCache) {
      openDialog({
        title: '确认放弃更改',
        type: 'warning',
        message: '当前有未保存的更改，确定要放弃吗？',
        confirmAction: () => {
          setEditDialogOpen(false);
          setSelectedConfig(null);
          // 清除编辑窗口文本缓存
          clearEditTextCache();
          // 清除编辑窗口事件缓存
          clearEventsCache();
        }
      });
    } else {
      setEditDialogOpen(false);
      setSelectedConfig(null);
      // 清除编辑窗口文本缓存
      clearEditTextCache();
      // 清除编辑窗口事件缓存
      clearEventsCache();
    }
  };
  
  // 处理导入功能
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedConfig = JSON.parse(event.target.result);
            
            // 创建新配置项
            const newConfig = {
              id: Date.now(),
              name: `导入配置_${new Date().toLocaleDateString()}`,
              type: '导入',
              status: '未启用',
              isEnabled: false
            };
            
            // 添加到配置列表
            setConfigs([...configs, newConfig]);
            
            // 保存导入的数据到缓存
            saveConfigCache(newConfig.id, importedConfig);
            
            alert('配置导入成功！');
          } catch (error) {
            console.error('导入配置失败:', error);
            alert('配置导入失败，请确保文件格式正确。');
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  };
  
  // 处理导出功能
  const handleExport = () => {
    if (selectedConfig) {
      // 可以从缓存或后端获取最新配置数据
      const configData = configCache?.data || {};
      exportConfig(configData, selectedConfig.name);
    } else {
      // 如果没有选中配置，可以导出默认配置模板
      exportConfig({}, '配置模板');
    }
  };
  
  return (
    <div className="settings-page">
      {/* 顶部按钮 */}
      <div className="top-buttons">
        <button className="Setting-btn-primary" onClick={handleCreate}>新建</button>
        <button className="Setting-btn-secondary" onClick={handleImport}>导入</button>
        <button className="Setting-btn-secondary" onClick={handleExport}>导出</button>
      </div>

      {/* 配置列表 */}
      <div className="config-list">
        {configs.map(config => (
          <div key={config.id} className="config-item">
            <div className="config-info">
              <div className="config-name">{config.name}</div>
              <div className="config-type">{config.type}</div>
            </div>
            <div className="config-right-section">
              <div className="config-actions">
                <button title="重命名" onClick={() => handleRename(config.id)}>
                  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAqElEQVR4nO2UQQrCMBBFp1fpSQI9lNvSjdYrSXemN1EvoT4XjphCAqFOtGA/DIRJyAvzyRdZZSnA8dQZ6IE9cNGeswTEZAKogR3gg4u99uqPAS8BTQBoxFpMR5U3GuBKnqoYALiFh34K8GpaqqoEYAsccwDdXA+AdhGAAdikShIA3T+UNPmea3IZQPGPtoio4B12YwAYzcKOL8S108tO+upe12W8kL/QA30X4MQsmSDLAAAAAElFTkSuQmCC" alt="autograph" style={{ width: '20px', height: '20px' }} />
                </button>
                <button title="复制" onClick={() => handleCopy(config.id)}>
                  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAaUlEQVR4nOXRsQ2AMAxEUY8HmYqSOfEgH9EiiHyRCUT8Or5XxKxnQAEcMRMAeVwFtAO17gDxP1laAQ+Mx5ELQG19GqgjScA9kgjwU8AqjQEovQOcU47GAJQ+A3jj/hYF5uOxOg5MISCjHaMHdaBv0rAIAAAAAElFTkSuQmCC" alt="trash" style={{ width: '20px', height: '20px' }} />
                </button>
                <button title="编辑" onClick={() => handleEdit(config)}>
                  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABIklEQVR4nO2Uv07CUBTGW/xDUWdn4ghP4oOITyGDz+HkCIMLW4kBJnR1YUOqgwOLcSX5mZOcJu3Re+WWToYvucNt7vl9p+drbxTtFSKgCzwDG8K1AZ6Ajs9A4Ltq7oLHFTu3EkYc/U8BvZpW7MqgLjW2MXgHssJ+BaRmyTOrr20MBNzSlSko+aUmMU1MgXPX/F0Gbx6DvAHRGDjxBWxHJIVLs7cj+gEHDoE74BO4qZLBypwrdQ60gY88j+AMKM9d4K1C533gTO4jNbl3GSwVngCvxiA3TQ18oLUzNbkAjqtkkBn4ETA0tbe7XHYvwKkH/lDq3JjIff6XLvXsQRBciyScuedN1vlfClwFwUMFPBbgI6BZG1wNFsAEuJavqFZ4iL4BI3Vpfw9mkvIAAAAASUVORK5CYII=" alt="edit-row" style={{ width: '20px', height: '20px' }} />
                </button>
                <button className="destructive" title="删除" onClick={() => handleDelete(config.id)}>
                  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAi0lEQVR4nOWSOwqAMBBEcxyLeAdJpbey9HymsNdC2Es8CaQIauEnQY0DgTBL5sFOlPqFgJatuqtht6QeB+QhUq+H3AADUAFz4AlggD4GwHhP+2B3tPdMDIAEgXp1l1gdCFAG82K1sncDJPWKTOqSrQ+SnW9qY3VwSK8CTBfyxzOAxj04Ew7UhwGf0gLl65SCbAu2cAAAAABJRU5ErkJggg==" alt="trash" style={{ width: '20px', height: '20px' }} />
                </button>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={() => handleToggleStatus(config.id)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        ))}
        <div className="config-fade"></div>
      </div>

      {/* 编辑弹窗 */}
      {editDialogOpen && (
        <div className="Setting-dialog-overlay">
          {/* 新增wrapper容器，保持居中 */}
          <div className="Setting-dialog-wrapper">
            {/* 左侧月份和周设置边栏 - 放在wrapper内 */}
            <div className="month-sidebar">
              <div className="month-navigation">
                {/* 向上三角形按钮 - 替换为图片 */}
                <button className="month-nav-img-btn" onClick={() => handleMonthChange(-1)}>
                  <img
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABDElEQVR4nO2TsUoDQRRFLwQiAYs0NnbptbL0D/wBrSy1zCdos7lPJEhAf0Cstsm+t5LGLh+QtBaSQmwshGArmjDThGTdjBu33AMPZob77m3mAhWlEMc1WOcYJiMox0jkxL/93/iijpSnMD7DZLY8nCBhG3G3sYnxtl9WecsaZ4LeobxE/6YZNh5EO16s/Agby2rQJ5Q9JFe7+QEm0+LGsjrTdQGzUiaXdUvKIdLOkR93LjHgCRodZrSPPIBJDOVP8QCVLygf0Jf9YA+cxmndTjiAEyjvoNctfx/0tqA8g/Hll1/j3s69xuF2VG5h8oogVQ9yqXpgfw/4hjH1JiHSaA/K+816UIRCPajAgjlKNx4kbNnFdAAAAABJRU5ErkJggg=="
                    alt="chevron-up"
                    style={{ width: '24px', height: '24px' }}
                  />
                </button>

                {/* 月份标题，用元素框起来 */}
                <div className="month-title-container">
                  <h3 className="month-title">{currentYear} {getMonthName(currentMonth)}</h3>
                </div>

                {/* 向下三角形按钮 - 替换为图片 */}
                <button className="month-nav-img-btn" onClick={() => handleMonthChange(1)}>
                  <img
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAABEElEQVR4nO1TsUoDQRQcEBQhhY2NnX2sUvoH+QGtLLX0E5LmMk9EQiD+gFhtk3vvJI2dH6CtRUghNhYSsRWN7CoiJrlkc2B1AwPLMm/mLewAJaJg8gCVLvR0O24QCDPKcxiHeQHjb77DmOGKtbnGWVKF8gIqbz/zCwT85jU02Z3Q+nATB+XHxExkwDhQeYOsVQ/05zztUgEWwZyAl+IBHM0O6CebUDahfF7C+BXKDtKTLcyFa1SQ8hgqjwsYP4Wleu2N+B70O2swOYJxMMV4AOVh0ET3wP9p5SV6svP1IreCVPahvIPJLay1F+48vMZryx6g7MH/9OAvXGMVGQ9gvJ9iPAxLuLN1FIbL6UEJFMQnWSceICHnTWcAAAAASUVORK5CYII="
                    alt="chevron-down"
                    style={{ width: '24px', height: '24px' }}
                  />
                </button>
              </div>

              {/* 周标签 */}
              <div className="week-tabs">
                {getWeeksInMonth(currentMonth, currentYear).map((week, index) => {
                  const pastWeek = isWeekPast(week);
                  return (
                    <button
                      key={index}
                      className={`week-tab ${activeWeek === index ? 'active' : ''} ${pastWeek ? 'past-week' : ''}`}
                      onClick={() => setActiveWeek(index)}
                      disabled={pastWeek}
                    >
                      <div className="week-tab-content">
                        <span className="week-number">第{index + 1}周</span>
                        <span className="week-date-range">({formatWeekRange(week)})</span>
                      </div>
                      {pastWeek && <div className="week-mask"></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 主对话框 */}
            <div className="Setting-dialog large-dialog">
              {showOverlay && <div className="setting-page-overlay"></div>}
              <div className="Setting-dialog-header">
                <h3>编辑配置 - {selectedConfig?.name}</h3>
                <button className="Setting-close-btn" onClick={handleCancelEdit}>×</button>
              </div>

              <div className="dialog-content-wrapper">
                {/* 右侧主要内容区域 */}
                <div className="main-content">
                  {/* Tabs */}
                  <div className="STtabs">
                    <button className={activeTab === "main" ? "active" : ""} onClick={() => setActiveTab("main")}>主要配置</button>
                    <button className={activeTab === "time" ? "active" : ""} onClick={() => setActiveTab("time")}>时间段配置</button>
                    <button className={activeTab === "blackwhite" ? "active" : ""} onClick={() => setActiveTab("blackwhite")}>黑白名单配置</button>
                  </div>

                  <div className="STtabs-content">
                    {activeTab === "main" && (
                      <div className="STtab-panel">
                        <div>
                          <label>休息时间清零策略:</label>
                          <select>
                            <option>关闭</option>
                            <option>下个工作日开始前</option>
                            <option>每天 4:00</option>
                            <option>每周一 4:00</option>
                            <option>每月初 4:00</option>
                          </select>
                        </div>

                        <div className="extra-config">
                          <div>
                            <input type="checkbox" /> 固定工作时长
                            <input type="number" placeholder="每日工作时长" />
                          </div>
                          <div>
                            <input type="checkbox" /> 严格模式
                            <input type="number" placeholder="最低工作时长" />
                          </div>
                          <div>
                            延期负数奖励比例:
                            <select>
                              <option>1:1</option>
                              <option>2:1</option>
                              <option>3:1</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "time" && (
                      <div className="tab-panel">
                        <WorkCalendar 
                          selectedWeek={selectedWeek}
                          onWeekChange={handleWeekChange}
                          parentCacheKey={`config-${selectedConfig.id}`}
                          saveEventsCache={saveEventsCache}
                          getEventsCache={getEventsCache}
                        />
                      </div>
                    )}

                    {activeTab === "blackwhite" && (
                      <BlackWhiteSettings
                        ref={blackWhiteSettingsRef}
                        activeWeek={activeWeek}
                        weeks={getWeeksInMonth(currentMonth, currentYear)}
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        // 添加文本缓存相关的props
                        saveEditTextCache={saveEditTextCache}
                        getEditTextCache={getEditTextCache}
                        activeTab={activeTab}
                      />
                    )}
                  </div>

                  <div className="Setting-dialog-footer">
                    <button className="Setting-btn-secondary" onClick={handleCancelEdit}>取消</button>
                    <button className="Setting-btn-primary" onClick={handleSaveSettings}>保存</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 风格对话框 */}
      <TipsDialog
        visible={dialogState.visible}
        title={dialogState.title}
        type={dialogState.type}
        message={dialogState.message}
        inputPlaceholder={dialogState.inputPlaceholder}
        inputValue={dialogState.inputValue}
        onClose={closeDialog}
        onConfirm={confirmDialog}
      />
    </div>
  );
};
