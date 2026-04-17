/**
 * Content Script for WhatsApp Web
 * This script runs on the WhatsApp Web page and handles message sending
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

const WhatsAppAutomation = {
  isReady: false,
  currentMessage: null,

  /**
   * Initialize the automation system
   */
  init() {
    Logger.info("WhatsApp content script loaded");
    this.waitForWhatsAppReady();
    this.setupMessageListener();
  },

  /**
   * Wait for WhatsApp to fully load
   */
  waitForWhatsAppReady() {
    const checkInterval = setInterval(() => {
      // Check if WhatsApp main chat container is loaded
      const chatContainer =
        document.querySelector('[data-testid="pane-side"]') ||
        document.querySelector('div[role="main"]');

      if (chatContainer) {
        this.isReady = true;
        Logger.info("WhatsApp is ready");
        clearInterval(checkInterval);
        chrome.runtime.sendMessage({ action: "whatsapp-ready" });
      }
    }, 1000);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!this.isReady) {
        clearInterval(checkInterval);
        Logger.warn("WhatsApp ready check timeout");
      }
    }, 30000);
  },

  /**
   * Setup listener for messages from background script
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "send-message") {
        this.sendMessage(request.phone, request.name, request.message)
          .then((result) => sendResponse({ success: true, result }))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
        return true; // Keep channel open for async response
      }
      if (request.action === "check-ready") {
        sendResponse({ ready: this.isReady });
      }
    });
  },

  /**
   * Send message to a specific phone number
   */
  async sendMessage(phone, name, messageText) {
    try {
      if (!this.isReady) {
        throw new Error("WhatsApp is not ready");
      }

      // Personalize message
      const personalizedMessage = messageText.replace(/{name}/g, name);

      // Open WhatsApp chat with phone number
      await this.openWhatsAppChat(phone);

      // Wait for chat to load
      await this.waitForChatLoad();

      // Send message
      await this.typeAndSendMessage(personalizedMessage);

      Logger.info(`Message sent to ${name}`, { phone });
      return { success: true, name, phone };
    } catch (error) {
      Logger.error(`Failed to send message to ${name}`, error);
      throw error;
    }
  },

  /**
   * Open WhatsApp chat using web.whatsapp.com link format
   */
  async openWhatsAppChat(phone) {
    const formattedPhone = phone.replace(/\D/g, "");
    // WhatsApp Web uses this URL format to open chats
    const chatUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}`;

    window.open(chatUrl, "_blank");

    // Wait for new window to open and load
    await new Promise((resolve) => setTimeout(resolve, 3000));
  },

  /**
   * Wait for the chat message input to be ready
   */
  async waitForChatLoad(maxAttempts = 30) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const messageInput = this.getMessageInput();
      if (messageInput && messageInput.textContent !== undefined) {
        return true;
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error("Chat failed to load within timeout");
  },

  /**
   * Get the message input element
   */
  getMessageInput() {
    // Try multiple selectors for different WhatsApp Web versions
    return (
      document.querySelector('[contenteditable="true"][data-tab="10"]') ||
      document.querySelector(
        'div[contenteditable="true"][data-placeholder*="message"]'
      ) ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('[data-testid="msg-input"]')
    );
  },

  /**
   * Type message into input field
   */
  async typeMessage(text) {
    const input = this.getMessageInput();
    if (!input) {
      throw new Error("Message input not found");
    }

    // Clear existing content
    input.textContent = "";
    input.innerHTML = "";

    // Trigger focus event
    input.focus();
    const focusEvent = new FocusEvent("focus", { bubbles: true });
    input.dispatchEvent(focusEvent);

    // Type message character by character with small delays
    for (let i = 0; i < text.length; i++) {
      input.textContent += text[i];
      input.innerHTML = this.escapeHtml(input.textContent);

      // Trigger input event
      const inputEvent = new InputEvent("input", { bubbles: true });
      input.dispatchEvent(inputEvent);

      // Small delay between characters to simulate natural typing
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    Logger.debug("Message typed", { length: text.length });
  },

  /**
   * Send the message by clicking send button
   */
  async sendMessage_Internal() {
    // Find send button - WhatsApp uses different selectors
    const sendButton =
      document.querySelector('[data-testid="composer_send"]') ||
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('span[data-icon="send"] ~ button') ||
      Array.from(document.querySelectorAll("button")).find(
        (btn) =>
          btn.textContent.includes("Send") ||
          btn.querySelector('[data-icon="send"]')
      );

    if (!sendButton) {
      throw new Error("Send button not found");
    }

    sendButton.click();

    // Wait for message to be sent
    await new Promise((resolve) => setTimeout(resolve, 1000));

    Logger.debug("Message sent via button click");
  },

  /**
   * Type and send message in one action
   */
  async typeAndSendMessage(text) {
    try {
      await this.typeMessage(text);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.sendMessage_Internal();
    } catch (error) {
      Logger.error("Error in typeAndSendMessage", error);
      throw error;
    }
  },

  /**
   * Escape HTML entities
   */
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  },

  /**
   * Check if we're still on WhatsApp
   */
  isOnWhatsApp() {
    return window.location.href.includes("web.whatsapp.com");
  },
};

// Initialize when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    WhatsAppAutomation.init()
  );
} else {
  WhatsAppAutomation.init();
}
