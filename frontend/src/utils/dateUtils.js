/**
 * 获取月份名称
 * @param {number} monthIndex - 月份索引 (0-11)
 * @returns {string} 月份名称
 */
export const getMonthName = (monthIndex) => {
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  // 处理月份索引循环
  const normalizedIndex = ((monthIndex % 12) + 12) % 12;
  return months[normalizedIndex];
};

/**
 * 获取月份中的所有周（以周一为开始，最后一周可以跨月）
 * @param {number} month - 月份 (0-11)
 * @param {number} year - 年份
 * @returns {Array} 周数组，每个元素包含start和end属性
 */
export const getWeeksInMonth = (month, year) => {
  const weeks = [];
  // 处理月份索引范围
  const normalizedMonth = ((month % 12) + 12) % 12;
  // 获取月份第一天
  const firstDay = new Date(year, normalizedMonth, 1);
  // 获取月份最后一天
  const lastDay = new Date(year, normalizedMonth + 1, 0);

  // 计算第一天是星期几（0=周日，1=周一，...，6=周六）
  const firstDayOfWeek = firstDay.getDay() || 7; // 转换为 1-7，其中 1=周一

  // 找到当月第一个星期一
  let currentDate;
  if (firstDayOfWeek === 1) {
    // 1日就是周一，直接使用
    currentDate = new Date(firstDay);
  } else if (firstDayOfWeek > 1) {
    // 1日不是周一，找到本月第一个周一
    currentDate = new Date(firstDay);
    currentDate.setDate(firstDay.getDate() + (8 - firstDayOfWeek));
  }

  // 如果第一个周一在当月内，开始生成周数据
  if (currentDate <= lastDay) {
    // 生成完整的周数据，最后一周可以跨月
    while (true) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekStart.getDate() + 6); // 周日

      // 添加这一周到列表
      weeks.push({ start: weekStart, end: weekEnd });

      // 移动到下一周的周一
      currentDate.setDate(weekStart.getDate() + 7);

      // 如果下一周的周一已经超过当月最后一天，则停止生成
      if (currentDate > lastDay) {
        break;
      }
    }
  }

  // 特殊情况处理：如果当月没有找到任何完整的周
  if (weeks.length === 0) {
    // 获取当月最后一个周一
    const lastMonday = new Date(lastDay);
    const lastDayOfWeek = lastMonday.getDay() || 7; // 转换为 1-7，其中 1=周一

    if (lastDayOfWeek === 1) {
      // 最后一天就是周一
      lastMonday.setDate(lastDay.getDate());
    } else if (lastDayOfWeek > 1) {
      // 最后一天不是周一，往前推到最近的周一
      lastMonday.setDate(lastDay.getDate() - (lastDayOfWeek - 1));
    }

    // 如果找到的周一有效，则创建一周
    if (lastMonday >= firstDay) {
      const weekStart = new Date(lastMonday);
      const weekEnd = new Date(lastMonday);
      weekEnd.setDate(weekStart.getDate() + 6); // 周日
      weeks.push({ start: weekStart, end: weekEnd });
    } else {
      // 如果还是找不到，就包含整个月
      weeks.push({ start: firstDay, end: lastDay });
    }
  }

  return weeks;
};

/**
 * 判断一周是否已经过去
 * @param {Object} week - 周对象，包含start和end属性
 * @returns {boolean} 是否已过去
 */
export const isWeekPast = (week) => {
  // 获取当前日期
  const today = new Date();
  // 将时间部分设置为23:59:59，以便正确比较当天
  today.setHours(23, 59, 59, 999);
  // 比较当前日期与周末日期
  // 如果当前日期大于周末日期，则这一周已经过去
  return today > week.end;
};

/**
 * 格式化周日期范围，使用MM/DD-MM/DD格式
 * @param {Object} week - 周对象，包含start和end属性
 * @returns {string} 格式化后的日期范围
 */
export const formatWeekRange = (week) => {
  const start = week.start;
  const end = week.end;

  // 确保日期有效
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return '无效日期';
  }

  // 格式化日期为MM/DD格式
  const formatDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始，需要+1
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  };

  const startStr = formatDate(start);
  const endStr = formatDate(end);

  return `${startStr}-${endStr}`;
};