// Content Script 主入口
(function() {
  'use strict';

  // 立即在window对象上设置标记，表明Content Script已加载
  window.CB_EXTENSION_LOADED = true;
  window.CB_EXTENSION_TIMESTAMP = Date.now();

  console.log('[ContentMain] ========================================')
  console.log('[ContentMain] TikTok GMAX CB自动化插件已加载');
  console.log('[ContentMain] 当前页面URL:', window.location.href);
  console.log('[ContentMain] Document状态:', document.readyState);
  console.log('[ContentMain] User Agent:', navigator.userAgent);
  console.log('[ContentMain] Chrome扩展ID:', chrome.runtime.id);
  console.log('[ContentMain] ========================================');

  // 立即发送一个测试消息到Background
  setTimeout(() => {
    console.log('[ContentMain] 发送初始连接测试消息');
    chrome.runtime.sendMessage({
      type: 'PING',
      data: { source: 'content-script-initial-test' }
    }).then(response => {
      console.log('[ContentMain] 初始连接测试成功:', response);
    }).catch(error => {
      console.error('[ContentMain] 初始连接测试失败:', error);
    });
  }, 100);

  // 检查页面是否匹配
  const shouldActivate = CBUtils.shouldActivate();
  console.log('[ContentMain] 页面匹配检查:', shouldActivate);
  console.log('[ContentMain] URL包含ads.tiktok.com:', window.location.href.includes('ads.tiktok.com'));

  if (!shouldActivate) {
    console.log('[ContentMain] 页面不匹配，但仍然加载基础功能以便调试');
    // 即使页面不匹配，也要初始化API代理以便调试
    if (typeof CBAPIProxy !== 'undefined') {
      console.log('[ContentMain] 强制初始化API代理用于调试');
      CBAPIProxy.init();
    }
    return;
  }

  console.log('[ContentMain] 页面匹配成功，准备初始化扩展');

  // 等待页面完全加载
  if (document.readyState === 'loading') {
    console.log('[ContentMain] 文档正在加载，等待DOMContentLoaded事件');
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    console.log('[ContentMain] 文档已加载完成，立即初始化');
    initializeExtension();
  }

  function initializeExtension() {
    console.log('[ContentMain] 开始初始化扩展');
    console.log('[ContentMain] 检查依赖对象:', {
      CBUtils: typeof CBUtils,
      CBAPIProxy: typeof CBAPIProxy,
      CBDOMIntegration: typeof CBDOMIntegration
    });

    // 初始化各个模块
    try {
      // 1. 初始化API代理
      if (typeof CBAPIProxy !== 'undefined') {
        console.log('[ContentMain] 初始化API代理');
        CBAPIProxy.init();
      } else {
        console.error('[ContentMain] CBAPIProxy未定义');
      }

      // 2. 初始化DOM集成（延迟执行确保页面元素加载完成）
      setTimeout(() => {
        if (typeof CBDOMIntegration !== 'undefined') {
          console.log('[ContentMain] 初始化DOM集成');
          CBDOMIntegration.init();
        } else {
          console.warn('[ContentMain] CBDOMIntegration未定义，跳过DOM集成');
        }
      }, 2000);

      // 3. 设置页面状态监听
      setupPageStateListener();

      // 4. 定期检查页面状态
      setInterval(checkPageHealth, 30000);

      console.log('[ContentMain] 扩展初始化完成');

      // 5. 测试API连通性
      setTimeout(testAPIConnectivity, 3000);

    } catch (error) {
      console.error('[ContentMain] 初始化失败:', error);
      if (typeof CBUtils !== 'undefined') {
        CBUtils.showNotification('CB自动化插件初始化失败', 'error');
      }
    }
  }

  // 测试API连通性
  async function testAPIConnectivity() {
    console.log('[ContentMain] 测试API连通性');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PING',
        data: { source: 'content-script-test' }
      });
      console.log('[ContentMain] API连通性测试结果:', response);
    } catch (error) {
      console.error('[ContentMain] API连通性测试失败:', error);
    }
  }

  // 设置页面状态监听
  function setupPageStateListener() {
    // 监听URL变化
    let currentUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        handleUrlChange();
      }
    });

    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handlePageVisible();
      }
    });

    // 监听窗口焦点变化
    window.addEventListener('focus', handlePageVisible);
  }

  // 处理URL变化
  function handleUrlChange() {
    console.log('[ContentMain] URL变化，重新检查页面');

    if (CBUtils.shouldActivate()) {
      // 重新初始化DOM集成
      setTimeout(() => {
        if (typeof CBDOMIntegration !== 'undefined') {
          CBDOMIntegration.cleanup();
          CBDOMIntegration.init();
        }
      }, 1000);
    } else {
      // 清理资源
      if (typeof CBDOMIntegration !== 'undefined') {
        CBDOMIntegration.cleanup();
      }
    }
  }

  // 处理页面变为可见
  function handlePageVisible() {
    console.log('[ContentMain] 页面变为可见，刷新数据');

    if (CBUtils.shouldActivate()) {
      // 刷新DOM数据
      setTimeout(() => {
        if (typeof CBDOMIntegration !== 'undefined' && CBDOMIntegration.isInitialized) {
          CBDOMIntegration.refreshAllData();
        }
      }, 1000);
    }
  }

  // 检查页面健康状态
  function checkPageHealth() {
    if (!CBUtils.shouldActivate()) return;

    try {
      // 检查关键元素是否存在
      const table = document.querySelector('.theme-arco-table-tbody');
      const toolbar = document.querySelector('.cb-toolbar');

      if (table && !toolbar) {
        console.log('[ContentMain] 检测到表格但工具栏缺失，重新初始化');
        if (typeof CBDOMIntegration !== 'undefined') {
          CBDOMIntegration.cleanup();
          CBDOMIntegration.init();
        }
      }

      // 检查API代理状态
      if (typeof CBAPIProxy !== 'undefined' && !CBAPIProxy.messageListenerAdded) {
        console.log('[ContentMain] API代理异常，重新初始化');
        CBAPIProxy.init();
      }

    } catch (error) {
      console.error('[ContentMain] 健康检查失败:', error);
    }
  }

  // 页面卸载时清理资源
  window.addEventListener('beforeunload', () => {
    if (typeof CBDOMIntegration !== 'undefined') {
      CBDOMIntegration.cleanup();
    }
  });

})();