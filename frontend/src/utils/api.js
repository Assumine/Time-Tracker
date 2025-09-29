// utils/api.js
// API工具函数模块
import { API_BASE } from '../api';

/**
 * 统一的API请求工具函数
 * @param {string} endpoint - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise} 请求Promise
 */
export const request = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * 获取设置数据
 * @param {string} settingId - 设置ID
 * @returns {Promise} 包含设置数据的Promise
 */
export const getSettings = async (settingId) => {
  return request(`/settings/${settingId}`);
};

/**
 * 保存设置数据
 * @param {string} settingId - 设置ID
 * @param {Object} data - 要保存的数据
 * @returns {Promise} 保存结果的Promise
 */
export const saveSettings = async (settingId, data) => {
  return request(`/settings/${settingId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * 获取日志数据
 * @param {Object} params - 查询参数
 * @returns {Promise} 包含日志数据的Promise
 */
export const getLogs = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/logs?${queryString}`);
};

/**
 * 获取统计数据
 * @param {Object} params - 查询参数
 * @returns {Promise} 包含统计数据的Promise
 */
export const getStats = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return request(`/stats?${queryString}`);
};

// 获取应用列表
export const fetchAppsList = async () => {
  try {
    const response = await request('/api/apps/list');
    // 后端直接返回应用数据数组，不需要处理统一响应格式
    // 保持与后端一致的数据结构
    return response;
  } catch (error) {
    console.error('获取应用列表失败:', error);
    throw new Error('获取应用列表失败: ' + error.message);
  }
};