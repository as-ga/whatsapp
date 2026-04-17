/**
 * Background Service Worker
 * Manages the overall automation workflow
 */

// Fallback for Logger if not loaded
if (typeof Logger === "undefined") {
  var Logger = {
    logs: [],
    log(message, level = "INFO", data = null) {
      console.log(`[${level}] ${message}`, data || "");
    },
    info(message, data = null) {
      this.log(message, "INFO", data);
    },
    warn(message, data = null) {
      this.log(message, "WARN", data);
    },
    error(message, data = null) {
      this.log(message, "ERROR", data);
    },
    debug(message, data = null) {
      this.log(message, "DEBUG", data);
    },
    getLogs() {
      return this.logs;
    },
    clearLogs() {
      this.logs = [];
    },
    exportLogs() {
      return JSON.stringify(this.logs, null, 2);
    },
  };
}

let currentSession = {
  data: [],
  isRunning: false,
  isPaused: false,
  messageTemplate: "Hello {name}, this is an automated message.",
  whatsappTabId: null,
  startTime: null,
  stats: {
    total: 0,
    sent: 0,
    failed: 0,
  },
};

/**
 * Listen for messages from popup and content script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "upload-data") {
    handleDataUpload(request.data, request.messageTemplate);
    sendResponse({ success: true });
  }
  if (request.action === "start-automation") {
    startAutomation();
    sendResponse({ success: true });
  }
  if (request.action === "pause-automation") {
    pauseAutomation();
    sendResponse({ success: true });
  }
  if (request.action === "resume-automation") {
    resumeAutomation();
    sendResponse({ success: true });
  }
  if (request.action === "stop-automation") {
    stopAutomation();
    sendResponse({ success: true });
  }
  if (request.action === "get-status") {
    sendResponse({
      isRunning: currentSession.isRunning,
      isPaused: currentSession.isPaused,
      stats: currentSession.stats,
      dataCount: currentSession.data.length,
    });
  }
  if (request.action === "whatsapp-ready") {
    currentSession.whatsappTabId = sender.tab.id;
    Logger.info("WhatsApp tab identified", { tabId: sender.tab.id });
    sendResponse({ success: true });
  }
  if (request.action === "message-sent") {
    handleMessageSent(request.messageId, request.phone);
    sendResponse({ success: true });
  }
  if (request.action === "message-failed") {
    handleMessageFailed(request.messageId, request.phone, request.error);
    sendResponse({ success: true });
  }
});

/**
 * Handle data upload
 */
function handleDataUpload(data, messageTemplate) {
  currentSession.data = data;
  currentSession.messageTemplate = messageTemplate;
  currentSession.stats = {
    total: data.length,
    sent: 0,
    failed: 0,
  };

  Logger.info("Data uploaded", {
    rows: data.length,
    messageTemplate,
  });

  // Notify popup
  chrome.runtime
    .sendMessage({
      action: "data-uploaded",
      count: data.length,
    })
    .catch(() => {
      // Popup might not be open
    });
}

/**
 * Start automation
 */
async function startAutomation() {
  if (currentSession.isRunning) {
    Logger.warn("Automation already running");
    return;
  }

  if (currentSession.data.length === 0) {
    Logger.error("No data loaded");
    return;
  }

  currentSession.isRunning = true;
  currentSession.isPaused = false;
  currentSession.startTime = new Date();

  Logger.info("Automation started", {
    totalMessages: currentSession.data.length,
  });

  // Open WhatsApp in new tab
  chrome.tabs.create({ url: "https://web.whatsapp.com" }, (tab) => {
    currentSession.whatsappTabId = tab.id;
  });

  // Start processing messages
  processMessages();
}

/**
 * Process messages in queue
 */
async function processMessages() {
  const unsent = currentSession.data.filter((item) => !item.is_msg_send);

  for (const item of unsent) {
    if (!currentSession.isRunning) {
      Logger.info("Automation stopped by user");
      break;
    }

    // Wait if paused
    while (currentSession.isPaused && currentSession.isRunning) {
      await delay(1000);
    }

    try {
      // Send message via content script
      const result = await sendMessageViaContentScript(
        item.phone,
        item.name,
        currentSession.messageTemplate
      );

      if (result) {
        item.is_msg_send = true;
        currentSession.stats.sent++;
        Logger.info(`Message sent to ${item.name}`);
      } else {
        currentSession.stats.failed++;
        Logger.error(`Failed to send message to ${item.name}`);
      }
    } catch (error) {
      currentSession.stats.failed++;
      Logger.error(`Error sending to ${item.name}`, error);
    }

    // Delay between messages to avoid rate limiting
    await delay(2000);

    // Update popup with progress
    updatePopupProgress();
  }

  currentSession.isRunning = false;
  Logger.info("Automation completed", currentSession.stats);
  updatePopupProgress();
}

/**
 * Send message via content script
 */
function sendMessageViaContentScript(phone, name, message) {
  return new Promise((resolve, reject) => {
    if (!currentSession.whatsappTabId) {
      reject(new Error("WhatsApp tab not found"));
      return;
    }

    chrome.tabs.sendMessage(
      currentSession.whatsappTabId,
      {
        action: "send-message",
        phone,
        name,
        message,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response?.success);
        }
      }
    );
  });
}

/**
 * Pause automation
 */
function pauseAutomation() {
  currentSession.isPaused = true;
  Logger.info("Automation paused");
}

/**
 * Resume automation
 */
function resumeAutomation() {
  currentSession.isPaused = false;
  Logger.info("Automation resumed");
}

/**
 * Stop automation
 */
function stopAutomation() {
  currentSession.isRunning = false;
  currentSession.isPaused = false;
  Logger.info("Automation stopped");
}

/**
 * Handle message sent
 */
function handleMessageSent(messageId, phone) {
  const item = currentSession.data.find((d) => d.phone === phone);
  if (item) {
    item.is_msg_send = true;
    currentSession.stats.sent++;
  }
}

/**
 * Handle message failed
 */
function handleMessageFailed(messageId, phone, error) {
  currentSession.stats.failed++;
  Logger.error(`Message to ${phone} failed: ${error}`);
}

/**
 * Update popup with current progress
 */
function updatePopupProgress() {
  chrome.runtime
    .sendMessage({
      action: "update-progress",
      stats: currentSession.stats,
      isRunning: currentSession.isRunning,
      isPaused: currentSession.isPaused,
    })
    .catch(() => {
      // Popup might not be open
    });
}

/**
 * Utility delay function
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Logger.info("Background service worker initialized");
