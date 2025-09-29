import React, { useState } from "react";

/**
 * 通用提示对话框组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.visible - 是否显示对话框
 * @param {string} props.title - 对话框标题
 * @param {'info'|'warning'|'error'|'success'} props.type - 对话框类型
 * @param {string} props.message - 对话框消息内容
 * @param {string} props.inputPlaceholder - 输入框占位符（可选）
 * @param {string} props.inputValue - 输入框默认值（可选）
 * @param {Function} props.onClose - 关闭回调函数
 * @param {Function} props.onConfirm - 确认回调函数
 */
const TipsDialog = ({ visible, title, type, message, inputPlaceholder, inputValue, onClose, onConfirm }) => {
  const [input, setInput] = useState(inputValue || '');

  // 处理确认按钮点击
  const handleConfirm = () => {
    onConfirm(input || null);
    setInput('');
  };

  // 处理取消按钮点击
  const handleClose = () => {
    onClose();
    setInput('');
  };

  if (!visible) return null;

  return (
    <div className="Setting-dialog-overlay">
      <div className="Setting-dialog">
        <div className="Setting-dialog-header">
          <h3>{title}</h3>
          <button className="Setting-close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="Setting-dialog-content">
          <div className="Setting-dialog-icon">
            {type === 'warning' && <span className="warning-icon">⚠️</span>}
            {type === 'info' && <span className="info-icon">ℹ️</span>}
            {type === 'error' && <span className="error-icon">❌</span>}
            {type === 'success' && <span className="success-icon">✅</span>}
          </div>
          <div className="Setting-dialog-text">
            {message}
            {inputPlaceholder && (
              <input
                type="text"
                className="Setting-dialog-input"
                placeholder={inputPlaceholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                autoFocus
              />
            )}
          </div>
        </div>

        <div className="Setting-dialog-footer">
          <button className="Setting-btn-secondary" onClick={handleClose}>取消</button>
          <button className="Setting-btn-primary" onClick={handleConfirm}>确认</button>
        </div>
      </div>
    </div>
  );
};

export default TipsDialog;