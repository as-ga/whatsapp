/**
 * Popup Script
 * Manages the extension popup UI and interactions
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

// Fallback for ExcelParser if not loaded
if (typeof ExcelParser === "undefined") {
  var ExcelParser = {
    async parseExcelFile(file) {
      throw new Error(
        "ExcelParser not loaded. Please ensure excel-parser.js is included."
      );
    },
  };
}

let uploadedData = [];
let isAutomationRunning = false;
let isPaused = false;

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  initializeUI();
  setupEventListeners();
  setupTabNavigation();
  updateStatusDisplay();
  loadConfigFromStorage();
});

/**
 * Initialize UI
 */
function initializeUI() {
  // Set default message template
  const defaultMessage =
    "Hello {name}, this is an automated message from WhatsApp Automation.";
  document.getElementById("messageTemplate").value = defaultMessage;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // File upload
  const fileInput = document.getElementById("excelFile");
  if (!fileInput) {
    Logger.error("File input element not found");
    return;
  }
  fileInput.addEventListener("change", handleFileUpload);

  // Control buttons
  document
    .getElementById("startBtn")
    .addEventListener("click", startAutomation);
  document
    .getElementById("pauseBtn")
    .addEventListener("click", pauseAutomation);
  document
    .getElementById("resumeBtn")
    .addEventListener("click", resumeAutomation);
  document.getElementById("stopBtn").addEventListener("click", stopAutomation);

  // Log buttons
  document
    .getElementById("exportLogsBtn")
    .addEventListener("click", exportLogs);
  document.getElementById("clearLogsBtn").addEventListener("click", clearLogs);

  // Configuration storage
  document
    .getElementById("messageTemplate")
    .addEventListener("change", saveConfig);
  document.getElementById("delayMs").addEventListener("change", saveConfig);
  document
    .getElementById("retryAttempts")
    .addEventListener("change", saveConfig);
}

/**
 * Setup tab navigation
 */
function setupTabNavigation() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tabName = btn.getAttribute("data-tab");

      // Update active states
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(tabName).classList.add("active");

      // Refresh progress when switching to progress tab
      if (tabName === "progress") {
        refreshProgressDisplay();
      }
      if (tabName === "logs") {
        refreshLogsDisplay();
      }
    });
  });
}

/**
 * Handle file upload
 */
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) {
    console.log("No file selected");
    return;
  }

  try {
    console.log("File selected:", file.name, file.size, "bytes");
    Logger.info("Processing file upload", { fileName: file.name });

    // Verify ExcelParser is available
    if (typeof ExcelParser === "undefined") {
      console.error("ExcelParser not loaded!");
      showMessage("ExcelParser library failed to load", "error");
      return;
    }

    console.log("ExcelParser available, starting parse...");

    // Parse Excel/CSV file
    const result = await ExcelParser.parseExcelFile(file);

    console.log("Parse result:", result);

    if (!result || result.valid === 0) {
      showMessage("No valid data found in file", "error");
      return;
    }

    uploadedData = result.data;
    console.log("Upload data set:", uploadedData.length, "records");

    // Show upload status
    const statusSection = document.getElementById("uploadStatus");
    const messageDiv = document.getElementById("uploadMessage");
    const previewBody = document.getElementById("previewBody");

    statusSection.style.display = "block";

    // Status message
    messageDiv.className = "status-message success";
    messageDiv.innerHTML = `
      ✓ Successfully loaded <strong>${
        result.valid
      }</strong> valid records out of <strong>${result.total}</strong>
      ${
        result.errors.length > 0
          ? `<br><small>${result.errors.length} rows had validation issues</small>`
          : ""
      }
    `;

    // Preview data (show first 10 rows)
    previewBody.innerHTML = "";
    uploadedData.slice(0, 10).forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(row.name)}</td>
        <td>${formatPhoneNumber(row.phone)}</td>
        <td><span class="status-badge ${
          row.is_msg_send ? "sent" : "pending"
        }">${row.is_msg_send ? "✓ Sent" : "⏳ Pending"}</span></td>
      `;
      previewBody.appendChild(tr);
    });

    if (uploadedData.length > 10) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="3" style="text-align: center; color: #999;">... and ${
        uploadedData.length - 10
      } more</td>`;
      previewBody.appendChild(tr);
    }

    // Send data to background script
    chrome.runtime.sendMessage({
      action: "upload-data",
      data: uploadedData,
      messageTemplate: document.getElementById("messageTemplate").value,
    });

    Logger.info("File uploaded successfully", { rows: uploadedData.length });
    showMessage("File uploaded successfully!", "success");
  } catch (error) {
    console.error("File upload error:", error);
    Logger.error("File upload failed", error);
    showMessage(`Error: ${error.message}`, "error");
  }
}

/**
 * Start automation
 */
function startAutomation() {
  if (uploadedData.length === 0) {
    showMessage("Please upload data first", "error");
    return;
  }

  const messageTemplate = document.getElementById("messageTemplate").value;
  if (!messageTemplate) {
    showMessage("Please enter message template", "error");
    return;
  }

  Logger.info("Starting automation", { records: uploadedData.length });

  chrome.runtime.sendMessage(
    {
      action: "start-automation",
    },
    (response) => {
      if (response && response.success) {
        isAutomationRunning = true;
        updateControlButtons();
        showMessage(
          "Automation started! WhatsApp will open in a new window.",
          "success"
        );

        // Switch to progress tab
        setTimeout(() => {
          document.querySelector('[data-tab="progress"]').click();
        }, 500);
      }
    }
  );
}

/**
 * Pause automation
 */
function pauseAutomation() {
  chrome.runtime.sendMessage(
    {
      action: "pause-automation",
    },
    (response) => {
      if (response && response.success) {
        isPaused = true;
        updateControlButtons();
        showMessage("Automation paused", "warning");
      }
    }
  );
}

/**
 * Resume automation
 */
function resumeAutomation() {
  chrome.runtime.sendMessage(
    {
      action: "resume-automation",
    },
    (response) => {
      if (response && response.success) {
        isPaused = false;
        updateControlButtons();
        showMessage("Automation resumed", "success");
      }
    }
  );
}

/**
 * Stop automation
 */
function stopAutomation() {
  if (confirm("Are you sure you want to stop the automation?")) {
    chrome.runtime.sendMessage(
      {
        action: "stop-automation",
      },
      (response) => {
        if (response && response.success) {
          isAutomationRunning = false;
          isPaused = false;
          updateControlButtons();
          showMessage("Automation stopped", "warning");
        }
      }
    );
  }
}

/**
 * Update control buttons state
 */
function updateControlButtons() {
  document.getElementById("startBtn").disabled =
    isAutomationRunning || uploadedData.length === 0;
  document.getElementById("pauseBtn").disabled =
    !isAutomationRunning || isPaused;
  document.getElementById("resumeBtn").disabled =
    !isAutomationRunning || !isPaused;
  document.getElementById("stopBtn").disabled = !isAutomationRunning;
}

/**
 * Refresh progress display
 */
function refreshProgressDisplay() {
  chrome.runtime.sendMessage({ action: "get-status" }, (response) => {
    if (response) {
      const stats = response.stats || {};
      const total = stats.total || 0;
      const sent = stats.sent || 0;

      // Update stats
      document.getElementById("statTotal").textContent = total;
      document.getElementById("statSent").textContent = sent;
      document.getElementById("statFailed").textContent = stats.failed || 0;

      // Update progress bar
      const percentage = total > 0 ? Math.round((sent / total) * 100) : 0;
      const progressBar = document.getElementById("progressBar");
      progressBar.style.width = percentage + "%";
      progressBar.textContent = percentage > 10 ? percentage + "%" : "";

      // Update progress text
      const progressText = document.getElementById("progressText");
      if (response.isRunning) {
        progressText.textContent = `Running: ${sent}/${total} sent (${percentage}%)`;
        isAutomationRunning = true;
      } else if (response.isPaused) {
        progressText.textContent = `Paused: ${sent}/${total} sent (${percentage}%)`;
        isPaused = true;
      } else {
        progressText.textContent = `Completed: ${sent}/${total} sent (${percentage}%)`;
        isAutomationRunning = false;
        isPaused = false;
      }

      // Update status indicator
      const statusIndicator = document.getElementById("statusIndicator");
      const statusText = document.getElementById("statusText");

      statusIndicator.className = "status-idle";
      statusText.textContent = "Idle";

      if (response.isRunning) {
        statusIndicator.className = "status-running";
        statusText.textContent = "🟢 Running";
      } else if (response.isPaused) {
        statusIndicator.className = "status-paused";
        statusText.textContent = "🟡 Paused";
      }

      updateControlButtons();
    }
  });
}

/**
 * Update status display
 */
function updateStatusDisplay() {
  // Poll status every 2 seconds
  setInterval(refreshProgressDisplay, 2000);

  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "update-progress") {
      refreshProgressDisplay();
    }
  });
}

/**
 * Refresh logs display
 */
function refreshLogsDisplay() {
  const logContainer = document.getElementById("logContainer");
  const logs = Logger.getLogs();

  if (logs.length === 0) {
    logContainer.innerHTML = '<p class="help-text">No logs yet</p>';
    return;
  }

  logContainer.innerHTML = logs
    .map(
      (log) => `
    <div class="log-entry">
      <span class="log-time">[${log.timestamp.substring(11, 19)}]</span>
      <span class="log-level log-${log.level.toLowerCase()}">[${
        log.level
      }]</span>
      <span>${escapeHtml(log.message)}</span>
      ${
        log.data
          ? `<br><span style="color: #666;">→ ${JSON.stringify(
              log.data
            )}</span>`
          : ""
      }
    </div>
  `
    )
    .join("");

  logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * Export logs
 */
function exportLogs() {
  const logs = Logger.exportLogs();
  const blob = new Blob([logs], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `whatsapp-logs-${new Date()
    .toISOString()
    .substring(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showMessage("Logs exported successfully", "success");
}

/**
 * Clear logs
 */
function clearLogs() {
  if (confirm("Are you sure you want to clear all logs?")) {
    Logger.clearLogs();
    refreshLogsDisplay();
    showMessage("Logs cleared", "warning");
  }
}

/**
 * Show message notification
 */
function showMessage(message, type = "info") {
  // Get the current active tab and show message there
  const activeTab = document.querySelector(".tab-content.active");
  let messageDiv = activeTab.querySelector(".temp-message");

  if (!messageDiv) {
    messageDiv = document.createElement("div");
    messageDiv.className = "temp-message status-message";
    activeTab.insertBefore(messageDiv, activeTab.firstChild);
  }

  messageDiv.className = `temp-message status-message ${type}`;
  messageDiv.textContent = message;

  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

/**
 * Save configuration to storage
 */
function saveConfig() {
  const config = {
    messageTemplate: document.getElementById("messageTemplate").value,
    delayMs: document.getElementById("delayMs").value,
    retryAttempts: document.getElementById("retryAttempts").value,
  };

  chrome.storage.local.set({ automationConfig: config });
  Logger.info("Configuration saved");
}

/**
 * Load configuration from storage
 */
function loadConfigFromStorage() {
  chrome.storage.local.get(["automationConfig"], (result) => {
    if (result.automationConfig) {
      const config = result.automationConfig;
      if (config.messageTemplate) {
        document.getElementById("messageTemplate").value =
          config.messageTemplate;
      }
      if (config.delayMs) {
        document.getElementById("delayMs").value = config.delayMs;
      }
      if (config.retryAttempts) {
        document.getElementById("retryAttempts").value = config.retryAttempts;
      }
    }
  });
}

/**
 * Format phone number for display
 */
function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10) {
    const last4 = cleaned.slice(-4);
    return `...${last4}`;
  }
  return cleaned;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// Add CSS for status badges
const style = document.createElement("style");
style.textContent = `
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }
  .status-badge.sent {
    background-color: #d4edda;
    color: #155724;
  }
  .status-badge.pending {
    background-color: #fff3cd;
    color: #856404;
  }
`;
document.head.appendChild(style);

Logger.info("Popup script initialized");
