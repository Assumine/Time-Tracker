import React, { useState, useMemo, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react';
import '../assets/css/BlackWhiteSettings.css';
import '../assets/css/Settings.css'; // 保留基础样式导入
import { request, fetchAppsList } from '../utils/api'; // 添加API工具导入

// 应用等级常量定义
const APP_LEVELS = {
  BLACK: 'black',     // 黑名单应用
  NORMAL: 'normal',   // 普通应用
  WHITE: 'white'      // 白名单应用
};

// 冷却天数常量定义
const COOLING_PERIODS = {
  black: 2,
  normal: 2,
  white: 2
};

// 将分钟数转换为"h m"格式的函数
/**
 * 将分钟数转换为"h m"格式
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化后的时间字符串，例如"2h15m"
 */
const formatMinutesToHM = (minutes) => {
  if (minutes === null || minutes === undefined || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}m`;
  }
};

// 将"h m"格式转换为分钟数的函数
/**
 * 将"h m"格式转换为分钟数
 * @param {string} timeStr - 时间字符串，例如"2h15m"
 * @returns {number} 分钟数
 */
const parseHMToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+)h(\d+)m/);
  if (match) {
    return parseInt(match[1]) * 60 + parseInt(match[2]);
  }
  const hMatch = timeStr.match(/(\d+)h/);
  if (hMatch) {
    return parseInt(hMatch[1]) * 60;
  }
  const mMatch = timeStr.match(/(\d+)m/);
  if (mMatch) {
    return parseInt(mMatch[1]);
  }
  return 0;
};

  // 空的应用数据数组，实际数据将从后端获取
const EMPTY_APPS = [];

// 默认路径列表 - 清空预输入数据
const DEFAULT_PATHS_LIST = {
  black: [''],
  white: ['']
};

// 默认名称列表 - 清空预输入数据
const DEFAULT_NAMES_LIST = {
  black: [''],
  white: ['']
};

// 生成唯一的周标识符
const generateWeekKey = (year, month, weekIndex) => {
  return `${year}-${month}-${weekIndex}`;
};

// 使用forwardRef包装组件以便暴露方法给父组件
const BlackWhiteSettings = forwardRef(({ activeWeek, weeks = [], currentMonth, currentYear, isConfigEnabled = true, isWorkingTime = false, 
  // 添加文本缓存相关的props
  saveEditTextCache,
  getEditTextCache,
  activeTab: parentActiveTab
}, ref) => {
  // 冷却期常量定义（单位：天）
  const COOLING_PERIODS = {
    black: 2,   // 黑名单冷却期2天
    normal: 2,  // 普通应用冷却期2天
    white: 2    // 白名单冷却期2天
  };

  // 获取应用列表数据
  const fetchAppsListInternal = useCallback(async () => {
    try {
      // 使用新的API函数获取应用列表
      const appsData = await fetchAppsList(); // 调用utils/api.js中导入的fetchAppsList函数
      console.log('获取应用列表:', appsData);
      setApps(appsData);
      return appsData;
    } catch (error) {
      console.error('获取应用列表失败:', error);
      // 失败时使用空数据
      setApps(EMPTY_APPS);
      return EMPTY_APPS;
    }
  }, []);

  // 获取设置数据的函数 - 替换为实际的API调用
  const fetchSettingsData = useCallback(async () => {
    try {
      // 构造请求参数
      const params = {
        year: currentYear,
        month: currentMonth,
        week: activeWeek
      };
      
      // 发起API请求获取设置数据
      const data = await request('/api/settings', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      // 更新组件状态
      setApps(data.apps || []);
      setPathsList(data.pathsList || {});
      setNamesList(data.namesList || {});
      setNormalUpgradeQuota(data.normalUpgradeQuota || 0);
      setWhiteUpgradeQuota(data.whiteUpgradeQuota || 0);
      
      return data;
    } catch (error) {
      console.error('获取设置数据失败:', error);
      // 失败时使用空数据
      setApps(EMPTY_APPS);
      setPathsList(DEFAULT_PATHS_LIST);
      setNamesList(DEFAULT_NAMES_LIST);
      setNormalUpgradeQuota(0);
      setWhiteUpgradeQuota(0);
      return null;
    }
  }, [currentYear, currentMonth, activeWeek]);
    // 周级数据存储 - 使用对象存储不同周的数据
    const [weeklyData, setWeeklyData] = useState({});

    // 当前周的数据
    const [activeTab, setActiveTab] = useState('black'); // black, white 互斥切换
    const [apps, setApps] = useState(EMPTY_APPS);
    const [pathsList, setPathsList] = useState(DEFAULT_PATHS_LIST);
    const [namesList, setNamesList] = useState(DEFAULT_NAMES_LIST);

    // 升级额度设置
    const [normalUpgradeQuota, setNormalUpgradeQuota] = useState(0); // 普通应用升级额度
    const [whiteUpgradeQuota, setWhiteUpgradeQuota] = useState(0); // 白名单应用升级额度

    // 其他UI状态
    const [hoveredApp, setHoveredApp] = useState(null); // 当前悬停的应用 {id, level}
    const [showTooltip, setShowTooltip] = useState(false); // 是否显示提示框
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 }); // 提示框位置

    // 初始化应用列表数据
  useEffect(() => {
    fetchAppsListInternal();
  }, []);

  // 当周切换时，加载或继承对应周的数据
  useEffect(() => {
    const loadData = async () => {
      if (activeWeek !== undefined && currentYear !== undefined && currentMonth !== undefined) {
        const weekKey = generateWeekKey(currentYear, currentMonth, activeWeek);
        
        // 检查是否有缓存的文本内容
        let cachedText = null;
        if (getEditTextCache && parentActiveTab) {
          cachedText = getEditTextCache(parentActiveTab);
        }
        
        // 如果周数据已存在，从中加载数据
        if (weeklyData[weekKey]) {
          const weekData = weeklyData[weekKey];
          // 如果有缓存的文本内容，优先使用缓存的文本内容
          setApps(weekData.apps || []);
          setPathsList(cachedText?.pathsList || weekData.pathsList || { black: ['', ''], white: ['', ''] });
          setNamesList(cachedText?.namesList || weekData.namesList || { black: ['', ''], white: ['', ''] });
          setNormalUpgradeQuota(weekData.normalUpgradeQuota !== undefined ? weekData.normalUpgradeQuota : 2);
          setWhiteUpgradeQuota(weekData.whiteUpgradeQuota !== undefined ? weekData.whiteUpgradeQuota : 2);
        } else {
          // 从settings获取数据
          try {
            const data = await fetchSettingsData();
            // 如果有缓存的文本内容，优先使用缓存的文本内容
            setApps(data.apps || []);
            setPathsList(cachedText?.pathsList || data.pathsList || { black: ['', ''], white: ['', ''] });
            setNamesList(cachedText?.namesList || data.namesList || { black: ['', ''], white: ['', ''] });
            setNormalUpgradeQuota(data.normalUpgradeQuota !== undefined ? data.normalUpgradeQuota : 2);
            setWhiteUpgradeQuota(data.whiteUpgradeQuota !== undefined ? data.whiteUpgradeQuota : 2);
          } catch (error) {
            // 如果获取数据失败，使用空数据
            console.error('Failed to fetch settings data:', error);
            setApps([...EMPTY_APPS]);
            // 如果有缓存的文本内容，优先使用缓存的文本内容
            setPathsList(cachedText?.pathsList || { black: [''], white: [''] });
            setNamesList(cachedText?.namesList || { black: [''], white: [''] });
            setNormalUpgradeQuota(0);
            setWhiteUpgradeQuota(0);
          }
        }
      }
    };

    loadData();
  }, [activeWeek, currentMonth, currentYear, weeklyData, fetchSettingsData]);

  // 监听tab切换，保存当前tab的文本内容并恢复目标tab的文本内容
  useEffect(() => {
    // 如果有父组件传递的文本缓存函数
    if (saveEditTextCache && getEditTextCache && parentActiveTab) {
      // 保存当前tab的文本内容（这里可以根据实际需要实现）
      // 例如：saveEditTextCache(currentTab, { pathsList, namesList });
      
      // 恢复目标tab的文本内容（这里可以根据实际需要实现）
      // 例如：const cachedText = getEditTextCache(targetTab);
    }
  }, [parentActiveTab, saveEditTextCache, getEditTextCache]);

  // 保存当前周的数据
  const saveCurrentWeekData = () => {
    if (activeWeek !== undefined && currentYear !== undefined && currentMonth !== undefined) {
      const weekKey = generateWeekKey(currentYear, currentMonth, activeWeek);

      // 准备要保存的数据
      const currentData = {
        apps: [...apps], // 保存数组而不是对象
        pathsList: { ...pathsList },
        namesList: { ...namesList },
        normalUpgradeQuota,
        whiteUpgradeQuota
      };

      // 存储当前周的数据（总是保存，确保状态同步）
      setWeeklyData(prev => ({
        ...prev,
        [weekKey]: currentData
      }));

      // 同时保存到settings
      saveSettingsData(currentData);
    }
  };

  // 保存数据到settings的函数 - 替换为实际的API调用
  const saveSettingsData = useCallback(async (data) => {
    try {
      // 发起API请求保存设置数据
      const response = await request('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      
      console.log('设置数据保存成功:', response);
      return { success: true, data: response };
    } catch (error) {
      console.error('保存设置数据失败:', error);
      return { success: false, error };
    }
  }, []);

  // 按近3日均值从大到小排序应用
  const sortedApps = useMemo(() => {
    // 对每个级别应用排序
    const sorted = {
      black: [],
      normal: [],
      white: []
    };
    
    // 根据level属性对应用进行分类并排序
    apps.forEach(app => {
      if (app.level === 'black') {
        sorted.black.push(app);
      } else if (app.level === 'normal') {
        sorted.normal.push(app);
      } else if (app.level === 'white') {
        sorted.white.push(app);
      }
    });
    
    // 对每个级别的应用按avgTime降序排序
    Object.keys(sorted).forEach(level => {
      sorted[level].sort((a, b) => b.avgTime - a.avgTime);
    });
    
    return sorted;
  }, [apps]);

  // 获取当前激活的路径列表
  const getActivePathsList = () => {
    const list = pathsList[activeTab];
    return list || [];
  };

  // 获取当前激活的名称列表
  const getActiveNamesList = () => {
    const list = namesList[activeTab];
    return list || [];
  };

  // 更新路径列表中的项目
  const updatePathItem = (index, value) => {
    const updatedList = [...getActivePathsList()];
    if (value === '') {
      if (index < updatedList.length - 1) {
        updatedList.splice(index, 1);
        if (updatedList[updatedList.length - 1] !== '') {
          updatedList.push('');
        }
      }
    } else {
      updatedList[index] = value;
      if (index === updatedList.length - 1) {
        updatedList.push('');
      }
    }
    const newPathsList = {
      ...pathsList,
      [activeTab]: updatedList
    };
    setPathsList(newPathsList);
    
    // 保存到文本缓存
    if (saveEditTextCache && parentActiveTab) {
      saveEditTextCache(parentActiveTab, { 
        ...getEditTextCache(parentActiveTab),
        pathsList: newPathsList
      });
    }
  };

  // 更新名称列表中的项目
  const updateNameItem = (index, value) => {
    const updatedList = [...getActiveNamesList()];
    if (value === '') {
      if (index < updatedList.length - 1) {
        updatedList.splice(index, 1);
        if (updatedList[updatedList.length - 1] !== '') {
          updatedList.push('');
        }
      }
    } else {
      updatedList[index] = value;
      if (index === updatedList.length - 1) {
        updatedList.push('');
      }
    }
    const newNamesList = {
      ...namesList,
      [activeTab]: updatedList
    };
    setNamesList(newNamesList);
    
    // 保存到文本缓存
    if (saveEditTextCache && parentActiveTab) {
      saveEditTextCache(parentActiveTab, { 
        ...getEditTextCache(parentActiveTab),
        namesList: newNamesList
      });
    }
  };

  // 验证路径输入的有效性
  const validatePathInput = (value) => {
    // 简单验证：检查是否包含.exe或路径分隔符
    return value.trim() === '' || value.includes('.exe') || value.includes('\\') || value.includes('/');
  };

  // 验证名称输入的有效性
  const validateNameInput = (value) => {
    // 简单验证：检查是否不为空且包含字母或数字
    return value.trim() === '' || /[a-zA-Z0-9]/.test(value);
  };

  // 处理路径输入框失焦事件
  const handlePathBlur = (index, value) => {
    // 验证输入内容
    const isValid = validatePathInput(value);
    
    // 如果输入无效且不为空，显示警告
    if (!isValid && value.trim() !== '') {
      alert('路径格式可能不正确，请检查输入内容');
    }
    
    // 触发筛选更新
    triggerFilterUpdate();
  };

  // 处理名称输入框失焦事件
  const handleNameBlur = (index, value) => {
    // 验证输入内容
    const isValid = validateNameInput(value);
    
    // 如果输入无效且不为空，显示警告
    if (!isValid && value.trim() !== '') {
      alert('名称格式可能不正确，请检查输入内容');
    }
    
    // 触发筛选更新
    triggerFilterUpdate();
  };

  // 触发筛选更新
  const triggerFilterUpdate = () => {
    // 获取当前活动标签页的路径和名称列表
    const activePaths = getActivePathsList();
    const activeNames = getActiveNamesList();
    
    // 检查路径和名称是否都填写了至少一个
    const hasValidPaths = activePaths.some(path => path.trim() !== '');
    const hasValidNames = activeNames.some(name => name.trim() !== '');
    
    // 如果没有有效的筛选条件，直接返回
    if (!hasValidPaths && !hasValidNames) {
      return;
    }
    
    // 根据当前活动标签页确定要更新的应用类型
    const targetType = activeTab === 'black' ? 'black' : 'white';
    
    // 创建新的应用列表，根据筛选条件更新应用的level属性
    const updatedApps = apps.map(app => {
      // 检查应用是否匹配当前筛选条件
      const matchesPath = hasValidPaths && activePaths.some(path => 
        path.trim() !== '' && app.path && wildcardMatch(path, app.path)
      );
      
      const matchesName = hasValidNames && activeNames.some(name => 
        name.trim() !== '' && app.name && wildcardMatch(name, app.name)
      );
      
      // 如果匹配，则更新level属性
      if (matchesPath || matchesName) {
        return { ...app, level: targetType };
      }
      
      return app;
    });
    
    // 更新应用状态以触发重新渲染
    setApps(updatedApps);
  };

  // 获取应用详情 - 修改为新的数据结构
  const getAppDetails = (id) => {
    return apps.find(app => app.id === id);
  };

  // 检查是否可以执行升级操作
  const canUpgrade = (currentLevel, rowIndex, coolingDays) => {
    // 检查是否在工作时间段内
    if (isWorkingTime) return false;

    // 检查是否仅前3项
    if (rowIndex >= 3) return false;

    // 检查配置是否启用
    if (!isConfigEnabled) return false;

    // 检查冷却期
    if (coolingDays > 0) return false;

    // 检查升级额度
    if (currentLevel === 'black' && normalUpgradeQuota <= 0) return false;
    if (currentLevel === 'normal' && whiteUpgradeQuota <= 0) return false;

    return true;
  };

  // 检查是否可以执行降级操作
  const canDowngrade = (coolingDays) => {
    // 检查是否在工作时间段内
    if (isWorkingTime) return false;

    // 检查配置是否启用
    if (!isConfigEnabled) return false;

    // 降级不需要检查冷却期，立即生效
    return true;
  };

  // 应用升级
  const upgradeApp = (appId, currentLevel, rowIndex) => {
    const appDetails = getAppDetails(appId);

    // 检查是否可以升级
    if (!canUpgrade(currentLevel, rowIndex, appDetails.coolingDays)) {
      if (rowIndex >= 3) {
        alert('只有前3项应用可以升级');
      } else if (isWorkingTime) {
        alert('工作时间段内不可进行升级操作');
      } else if (!isConfigEnabled) {
        alert('配置未启用，不可进行升级操作');
      } else if (appDetails.coolingDays > 0) {
        alert('应用处于冷却期，无法升级');
      } else if (currentLevel === 'black' && normalUpgradeQuota <= 0) {
        alert('普通应用升级额度已用完');
      } else if (currentLevel === 'normal' && whiteUpgradeQuota <= 0) {
        alert('白名单应用升级额度已用完');
      }
      return;
    }

    let newLevel = '';

    if (currentLevel === 'normal') {
      newLevel = 'white';
    } else if (currentLevel === 'black') {
      newLevel = 'normal';
    }

    // 确定冷却期：检查是否有黑名单历史
    let coolingDays = 0;
    if (currentLevel === 'black') {
      coolingDays = COOLING_PERIODS.black; // 2天冷却期
    } else if (currentLevel === 'normal') {
      // 曾是黑名单的普通应用升级到白名单需要3天冷却期，否则需要2天
      coolingDays = appDetails.hasBlackHistory ? 3 : COOLING_PERIODS.normal;
    }

    // 更新应用的级别和其他属性
    const updatedApps = apps.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          level: newLevel,
          coolingDays,
          hasBlackHistory: currentLevel === 'black' ? true : app.hasBlackHistory, // 从黑名单升级到普通应用，标记有黑名单历史
          upgradeSourceId: appId,  // 记录升级来源ID
          lastUpdated: new Date().toISOString()
        };
      }
      return app;
    });

    setApps(updatedApps);

    // 更新额度
    if (currentLevel === 'normal') {
      // 减少白名单升级额度
      setWhiteUpgradeQuota(prev => prev - 1);
    } else if (currentLevel === 'black') {
      // 减少普通应用升级额度
      setNormalUpgradeQuota(prev => prev - 1);
    }

    // 更新悬停状态
    if (hoveredApp?.id === appId) {
      setHoveredApp({ id: appId, level: newLevel });
    }

    // 更新周数据
    setTimeout(() => {
      saveCurrentWeekData();
    }, 0);
  };

  // 应用降级
  const downgradeApp = (appId, currentLevel) => {
    const appDetails = getAppDetails(appId);

    // 检查是否可以降级
    if (!canDowngrade(appDetails.coolingDays)) {
      if (isWorkingTime) {
        alert('工作时间段内不可进行降级操作');
      } else if (!isConfigEnabled) {
        alert('配置未启用，不可进行降级操作');
      }
      return;
    }

    let newLevel = '';

    // 根据当前级别确定新级别
    if (currentLevel === 'normal') {
      newLevel = 'black';
    } else if (currentLevel === 'white') {
      newLevel = 'normal';
    }

    // 更新应用的级别和其他属性
    const updatedApps = apps.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          level: newLevel,
          lastUpdated: new Date().toISOString(),
          // 降级立即生效，无冷却期
          coolingDays: 0,
          // 如果从白名单降级到普通应用，清除升级来源ID
          upgradeSourceId: newLevel === 'normal' && currentLevel === 'white' ? null : app.upgradeSourceId,
          // 如果从普通应用降级到黑名单，清除黑名单历史标记
          hasBlackHistory: newLevel === 'black' && currentLevel === 'normal' ? false : app.hasBlackHistory
        };
      }
      return app;
    });

    setApps(updatedApps);

    // 更新额度
    if (currentLevel === 'normal') {
      // 降级普通应用到黑名单时，返还普通应用升级额度
      setNormalUpgradeQuota(prev => prev + 1);
    } else if (currentLevel === 'white') {
      // 降级白名单到普通应用时，返还白名单升级额度
      setWhiteUpgradeQuota(prev => prev + 1);
    }

    // 更新悬停状态
    if (hoveredApp?.id === appId) {
      setHoveredApp({ id: appId, level: newLevel });
    }

    // 更新周数据
    setTimeout(() => {
      saveCurrentWeekData();
    }, 0);
  };
// 通配符匹配函数
const wildcardMatch = (pattern, text) => {
  if (!pattern || !text) return false;
  
  // 如果pattern包含"*"，则进行模糊匹配；否则进行精确匹配
  if (pattern.includes("*")) {
    // 将通配符模式转换为正则表达式
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
      .replace(/\*/g, '.*'); // 将*替换为.*
    const regex = new RegExp(`^${regexPattern}$`, 'i'); // 不区分大小写
    return regex.test(text);
  } else {
    // 精确匹配
    return pattern.toLowerCase() === text.toLowerCase();
  }
};

const getAppFilterRules = (app) => {
  // 检查黑名单规则
  const blackPaths = pathsList.black || [];
  const blackNames = namesList.black || [];
  
  const matchesBlackPath = blackPaths.some(path => 
    path.trim() !== '' && app.path && wildcardMatch(path, app.path)
  );
  
  const matchesBlackName = blackNames.some(name => 
    name.trim() !== '' && app.name && wildcardMatch(name, app.name)
  );
  
  // 检查白名单规则
  const whitePaths = pathsList.white || [];
  const whiteNames = namesList.white || [];
  
  const matchesWhitePath = whitePaths.some(path => 
    path.trim() !== '' && app.path && wildcardMatch(path, app.path)
  );
  
  const matchesWhiteName = whiteNames.some(name => 
    name.trim() !== '' && app.name && wildcardMatch(name, app.name)
  );
  
  // 如果同时匹配黑白名单，白名单优先
  if ((matchesBlackPath || matchesBlackName) && (matchesWhitePath || matchesWhiteName)) {
    const ruleType = matchesWhitePath ? '路径规则' : '名称规则';
    const matchedValue = matchesWhitePath ? 
      whitePaths.find(path => path.trim() !== '' && wildcardMatch(path, app.path)) :
      whiteNames.find(name => name.trim() !== '' && wildcardMatch(name, app.name));
    return { type: ruleType, value: matchedValue, level: 'white' };
  }
  
  // 如果匹配黑名单规则
  if (matchesBlackPath || matchesBlackName) {
    const ruleType = matchesBlackPath ? '路径规则' : '名称规则';
    const matchedValue = matchesBlackPath ? 
      blackPaths.find(path => path.trim() !== '' && wildcardMatch(path, app.path)) :
      blackNames.find(name => name.trim() !== '' && wildcardMatch(name, app.name));
    return { type: ruleType, value: matchedValue, level: 'black' };
  }
  
  // 如果匹配白名单规则
  if (matchesWhitePath || matchesWhiteName) {
    const ruleType = matchesWhitePath ? '路径规则' : '名称规则';
    const matchedValue = matchesWhitePath ? 
      whitePaths.find(path => path.trim() !== '' && wildcardMatch(path, app.path)) :
      whiteNames.find(name => name.trim() !== '' && wildcardMatch(name, app.name));
    return { type: ruleType, value: matchedValue, level: 'white' };
  }
  
  // 如果没有匹配任何规则，返回当前应用等级
  return { type: '未匹配', level: app.level };
};

  // 处理鼠标移动（提示框跟随 + 边界处理）
  const handleMouseMove = (event) => {
    if (showTooltip) {
      const container = event.currentTarget.closest(".BlackWhiteSettings-page"); // 模块容器
      if (container) {
        const rect = container.getBoundingClientRect();

        // 鼠标相对于容器的坐标
        let x = event.clientX - rect.left + 8; // 加一点偏移
        let y = event.clientY - rect.top + 8;

        const tooltipEl = document.querySelector(".app-tooltip");
        if (tooltipEl) {
          const tipRect = tooltipEl.getBoundingClientRect();

          // 容器的宽高
          const containerW = rect.width;
          const containerH = rect.height;

          // 边界检测：防止超出容器
          if (x + tipRect.width > containerW) {
            x = event.clientX - rect.left - tipRect.width - 8;
          }
          if (y + tipRect.height > containerH) {
            y = event.clientY - rect.top - tipRect.height - 8;
          }

          // 不允许负数（避免 tooltip 被拉到容器外）
          x = Math.max(0, x);
          y = Math.max(0, y);
        }

        setTooltipPosition({ x, y });
      }
    }
  };

  // 保存设置 - 更新为可在父组件调用的方法
  const saveSettings = () => {
    // 检查路径和名称是否都填写了至少一个
    const hasValidPaths = getActivePathsList().some(path => path.trim() !== '');
    const hasValidNames = getActiveNamesList().some(name => name.trim() !== '');

    if (!hasValidPaths && !hasValidNames) {
      alert('请至少填写一个程序路径或程序名称');
      return;
    }

    // 根据当前活动标签页确定要更新的应用类型
    const targetType = activeTab === 'black' ? 'black' : 'white';

    // 更新应用的level属性
    const updatedApps = apps.map(app => {
      // 检查应用是否匹配当前筛选条件
      const matchesPath = hasValidPaths && getActivePathsList().some(path => 
        path.trim() !== '' && app.path && wildcardMatch(path, app.path)
      );
      
      const matchesName = hasValidNames && getActiveNamesList().some(name => 
        name.trim() !== '' && app.name && wildcardMatch(name, app.name)
      );

      // 如果匹配，则更新level属性
      if (matchesPath || matchesName) {
        return { ...app, level: targetType };
      }
      
      return app;
    });

    // 更新应用状态
    setApps(updatedApps);

    // 保存到weeklyData中
    const weekKey = generateWeekKey(currentYear, currentMonth, activeWeek);
    const newWeeklyData = {
      ...weeklyData,
      [weekKey]: {
        apps: updatedApps,
        pathsList: { ...pathsList },
        namesList: { ...namesList },
        normalUpgradeQuota,
        whiteUpgradeQuota
      }
    };

    setWeeklyData(newWeeklyData);

    // 调用父组件传递的onSave回调（如果有的话）
    if (ref && typeof ref === 'function') {
      ref(newWeeklyData);
    }

    alert('设置已保存');
  };

  // 处理应用悬停事件
  const handleAppHover = (appId, level) => {
    setHoveredApp({ id: appId, level });
    setShowTooltip(true);
  };

  // 处理应用离开悬停事件
  const handleAppLeave = () => {
    setHoveredApp(null);
    setShowTooltip(false);
  };

  // 使用useImperativeHandle暴露方法给父组件
  useImperativeHandle(ref, () => ({
    // 保存设置方法
    saveSettings() {
      // 验证输入
      if (!validateInput()) {
        alert('请检查输入是否正确');
        return false;
      }
      
      // 更新应用级别到weeklyData
      const updatedWeeklyData = { ...weeklyData };
      Object.entries(appLevels).forEach(([appName, level]) => {
        if (!updatedWeeklyData[currentWeekKey]) {
          updatedWeeklyData[currentWeekKey] = {};
        }
        updatedWeeklyData[currentWeekKey][appName] = level;
      });
      
      setWeeklyData(updatedWeeklyData);
      
      // 调用保存周数据的函数
      saveCurrentWeekData(updatedWeeklyData);
      
      return true;
    },
    
    // 获取当前设置方法，供父组件导出配置使用
    getCurrentSettings() {
      return {
        // 获取当前的黑白名单和路径配置
        blacklist: namesList.black,
        whitelist: namesList.white,
        pathsList: {
          black: pathsList.black,
          white: pathsList.white
        },
        namesList: {
          black: namesList.black,
          white: namesList.white
        },
        // 获取应用级别配置
        appLevels: { ...appLevels },
        // 获取每周数据
        weeklyData: { ...weeklyData },
        // 获取配额设置
        normalUpgradeQuota,
        whiteUpgradeQuota
      };
    }
  }));
  // 获取应用行的CSS类名
  const getAppRowClass = (level, app, rowIndex) => {
    let baseClass = '';
    
    // 根据级别设置基础类名
    switch (level) {
      case 'black':
        baseClass = 'black-app';
        break;
      case 'normal':
        baseClass = 'normal-app';
        break;
      case 'white':
        baseClass = 'white-app';
        break;
      default:
        baseClass = '';
    }
    
    // 添加悬停效果类
    if (hoveredApp && hoveredApp.id === app.id) {
      baseClass += ' hovered';
    }
    
    return baseClass;
  };

  // 渲染匹配表格
  const renderMatchTable = () => {
    // 获取每个级别的应用并排序
    const blackApps = sortedApps.black;
    const normalApps = sortedApps.normal;
    const whiteApps = sortedApps.white;

    // 计算最大行数
    const maxRows = Math.max(blackApps.length, normalApps.length, whiteApps.length);

    return (
      <div className="match-table-container">
        <table className="match-table">
          <thead>
            <tr>
              <th className="black-column">黑名单</th>
              <th className="normal-column">普通应用</th>
              <th className="white-column">白名单</th>
            </tr>
          </thead>
          <tbody>
            {/* 额度显示行 */}
            <tr>
              <td className="black-column quota-cell">
                <div className="quota-display">升级额度: 无</div>
              </td>
              <td className="normal-column quota-cell">
                <div className="quota-display">升级额度: {normalUpgradeQuota}/2</div>
              </td>
              <td className="white-column quota-cell">
                <div className="quota-display">升级额度: {whiteUpgradeQuota}/2</div>
              </td>
            </tr>
            {Array.from({ length: maxRows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {/* 黑名单列 */}
                <td className="black-column">
                  {blackApps[rowIndex] ? (
                    <div
                      className="app-item black-app"
                      onMouseEnter={(e) => handleAppHover(blackApps[rowIndex].id, 'black')}
                      onMouseLeave={handleAppLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <span className="app-name">{blackApps[rowIndex].name}</span>
                      <button
                        className="icon-btn up"
                        title="升级到普通应用"
                        onClick={() => upgradeApp(blackApps[rowIndex].id, 'black', rowIndex)}
                        disabled={!canUpgrade('black', rowIndex, blackApps[rowIndex].coolingDays)}
                      >
                        →
                      </button>
                    </div>
                  ) : (
                    <div className="empty-cell"></div>
                  )}
                </td>

                {/* 普通列 */}
                <td className="normal-column">
                  {normalApps[rowIndex] ? (
                    <div
                      className="app-item normal-app"
                      onMouseEnter={(e) => handleAppHover(normalApps[rowIndex].id, 'normal')}
                      onMouseLeave={handleAppLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <button
                        className="icon-btn down"
                        title="降级到黑名单"
                        onClick={() => downgradeApp(normalApps[rowIndex].id, 'normal')}
                        disabled={!canDowngrade(normalApps[rowIndex].coolingDays)}
                      >
                        ←
                      </button>
                      <span className="app-name">{normalApps[rowIndex].name}</span>
                      <button
                        className="icon-btn up"
                        title="升级到白名单"
                        onClick={() => upgradeApp(normalApps[rowIndex].id, 'normal', rowIndex)}
                        disabled={!canUpgrade('normal', rowIndex, normalApps[rowIndex].coolingDays)}
                      >
                        →
                      </button>
                    </div>
                  ) : (
                    <div className="empty-cell"></div>
                  )}
                </td>

                {/* 白名单列 */}
                <td className="white-column">
                  {whiteApps[rowIndex] ? (
                    <div
                      className="app-item white-app"
                      onMouseEnter={(e) => handleAppHover(whiteApps[rowIndex].id, 'white')}
                      onMouseLeave={handleAppLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <button
                        className="icon-btn down"
                        title="降级到普通应用"
                        onClick={() => downgradeApp(whiteApps[rowIndex].id, 'white')}
                        disabled={!canDowngrade(whiteApps[rowIndex].coolingDays)}
                      >
                        ←
                      </button>
                      <span className="app-name">{whiteApps[rowIndex].name}</span>
                    </div>
                  ) : (
                    <div className="empty-cell"></div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 获取当前显示的周信息
  const getCurrentWeekInfo = () => {
    if (activeWeek !== undefined && weeks[activeWeek]) {
      const week = weeks[activeWeek];
      const start = week.start;
      const end = week.end;
      const formatDate = (date) => {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}`;
      };
      return `${formatDate(start)}-${formatDate(end)}`;
    }
    return '';
  };

  return (
    <div className="BlackWhiteSettings-page">
      {/* 显示当前周信息 */}
      <div className="week-info">
        <h4>当前设置周期：第{activeWeek + 1}周 {getCurrentWeekInfo()}</h4>
        <small>（后一周未设置时将自动沿用前一周的配置）</small>
      </div>

      {/* 隐藏手动配置的复选框，只保留后端传入的接口 */}
      {/* 以下内容将在数据接入时由父组件传入参数控制 */}
      {/* <div className="config-status">
        <label>
          <input 
            type="checkbox" 
            checked={isConfigEnabled} 
            onChange={(e) => setIsConfigEnabled(e.target.checked)}
          />
          启用配置
        </label>
        <label>
          <input 
            type="checkbox" 
            checked={isWorkingTime} 
            onChange={(e) => setIsWorkingTime(e.target.checked)}
          />
          当前处于工作时间段
        </label>
      </div> */}

      <div className="BKtabs">
        <button className={activeTab === "black" ? "active" : ""} onClick={() => setActiveTab("black")}>黑名单</button>
        <button className={activeTab === "white" ? "active" : ""} onClick={() => setActiveTab("white")}>白名单</button>
      </div>

      <div className={`tab-content ${activeTab}-tab-content`}>
        <div className="win11-card list-card">
          <h3 className="card-title">程序路径</h3>
          <div className="list-container">
            {getActivePathsList().map((item, idx) => (
              <div key={idx} className="list-row">
                <input
                  type="text"
                  value={item}
                  className="list-input"
                  onChange={(e) => updatePathItem(idx, e.target.value)}
                  onBlur={(e) => handlePathBlur(idx, e.target.value)} // 添加失焦事件
                  placeholder="输入程序路径"
                />
                {item === "" ? (
                  <button className="icon-btn add" title="添加" onClick={() => updatePathItem(idx, '')}>+</button>
                ) : (
                  <button className="icon-btn del" title="删除" onClick={() => updatePathItem(idx, '')}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="win11-card list-card">
          <h3 className="card-title">程序名称</h3>
          <div className="list-container">
            {getActiveNamesList().map((item, idx) => (
              <div key={idx} className="list-row">
                <input
                  type="text"
                  value={item}
                  className="list-input"
                  onChange={(e) => updateNameItem(idx, e.target.value)}
                  onBlur={(e) => handleNameBlur(idx, e.target.value)} // 添加失焦事件
                  placeholder="输入程序名称"
                />
                {item === "" ? (
                  <button className="icon-btn add" title="添加" onClick={() => updateNameItem(idx, '')}>+</button>
                ) : (
                  <button className="icon-btn del" title="删除" onClick={() => updateNameItem(idx, '')}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="apps-section">
        <h3 className="section-title">应用分类</h3>
        {renderMatchTable()}
      </div>

      {showTooltip && hoveredApp && (
        <div
          className="app-tooltip"
          style={{
            position: 'absolute',
            left: tooltipPosition.x + 40,
            top: tooltipPosition.y + 10,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {(() => {
            const appDetails = getAppDetails(hoveredApp.id);
            if (!appDetails) return null;
            const filterRule = getAppFilterRules(appDetails);
            return (
              <div className="tooltip-content">
                <p><strong>今日：</strong>{formatMinutesToHM(appDetails.dailyTime)}</p>
                <p><strong>3日均值：</strong>{appDetails.avgTime > 0 ? formatMinutesToHM(appDetails.avgTime) : '数据不足'}</p>
                {/* 筛选规则信息 */}
                <p><strong>筛选规则：</strong></p>
                <ul style={{ paddingLeft: '15px', margin: '2px 0' }}>
                  <li>
                    {filterRule.type === '未匹配' ? (
                      <span>{filterRule.level === 'black' ? '黑名单' : filterRule.level === 'white' ? '白名单' : '普通应用'}等级</span>
                    ) : filterRule.type === '路径规则' ? (
                      <span>路径:{formatPathForDisplay(filterRule.value)}</span>
                    ) : (
                      <span>名称:{formatNameForDisplay(filterRule.value)}</span>
                    )}
                  </li>
                </ul>
                
                {appDetails.coolingDays > 0 ? (
                  <>
                    <p><strong>当前等级：</strong>
                      {appDetails.level === 'black' ? '黑名单' :
                        appDetails.level === 'white' ? '白名单' : '普通应用'}
                    </p>
                    <p><strong>下一等级：</strong>
                      {appDetails.level === 'black' ? '普通应用' :
                        appDetails.level === 'white' ? '普通应用' : 
                        (appDetails.level === 'normal' ? '白名单' : '普通应用')}
                    </p>
                    <span className="tooltip-cooling-status">
                      {appDetails.level === 'black' ? '降级中' : '计划升级中'}（{appDetails.coolingDays}天冷却）
                    </span>
                  </>
                ) : (
                  <>
                    <p><strong>当前等级：</strong>
                      {appDetails.level === 'black' ? '黑名单' :
                        appDetails.level === 'white' ? '白名单' : '普通应用'}
                    </p>
                    {(appDetails.level === 'normal' || appDetails.level === 'white') && (
                      <p><strong>黑名单历史：</strong>{appDetails.hasBlackHistory ? '有' : '无'}</p>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
});

// 设置displayName以便调试
BlackWhiteSettings.displayName = 'BlackWhiteSettings';

// 格式化路径显示（最多显示30个字符，添加省略号）
const formatPathForDisplay = (path) => {
  if (!path) return '';
  
  // 如果有盘符
  if (path.includes(':\\')) {
    const parts = path.split(':\\');
    const drive = parts[0];
    const rest = parts[1];
    
    if (rest.length > 30) {
      return ` "${drive}:\\...${rest.substring(rest.length - 27)}"`;
    }
    return ` "${drive}:\\${rest}"`;
  } else {
    // 没有盘符的情况
    if (path.length > 30) {
      return ` "...${path.substring(path.length - 30)}"`;
    }
    return ` "${path}"`;
  }
};

// 格式化名称显示（最多显示30个字符，添加省略号）
const formatNameForDisplay = (name) => {
  if (!name) return '';
  
  if (name.length > 30) {
    return ` "...${name.substring(name.length - 30)}"`;
  }
  return ` "${name}"`;
};

export default BlackWhiteSettings;

