// Background Service Worker 主入口
import { StorageManager } from './lib/storage-manager.js';
import { TaskScheduler } from './lib/task-scheduler.js';
import { RuleEngine } from './lib/rule-engine.js';
import { BudgetController } from './lib/budget-controller.js';
import { HistoryManager } from './lib/history-manager.js';
import { SecurityManager } from './lib/security-manager.js';
import { MessageHandler } from './lib/message-handler.js';

class BackgroundMain {
  constructor() {
    this.storage = new StorageManager();
    this.scheduler = new TaskScheduler();
    this.ruleEngine = new RuleEngine();
    this.budgetController = new BudgetController();
    this.historyManager = new HistoryManager();
    this.security = new SecurityManager();
    this.messageHandler = new MessageHandler();

    this.init();
  }

  async init() {
    console.log('[Background] TikTok GMAX CB 自动化插件启动');

    try {
      // 初始化各个模块
      await this.security.init();
      await this.storage.init();
      await this.scheduler.init();

      // 设置各个模块的依赖
      this.historyManager.setDependencies({ storage: this.storage });
      this.budgetController.setDependencies({ storage: this.storage });
      this.ruleEngine.setDependencies({ storage: this.storage });

      // 设置消息处理器
      this.messageHandler.setup({
        storage: this.storage,
        scheduler: this.scheduler,
        ruleEngine: this.ruleEngine,
        budgetController: this.budgetController,
        historyManager: this.historyManager
      });

      // 设置调度器的MessageHandler引用
      this.scheduler.setMessageHandler(this.messageHandler);

      // 设置扩展图标点击事件
      this.setupActionClick();

      // 恢复已存在的任务
      await this.restoreExistingTasks();

      console.log('[Background] 所有模块初始化完成');

      // 启动保活机制
      this.keepAlive();

    } catch (error) {
      console.error('[Background] 初始化失败:', error);
    }
  }

  // 确保Service Worker保持活跃
  keepAlive() {
    // 设置一个定时器来保持Service Worker活跃
    setInterval(() => {
      console.log('[Background] Service Worker 保持活跃');
    }, 20000); // 每20秒执行一次
  }

  // 设置扩展图标点击事件
  setupActionClick() {
    chrome.action.onClicked.addListener(async (tab) => {
      try {
        // 检查是否已有管理窗口打开
        const existingWindows = await chrome.windows.getAll({
          windowTypes: ['popup']
        });

        const managerWindow = existingWindows.find(win =>
          win.type === 'popup' &&
          win.width === 1200 &&
          win.height === 800
        );

        if (managerWindow) {
          // 如果已有窗口，则聚焦到该窗口
          await chrome.windows.update(managerWindow.id, { focused: true });
        } else {
          // 创建新的管理窗口
          await chrome.windows.create({
            url: 'manager/manager.html',
            type: 'popup',
            width: 1200,
            height: 800,
            left: 100,
            top: 100
          });
        }
      } catch (error) {
        console.error('[Background] 打开管理窗口失败:', error);
      }
    });
  }

  async restoreExistingTasks() {
    try {
      const tasks = await this.storage.getAllTasks();
      const activeTasks = tasks.filter(task => task.config.enabled);

      console.log(`[Background] 恢复 ${activeTasks.length} 个活跃任务`);

      for (const task of activeTasks) {
        await this.scheduler.scheduleTask(task);
      }

    } catch (error) {
      console.error('[Background] 恢复任务失败:', error);
    }
  }
}

// 启动 Background Service
new BackgroundMain();

// 监听插件安装/更新事件
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[Background] 插件首次安装');

    // 显示欢迎通知
    chrome.notifications.create({
      type: 'basic',
      title: 'TikTok GMAX CB 自动化',
      message: '安装成功！请前往 TikTok Ads 页面开始使用。'
    });

  } else if (details.reason === 'update') {
    console.log('[Background] 插件更新到版本:', chrome.runtime.getManifest().version);
  }
});