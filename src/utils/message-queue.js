/**
 * Message Queue Manager
 * Manages the queue of messages to be sent
 */

const MessageQueue = {
  queue: [],
  processing: false,
  paused: false,
  delayMs: 2000, // Delay between messages to avoid rate limiting
  retryAttempts: 3,
  retryDelayMs: 5000,

  /**
   * Initialize queue with data
   */
  initialize(data, messageTemplate = null) {
    this.queue = data.map((row, index) => ({
      id: `msg_${Date.now()}_${index}`,
      name: row.name,
      phone: row.phone,
      originalIndex: row.originalIndex,
      status: "pending", // pending, processing, sent, failed
      attempts: 0,
      error: null,
      sentAt: null,
      messageTemplate: messageTemplate,
    }));

    Logger.info("Message queue initialized", {
      total: this.queue.length,
    });

    return this.queue;
  },

  /**
   * Get next pending message
   */
  getNextPending() {
    return this.queue.find((msg) => msg.status === "pending");
  },

  /**
   * Get queue statistics
   */
  getStats() {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
    };

    this.queue.forEach((msg) => {
      stats[msg.status] = (stats[msg.status] || 0) + 1;
    });

    return stats;
  },

  /**
   * Mark message as processing
   */
  markProcessing(messageId) {
    const message = this.queue.find((m) => m.id === messageId);
    if (message) {
      message.status = "processing";
      message.attempts++;
    }
  },

  /**
   * Mark message as sent
   */
  markSent(messageId) {
    const message = this.queue.find((m) => m.id === messageId);
    if (message) {
      message.status = "sent";
      message.sentAt = new Date().toISOString();
      Logger.info(`Message sent to ${message.name}`, { phone: message.phone });
    }
  },

  /**
   * Mark message as failed
   */
  markFailed(messageId, error = null) {
    const message = this.queue.find((m) => m.id === messageId);
    if (message) {
      if (message.attempts < this.retryAttempts) {
        message.status = "pending";
        message.error = error?.message || "Unknown error";
        Logger.warn(`Message to ${message.name} failed, will retry`, {
          phone: message.phone,
          attempt: message.attempts,
        });
      } else {
        message.status = "failed";
        message.error = error?.message || "Max retries exceeded";
        Logger.error(`Message to ${message.name} failed permanently`, {
          phone: message.phone,
          error: message.error,
        });
      }
    }
  },

  /**
   * Get all queue entries
   */
  getQueue() {
    return this.queue;
  },

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.processing = false;
    this.paused = false;
    Logger.info("Message queue cleared");
  },

  /**
   * Pause processing
   */
  pause() {
    this.paused = true;
    Logger.info("Message queue paused");
  },

  /**
   * Resume processing
   */
  resume() {
    this.paused = false;
    Logger.info("Message queue resumed");
  },

  /**
   * Get messages by status
   */
  getByStatus(status) {
    return this.queue.filter((msg) => msg.status === status);
  },

  /**
   * Export queue as JSON
   */
  export() {
    return JSON.stringify(this.queue, null, 2);
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MessageQueue;
}
