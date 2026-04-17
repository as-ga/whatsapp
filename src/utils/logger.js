/**
 * Logger Utility
 * Provides centralized logging for the extension
 */

const Logger = {
  logs: [],
  maxLogs: 500,

  log(message, level = "INFO", data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    this.logs.push(logEntry);

    // Keep logs under maxLogs limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Also log to console
    const prefix = `[${level}] [${timestamp}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = Logger;
}
