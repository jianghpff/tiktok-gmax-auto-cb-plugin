// Content Script 工具函数
window.CBUtils = {
  // 检查是否在正确的页面
  shouldActivate() {
    const url = window.location.href;
    // 支持整个 ads.tiktok.com 域名
    return url.includes('ads.tiktok.com/');
  },

  // 获取页面参数
  getPageParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const pathSegments = window.location.pathname.split('/');

    // 从 URL参数获取
    let params = {
      aadvid: urlParams.get('aadvid'),
      oec_seller_id: urlParams.get('oec_seller_id'),
      bc_id: urlParams.get('bc_id'),
      campaign_id: urlParams.get('campaign_id'),
      product_id: urlParams.get('product_id'),
      list_start_date: urlParams.get('list_start_date'),
      list_end_date: urlParams.get('list_end_date')
    };

    // 尝试从路径中提取参数（备用方案）
    if (!params.aadvid) {
      // 从路径中查找aadvid模式（通常是长数字）
      const aadvidMatch = window.location.href.match(/aadvid[=\/](\d{10,})/);
      if (aadvidMatch) params.aadvid = aadvidMatch[1];
    }

    if (!params.oec_seller_id) {
      // 从路径中查找oec_seller_id模式
      const sellerIdMatch = window.location.href.match(/oec_seller_id[=\/](\d{10,})/);
      if (sellerIdMatch) params.oec_seller_id = sellerIdMatch[1];
    }

    if (!params.bc_id) {
      // 从路径中查找bc_id模式
      const bcIdMatch = window.location.href.match(/bc_id[=\/](\d{10,})/);
      if (bcIdMatch) params.bc_id = bcIdMatch[1];
    }

    console.log('[CBUtils] 页面参数:', params);
    return params;
  },

  // 获取CSRF Token
  getCsrfToken() {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : null;
  },

  // 生成请求ID
  generateRequestId() {
    return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  },

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // 计算日期范围
  getDateRange(params) {
    let startTime, endTime;

    if (params && params.list_start_date && params.list_end_date) {
      startTime = new Date(parseInt(params.list_start_date)).toISOString().split('T')[0];
      endTime = new Date(parseInt(params.list_end_date)).toISOString().split('T')[0];
    } else {
      const today = new Date();
      const defaultStart = new Date();
      defaultStart.setDate(today.getDate() - 30);
      const defaultEnd = new Date();
      defaultEnd.setDate(today.getDate() + 30);

      startTime = defaultStart.toISOString().split('T')[0];
      endTime = defaultEnd.toISOString().split('T')[0];
    }

    return { startTime, endTime };
  },

  // 显示通知
  showNotification(message, type = 'info', duration = 3000) {
    console.log(`[CB-${type}]`, message);

    const notification = document.createElement('div');
    notification.className = 'cb-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: opacity 0.3s ease;
      max-width: 400px;
      text-align: center;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  },

  // 获取通知颜色
  getNotificationColor(type) {
    const colors = {
      error: '#ff4757',
      success: '#2ed573',
      warning: '#ffbe76',
      info: '#4a69bd'
    };
    return colors[type] || colors.info;
  },

  // 查找表格行中的VID
  extractVidFromRow(row) {
    const vidSpan = row.querySelector('.sub-title-Smyy');
    if (!vidSpan) return null;

    const match = vidSpan.textContent.match(/Video:\s*(\d+)/);
    return match ? match[1] : null;
  },

  // 检查元素是否为表格行
  isTableRow(element) {
    return element &&
           element.classList &&
           element.classList.contains('theme-arco-table-tr') &&
           element.classList.contains('creative-table-row-UWxp');
  },

  // 等待元素出现
  waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`等待元素超时: ${selector}`));
      }, timeout);
    });
  },

  // 安全执行函数
  safeExecute(fn, errorMessage = '执行失败') {
    try {
      return fn();
    } catch (error) {
      console.error(`[CBUtils] ${errorMessage}:`, error);
      return null;
    }
  },

  // 节流函数
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // 防抖函数
  debounce(func, wait, immediate) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }
};