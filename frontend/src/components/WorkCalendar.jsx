import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { v4 as uuidv4 } from 'uuid';
import "../assets/css/WorkCalendar.css";
import "../assets/styles/calendar/index.scss";


const DragAndDropCalendar = withDragAndDrop(Calendar);

// 配置moment使用24小时制
moment.locale('zh-cn', {
  longDateFormat: {
    LT: 'HH:mm',
    LTS: 'HH:mm:ss',
    L: 'YYYY-MM-DD',
    LL: 'YYYY年MM月DD日',
    LLL: 'YYYY年MM月DD日 HH:mm',
    LLLL: 'YYYY年MM月DD日dddd HH:mm',
    l: 'YYYY-MM-DD',
    ll: 'YYYY年MM月DD日',
    lll: 'YYYY年MM月DD日 HH:mm',
    llll: 'YYYY年MM月DD日dddd HH:mm'
  },
  // 设置一周起始日为星期一
  week: {
    dow: 1, // 星期一为一周的第一天
    doy: 4  // 一年的第一周必须包含1月4日（符合ISO标准）
  }
});

const localizer = momentLocalizer(moment);

// 辅助函数：将时间对齐到15分钟的倍数
const snapTo15 = (time) => {
  const m = moment(time);
  const minutes = m.minutes();
  const remainder = minutes % 15;
  if (remainder > 7.5) {
    return m.add(15 - remainder, 'minutes').toDate();
  } else {
    return m.subtract(remainder, 'minutes').toDate();
  }
};

// 辅助函数：获取被新事件包含的所有事件
const getContainedEvents = (events, newEvent) => {
  return events.filter(event => {
    return newEvent.start <= event.start && newEvent.end >= event.end;
  });
};

// 示例事件数据 - 所有事件都使用resourceId 1
const events = [];

// 资源映射
const resourceMap = [
  { resourceId: 1, resourceTitle: '工作时间段设置' },
];

// 生成唯一的周标识符
const generateWeekKey = (date) => {
  const m = moment(date);
  const year = m.year();
  const week = m.week(); // 使用ISO周数
  return `${year}-W${week}`;
};

export default function WorkCalendar({ selectedWeek, onWeekChange, 
  // 添加缓存相关的props
  cacheKey: parentCacheKey,
  saveEventsCache,
  getEventsCache
}) {
  const [myEvents, setMyEvents] = useState(events);
  const [history, setHistory] = useState([[]]); // 历史记录，包含所有事件状态
  const [historyIndex, setHistoryIndex] = useState(0); // 当前历史记录索引
  const [conflictAlerts, setConflictAlerts] = useState([]);
  const containerRef = useRef(null);
  const alertTimeoutRefs = useRef({}); // 用于存储每个提示的定时器
  const [currentDate, setCurrentDate] = useState(new Date()); // 当前显示的日期
  const weeklyEventsRef = useRef({}); // 用于存储每周的事件数据

  // 监听selectedWeek变化，更新日历显示的日期
  useEffect(() => {
    if (selectedWeek && selectedWeek.start) {
      setCurrentDate(new Date(selectedWeek.start));
    }
  }, [selectedWeek]);

  // 监听currentDate变化，加载对应周的事件数据
  useEffect(() => {
    const loadWeeklyEvents = async () => {
      if (currentDate) {
        const weekKey = generateWeekKey(currentDate);
        let eventsToLoad = [];
        
        // 检查是否有父组件传递的缓存函数
        if (getEventsCache) {
          const cachedEvents = getEventsCache(weekKey);
          if (cachedEvents) {
            eventsToLoad = cachedEvents;
          }
        } else if (weeklyEventsRef.current[weekKey]) {
          // 如果没有父组件缓存函数，使用内部缓存
          eventsToLoad = weeklyEventsRef.current[weekKey];
        }
        
        // 只有当需要加载的事件与当前事件不同时才更新状态
        const currentEventsStr = JSON.stringify(myEvents);
        const eventsToLoadStr = JSON.stringify(eventsToLoad);
        if (currentEventsStr !== eventsToLoadStr) {
          setMyEvents(eventsToLoad);
          setHistory([eventsToLoad]);
          setHistoryIndex(0);
        }
      }
    };

    loadWeeklyEvents();
  }, [currentDate, getEventsCache]);

  // 监听myEvents变化，保存事件数据到缓存
  useEffect(() => {
    const saveWeeklyEvents = () => {
      if (currentDate && myEvents) {
        const weekKey = generateWeekKey(currentDate);
        
        // 只有当缓存中的事件与当前事件不同时才更新缓存
        const cachedEventsStr = JSON.stringify(weeklyEventsRef.current[weekKey] || []);
        const currentEventsStr = JSON.stringify(myEvents);
        if (cachedEventsStr !== currentEventsStr) {
          // 保存到内部缓存
          weeklyEventsRef.current[weekKey] = [...myEvents];
          
          // 如果有父组件传递的缓存函数，也保存到父组件缓存
          if (saveEventsCache) {
            saveEventsCache(weekKey, [...myEvents]);
          }
        }
      }
    };

    saveWeeklyEvents();
  }, [myEvents, currentDate, saveEventsCache]);

  // refs to keep latest history/historyIndex for saveToHistory (避免闭包导致的旧值)
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // 跳转至今日
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    // 如果有onWeekChange回调函数，则调用通知周变化
    if (onWeekChange) {
      onWeekChange(today);
    }
  }, []);

  // 保存状态到历史记录
  const saveToHistory = useCallback((newEvents) => {
    const truncated = historyRef.current.slice(0, historyIndexRef.current + 1);
    const newHist = [...truncated, [...newEvents]];
    historyRef.current = newHist;
    setHistory(newHist);
    historyIndexRef.current = newHist.length - 1;
    setHistoryIndex(historyIndexRef.current);
  }, []);

  // 添加冲突提示
  const addConflictAlert = useCallback((message) => {
    const alertId = Date.now();
    // 清除之前的定时器（如果存在）
    if (alertTimeoutRefs.current[alertId]) {
      clearTimeout(alertTimeoutRefs.current[alertId]);
    }
    // 添加新提示
    setConflictAlerts(prev => [...prev, { id: alertId, message, timestamp: Date.now() }]);
    // 设置定时器，3秒后移除提示
    alertTimeoutRefs.current[alertId] = setTimeout(() => {
      setConflictAlerts(prev => prev.filter(alert => alert.id !== alertId));
      delete alertTimeoutRefs.current[alertId];
    }, 3000);
  }, []);

  // 移动事件函数 - 区分不同区域的拖动
  const moveEvent = useCallback(
    ({ event, start, end, resourceId, isAllDay: droppedOnAllDaySlot = false }) => {
      // === 基于 type 的限制逻辑 ===
      if (event.type === "work" && droppedOnAllDaySlot) {
        addConflictAlert("无法拖动至此区域！");
        return;
      }
      if (event.type === "rest" && moment(start).day() !== moment(end).day()) {
        addConflictAlert("无法拖动至此区域！");
        return;
      }

      const { allDay, columnType } = event;
      if (!allDay && droppedOnAllDaySlot) {
        event.allDay = true;
      }

      // 检查原始事件和目标日期
      const originalDate = moment(event.start);
      const originalDateStr = originalDate.format('YYYY-MM-DD');
      const targetDate = moment(start);
      const targetDateStr = targetDate.format('YYYY-MM-DD');
      const targetEndDate = moment(end);
      const targetEndDateStr = targetEndDate.format('YYYY-MM-DD');
      
      // 检查是否跨天
      if (targetDateStr !== targetEndDateStr) {
        addConflictAlert("禁止跨天拖动时间块！");
        return;
      }

      // 获取除了当前正在移动的事件之外的所有事件
      const otherEvents = myEvents.filter(ev => ev.id !== event.id);
      
      // 检查是否与现有事件相交（排除被包含的情况）
      const overlappingEvents = otherEvents.filter(ev => {
        // 只有在同一天的事件才需要检查冲突
        const eventDateStr = moment(ev.start).format('YYYY-MM-DD');
        if (eventDateStr !== targetDateStr) return false;
        
        // 同一列类型的事件才检查冲突
        if (ev.columnType !== columnType) {
          return false;
        }

        return (
          // 相交但不包含的情况
          ((moment(start).isSameOrAfter(ev.start) && moment(start).isBefore(ev.end)) ||
            (moment(end).isAfter(ev.start) && moment(end).isSameOrBefore(ev.end))) &&
          // 不是包含关系
          !(moment(start).isSameOrBefore(ev.start) && moment(end).isSameOrAfter(ev.end))
        );
      });

      // 如果有相交事件，显示提示并阻止移动
      if (overlappingEvents.length > 0) {
        addConflictAlert("无法创建与现有时间段相交的时间段");
        return;
      }

      // 如果是在不同日期之间移动，但已经通过了休息日和工作日的检查（在同一类型日期之间移动）
      if (originalDateStr !== targetDateStr) {
        // 直接使用拖拽目标的 start 和 end，不修改日期
        const adjustedStart = snapTo15(start); // 可对齐15分钟
        const adjustedEnd = snapTo15(end);

        setMyEvents(prev => {
          const filtered = prev.filter(ev => ev.id !== event.id);
          const updated = [...filtered, { ...event, start: adjustedStart, end: adjustedEnd }];
          saveToHistory(updated);
          return updated;
        });
        return;
      }

      // 正常情况：保持原始日期和列类型
      setMyEvents(prev => {
        const existing = prev.find(ev => ev.id === event.id) ?? {};
        const filtered = prev.filter(ev => ev.id !== event.id);
        const updated = [...filtered, { ...existing, start, end, resourceId: 1, allDay, columnType }];
        saveToHistory(updated);
        return updated;
      });
    }, [addConflictAlert, saveToHistory, myEvents]);

  // 调整事件大小函数
  const resizeEvent = useCallback(({ event, start, end }) => {
    const { columnType } = event;
    
    // 获取除了当前正在调整大小的事件之外的所有事件
    const otherEvents = myEvents.filter(ev => ev.id !== event.id);
    
    // 检查是否与现有事件相交（排除被包含的情况）
    const overlappingEvents = otherEvents.filter(ev => {
      // 只有在同一天的事件才需要检查冲突
      const eventDateStr = moment(ev.start).format('YYYY-MM-DD');
      const targetDateStr = moment(start).format('YYYY-MM-DD');
      if (eventDateStr !== targetDateStr) return false;
      
      // 同一列类型的事件才检查冲突
      if (ev.columnType !== columnType) {
        return false;
      }

      return (
        // 相交但不包含的情况
        ((moment(start).isSameOrAfter(ev.start) && moment(start).isBefore(ev.end)) ||
          (moment(end).isAfter(ev.start) && moment(end).isSameOrBefore(ev.end))) &&
        // 不是包含关系
        !(moment(start).isSameOrBefore(ev.start) && moment(end).isSameOrAfter(ev.end))
      );
    });

    // 如果有相交事件，显示提示并阻止调整大小
    if (overlappingEvents.length > 0) {
      addConflictAlert("无法创建与现有时间段相交的时间段");
      return;
    }
    
    setMyEvents(prev => {
      const existing = prev.find(ev => ev.id === event.id) ?? {};
      const filtered = prev.filter(ev => ev.id !== event.id);
      const updated = [...filtered, { ...existing, start, end, columnType }];
      saveToHistory(updated);
      return updated;
    });
  }, [addConflictAlert, saveToHistory, myEvents]);

  // 撤销操作
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMyEvents([...history[historyIndex - 1]]);
    }
  }, [history, historyIndex]);

  // 重做操作
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMyEvents([...history[historyIndex + 1]]);
    }
  }, [history, historyIndex]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // 清理定时器
  useEffect(() => {
    return () => {
      Object.values(alertTimeoutRefs.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // 新建事件 - 实现重叠时间段调整功能，区分休息日列和工作时间段列
  const handleSelectSlot = ({ start, end }) => {

    const duration = moment(end).diff(moment(start), "minutes");
    if (duration < 15) return; // 最小15分钟

    // 根据选择的时间段创建不同的事件 - 使用时间格式化判断类似第374行
    const isWeekendEvent = moment(start).format('HH:mm') === '00:00' && moment(end).format('HH:mm') === '00:00';
    // 检查是否是首行横轴事件（可以根据需要调整条件）
    const isHeaderRow = isWeekendEvent;
    const newEvent = {
      id: uuidv4(), // 使用uuid生成唯一ID
      title: isWeekendEvent ? "休息日" : "工作时间",
      start: snapTo15(start),
      end: snapTo15(end),
      resourceId: 1, // 使用唯一的资源ID
      columnType: isWeekendEvent ? "weekend" : "time", // 使用时间格式化判断列类型
      type: isWeekendEvent ? "rest" : "work", // ✅ 给事件加上 type
      isHeaderRow: isHeaderRow // 添加isHeaderRow标记
    };

    // 调用添加事件逻辑（包含分割 / 冲突 / 合并判断）
    handleAddEvent(newEvent);
  };

  // 添加事件逻辑（包含分割 / 冲突 / 合并判断）
  const handleAddEvent = (newEvent) => {
    setMyEvents(prevEvents => {
      // 检查是否应该执行分割操作 
      // 1. 向下创建时间段：起点与已有时间段起点相同，且终点未超过该时间段终点
      // 2. 向上创建时间段：终点与已有时间段终点相同，且起点在已有时间段内部
      const shouldSplit = prevEvents.some(event => {
        // 向下创建时间段的情况（新时间段在原时间段下方）
        const isStartSameAndDurationWithin = moment(newEvent.start).isSame(event.start) &&
          moment(newEvent.end).isBefore(event.end) &&
          moment(newEvent.end).isAfter(event.start);

        // 向上创建时间段的情况（新时间段在原时间段上方）
        const isEndSameAndDurationValid = moment(newEvent.end).isSame(event.end) &&
          moment(newEvent.start).isAfter(event.start) &&
          moment(newEvent.start).isBefore(event.end);

        return isStartSameAndDurationWithin || isEndSameAndDurationValid;
      });

      if (shouldSplit) {
        // 执行分割操作
        const splitEvents = prevEvents.flatMap(event => {
          // 向下分割情况
          if (moment(newEvent.start).isSame(event.start) && moment(newEvent.end).isBefore(event.end)) {
            // 分割成两个事件：新创建的时间段 + 剩余时间段
            const remainingEvent = {
              ...event,
              start: newEvent.end,
              id: `${event.id}-split`
            };
            return [newEvent, remainingEvent];
          }
          // 向上分割情况
          else if (moment(newEvent.end).isSame(event.end) && moment(newEvent.start).isAfter(event.start) && moment(newEvent.start).isBefore(event.end)) {
            // 分割成两个事件：剩余时间段 + 新创建的时间段
            const remainingEvent = {
              ...event,
              end: newEvent.start,
              id: `${event.id}-split`
            };
            return [remainingEvent, newEvent];
          }
          return event;
        });

        saveToHistory(splitEvents);
        return splitEvents;
      }

      // 检查是否与现有事件相交（排除被包含的情况）
      const overlappingEvents = prevEvents.filter(event => {
        // 同一列类型的事件才检查冲突
        if (event.columnType !== newEvent.columnType) {
          return false;
        }

        // 如果事件有resourceId且不是当前资源，则跳过检查
        if (event.resourceId && newEvent.resourceId) {
          const eventResources = Array.isArray(event.resourceId) ? event.resourceId : [event.resourceId];
          const newResources = Array.isArray(newEvent.resourceId) ? newEvent.resourceId : [newEvent.resourceId];
          // 检查是否有共同的资源
          const hasCommonResource = eventResources.some(id => newResources.includes(id));
          if (!hasCommonResource) {
            return false;
          }
        }

        return (
          // 相交但不包含的情况
          ((newEvent.start >= event.start && newEvent.start < event.end) ||
            (newEvent.end > event.start && newEvent.end <= event.end)) &&
          // 不是包含关系
          !(newEvent.start <= event.start && newEvent.end >= event.end)
        );
      });

      if (overlappingEvents.length > 0) {
        // 与现有事件相交，显示冲突提示
        addConflictAlert("无法创建与现有时间段相交的时间段");
        return prevEvents; // 不修改
      }

      // 检查是否包含现有事件 - 只检查同一列类型的事件
      const sameColumnEvents = prevEvents.filter(event => event.columnType === newEvent.columnType);
      const containedEvents = getContainedEvents(sameColumnEvents, newEvent);

      if (containedEvents.length > 0) {
        // 包含现有事件，合并为新时间段
        // 移除被包含的事件
        const remainingEvents = prevEvents.filter(event => !containedEvents.some(contained => contained.id === event.id));
        // 添加新的合并事件
        const mergedEvents = [...remainingEvents, newEvent];
        saveToHistory(mergedEvents);
        return mergedEvents;
      }

      // 无冲突，直接创建新事件
      const updatedEvents = [...prevEvents, newEvent];
      saveToHistory(updatedEvents);
      return updatedEvents;
    });
  };

  // 删除事件
  const handleDelete = (eventId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setMyEvents(prev => {
      const newEvents = prev.filter((ev) => String(ev.id) !== String(eventId));
      saveToHistory(newEvents);
      return newEvents;
    });
  };

  // 在renderEvent函数后面添加自定义的timeHeaderCell组件
  // 渲染事件
  const renderEvent = ({ event }) => {
    // 不为 background event 渲染删除按钮
    if (event.isBackground) return null;

    // 根据标记构建 className
    const extraClass = event.isHeaderRow ? 'header-row' : '';
    return (

      <div className={`custom-event ${extraClass}`} style={{ position: 'relative' }}>
        {/* 事件内容 */}
        <div 
          className="delete-btn"
          onMouseDown={(e) => { e.stopPropagation(); }}
          onClick={(e) => handleDelete(event.id, e)}
          aria-label="删除时间段"
          title="删除">
          ×
        </div>

    <div className="event-content">
      {/* 时间与删除按钮在一行 - 删除按钮在时间右边 */}

      <div className="event-time-container">
        <div className="event-time">
          {moment(event.start).format('HH:mm') === '00:00' && moment(event.end).format('HH:mm') === '00:00'
            ? '全天'
            : formatDuration(event.start, event.end)}
        </div>
      </div>
      {/* 标题 */}
      <div className="event-title">{event.title}{' '}
        {/*<small style={{ color: '#888' }}>({event.type})</small>*/}
      </div>
    </div>
      </div >
    );
};



// 工具函数：格式化时长
function formatDuration(start, end) {
  const duration = moment.duration(moment(end).diff(moment(start)));
  const hours = duration.hours();
  const minutes = duration.minutes();

  if (hours === 0 && minutes === 0) {
    return "时长：<1分钟"; // 避免显示空
  }

  return `时长：${hours > 0 ? hours + "小时" : ""}${minutes > 0 ? minutes + "分钟" : ""}`;
}

// 自定义工具栏组件 - 仅在日视图中显示TodayBackNext按钮
// 根据视图类型显示不同的日期格式
const CustomToolbar = ({ date, view, onNavigate, onView }) => {
  // 获取周数（在月中）- 按照月份侧边栏的算法
  // 月份的第一周为包含该月第一个星期一的那一周
  // 最后一周为包含该月最后一个星期一的那一周
  const getWeekNumberInMonth = (date) => {
    const currentMoment = moment(date);
    const startOfMonth = currentMoment.clone().startOf('month');
    const endOfMonth = currentMoment.clone().endOf('month');
    
    // 找到该月的第一个星期一
    let firstMonday = startOfMonth.clone();
    while (firstMonday.day() !== 1) { // 1代表星期一
      firstMonday.add(1, 'day');
    }
    
    // 找到该月的最后一个星期一
    let lastMonday = endOfMonth.clone();
    while (lastMonday.day() !== 1) { // 1代表星期一
      lastMonday.subtract(1, 'day');
    }
    
    // 生成该月的所有周（以星期一为一周开始）
    const weeks = [];
    let weekStart = firstMonday.clone();
    
    // 遍历生成月内的所有周
    while (weekStart.isSameOrBefore(lastMonday)) {
      const weekEnd = weekStart.clone().endOf('week').subtract(1, 'day'); // 周日为一周结束
      weeks.push({
        start: weekStart.clone(),
        end: weekEnd.clone()
      });
      weekStart = weekStart.clone().add(1, 'week');
    }
    
    // 找到当前日期所在的周
    const currentWeekIndex = weeks.findIndex(week => 
      currentMoment.isSameOrAfter(week.start) && currentMoment.isSameOrBefore(week.end)
    );
    
    // 返回中文周数（第一周、第二周等）
    const weekNumbers = ['第一周', '第二周', '第三周', '第四周', '第五周', '第六周'];
    return weekNumbers[currentWeekIndex] || '未知周';
  };

  // 格式化标签显示内容
  const formatToolbarLabel = () => {
    if (view === 'day') {
      // 日视图显示"9月28日"格式
      return moment(date).format('M月D日');
    } else {
      // 周视图显示"第五周"格式
      return getWeekNumberInMonth(date);
    }
  };

  return (
    <div className="rbc-toolbar">
      {/* 交换位置：将标签放在左侧，按钮组放在右侧 */}
      <span className="rbc-toolbar-label">
        {formatToolbarLabel()}
      </span>
      <div className="rbc-btn-group">
        <button 
          type="button" 
          className={view === 'day' ? 'rbc-active' : ''}
          onClick={() => onView('day')}
        >
          日视图
        </button>
        <button 
          type="button" 
          className={view === 'week' ? 'rbc-active' : ''}
          onClick={() => onView('week')}
        >
          周视图
        </button>
      </div>
      {view === 'day' && (
        <div className="rbc-btn-group">
          <button type="button" onClick={() => onNavigate('PREV')}>上一天</button>
          <button type="button" onClick={() => onNavigate('TODAY')}>今天</button>
          <button type="button" onClick={() => onNavigate('NEXT')}>下一天</button>
        </div>
      )}
    </div>
  );
};


// 处理日期导航
const navigateCalendar = (action) => {
  if (action === 'prev') {
    const newDate = moment(currentDate).subtract(1, 'week').toDate();
    setCurrentDate(newDate);
    // 如果有onWeekChange回调函数，则调用通知周变化
    if (onWeekChange) {
      onWeekChange(newDate);
    }
  } else if (action === 'next') {
    const newDate = moment(currentDate).add(1, 'week').toDate();
    setCurrentDate(newDate);
    // 如果有onWeekChange回调函数，则调用通知周变化
    if (onWeekChange) {
      onWeekChange(newDate);
    }
  }
};

// 渲染提示组件
const renderConflictAlerts = () => {
  return (
    <div className="alerts-container">
      {conflictAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className="conflict-alert"
          style={{ top: `${20 + index * 60}px` }}
        >
          {alert.message}
          <div className="alert-progress-bar" />
        </div>
      ))}
    </div>
  );
};


// 生成休息日的背景事件
  const generateBackgroundEvents = useCallback(() => {
    // 获取当前日历视图显示的日期范围
    const startOfWeek = moment(currentDate).startOf('week');
    const endOfWeek = moment(currentDate).endOf('week');
    const backgroundEvents = [];

    // 收集所有休息日事件的日期
    const restDayDates = new Set();
    myEvents.forEach(event => {
      // 检查是否是休息日类型的事件
      if (event.type === "rest" || event.columnType === "weekend") {
        // 处理跨天事件：获取事件覆盖的所有日期
        const eventStart = moment(event.start);
        const eventEnd = moment(event.end);
        
        // 如果是全天事件(00:00-00:00)，则需要特殊处理
        const isAllDayEvent = eventStart.format('HH:mm') === '00:00' && eventEnd.format('HH:mm') === '00:00';
        
        // 对于全天事件，结束日期需要减一天，因为24:00实际是第二天的开始
        const endDateForLoop = isAllDayEvent ? eventEnd.subtract(1, 'day') : eventEnd;
        
        // 遍历事件覆盖的每一天
        let currentDate = eventStart;
        while (currentDate.isBefore(endDateForLoop) || currentDate.isSame(endDateForLoop, 'day')) {
          const dateStr = currentDate.format('YYYY-MM-DD');
          restDayDates.add(dateStr);
          currentDate = currentDate.add(1, 'day');
        }
      }
    });

    // 遍历一周中的每一天
    for (let day = startOfWeek; day.isBefore(endOfWeek) || day.isSame(endOfWeek, 'day'); day.add(1, 'day')) {
      // 检查这一天是否有休息日事件
      const dayStr = day.format('YYYY-MM-DD');
      if (restDayDates.has(dayStr)) {
        // 为有休息日事件的日期创建背景事件
        backgroundEvents.push({
          id: `bg-${dayStr}`,
          start: new Date(day.year(), day.month(), day.date(), 0, 0, 0),
          end: new Date(day.year(), day.month(), day.date(), 23, 59, 59),
          resourceId: 1, // 使用相同的resourceId
          isBackground: true
        });
      }
    }

    return backgroundEvents;
  }, [currentDate, myEvents]);

// 自定义背景事件样式
const EventWrapper = ({ event, children }) => {
  if (event.isBackground) {
    return (
      <div style={{
        backgroundColor:'rgba(49, 173, 76, 0.2)', // 半透明灰色
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none', // 不阻止点击事件
        zIndex: 1
      }} />
    );
  }
  return children;
};



return (
  <div className="calendar-container" ref={containerRef}>
    {/* 日历头部 - 添加跳转至今日功能 */}
    {/*<div className="calendar-header">
    //  <h2>{moment(currentDate).format('YYYY年MM月')}</h2>
    // <button onClick={goToToday}>跳转至今日</button>
    </div>*/}

    {/* 日历组件 */}
    {/* 修改components属性，添加timeHeaderCell组件*/}
    <DragAndDropCalendar
      localizer={localizer}
      defaultDate={currentDate}
      defaultView={Views.WEEK}
      views={["day", "week"]}
      events={myEvents}
      backgroundEvents={generateBackgroundEvents()}
      step={5}
      timeslots={12}
      selectable={true}
      onSelectSlot={handleSelectSlot}
      onEventDrop={moveEvent}
      onEventResize={resizeEvent}
      resizable
      resourceIdAccessor="resourceId"
      resources={resourceMap}
      resourceTitleAccessor="resourceTitle"
      scrollToTime={new Date(1972, 0, 1, 8)}
      style={{ height: "100%" }}
      components={{
        event: renderEvent,
        eventWrapper: EventWrapper,
        toolbar: CustomToolbar,
        timeGutterHeader: () => (
      <div className="rbc-label rbc-time-header-gutter">
        <div className="gutter-spacer" />
        <div className="gutter-text">休息日设置</div>
      </div>
    )
      }}
      // 使用eventPropGetter动态设置事件样式，官方推荐方式
      eventPropGetter={(event, start, end, isSelected) => {
        // 检查事件是否是首行时间块
        if (event.isHeaderRow) {
          return {
            className: '',  // 留空，不使用className
            style: {
              backgroundColor: '#31ad4c',  // 对比色背景
              color: '#ffffff',             // 文字色设白色
              border: 'none'                // 去掉边框
              // 可根据需要添加其他样式
            }
          };
        }
        // 非首行事件保持默认样式
        return {};
      }}
      min={new Date(0, 0, 0, 0, 0, 0)} // 从0点开始
      max={new Date(0, 0, 0, 23, 59, 59)} // 到23:59结束
      showMultiDayTimes={true} // 显示跨天时间
      date={currentDate} // 设置当前显示的日期
      onNavigate={(newDate, action) => {
        let targetDate = newDate;
        // 如果是"TODAY"操作，使用当前日期
        if (action === 'TODAY') {
          targetDate = new Date();
        }
        setCurrentDate(targetDate);
        // 如果有onWeekChange回调函数，则调用通知周变化
        if (onWeekChange) {
          onWeekChange(targetDate);
        }
      }} // 处理导航事件
      formats={{
        // 时间段首列时间范围格式
        eventTimeRangeFormat: ({ start, end }) => (
          moment(start).format('HH:mm') === '00:00' && moment(end).format('HH:mm') === '00:00' ? '全天' : `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`
        ),
        // 星期显示格式
        dayRangeHeaderFormat: ({ start, end }) => {
          return `${moment(start).format('YYYY年MM月')}`;
        },
        // 时间段显示为小时格式
        timeGutterFormat: (date, culture, localizer) => {
          // 只显示整点
          return moment(date).minute() === 0 ? moment(date).format('HH:mm') : '';
        }
      }}
    />

    {/* 冲突提示弹窗 - 支持多个提示 */}
    {renderConflictAlerts()}
  </div>
  );
}

