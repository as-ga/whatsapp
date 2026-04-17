/**
 * Excel/CSV Parser Utility
 * Parses Excel and CSV files and extracts data
 * No external dependencies - uses vanilla JavaScript
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

const ExcelParser = {
  /**
   * Parse Excel file (CSV format)
   * @param {File} file - Excel or CSV file object
   * @returns {Promise<Array>} Parsed data
   */
  async parseExcelFile(file) {
    try {
      const arrayBuffer = await this.fileToArrayBuffer(file);
      let data;

      // Check if it's a CSV file or Excel
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith(".csv")) {
        // Parse as CSV
        const text = new TextDecoder().decode(arrayBuffer);
        data = this.parseCSV(text);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // For Excel files exported as CSV (most common)
        const text = new TextDecoder().decode(arrayBuffer);
        data = this.parseCSV(text);
      } else {
        throw new Error(
          "Unsupported file format. Please use .csv or export Excel as CSV."
        );
      }

      Logger.info("File parsed successfully", {
        rows: data.length,
        fileName: file.name,
      });

      return this.validateData(data);
    } catch (error) {
      Logger.error("Failed to parse file", error);
      throw error;
    }
  },

  /**
   * Parse CSV text
   */
  parseCSV(text) {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = {};

      headers.forEach((header, index) => {
        row[header.toLowerCase().trim()] = values[index]
          ? values[index].trim()
          : "";
      });

      if (Object.values(row).some((v) => v !== "")) {
        data.push(row);
      }
    }

    return data;
  },

  /**
   * Parse a single CSV line (handles quoted values)
   */
  parseCSVLine(line) {
    const values = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        values.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }

    values.push(currentValue);
    return values;
  },

  /**
   * Convert File to ArrayBuffer
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Validate and clean parsed data
   */
  validateData(data) {
    const validated = [];
    const errors = [];

    data.forEach((row, index) => {
      try {
        // Normalize keys to lowercase
        const normalizedRow = {};
        Object.keys(row).forEach((key) => {
          normalizedRow[key.toLowerCase()] = row[key];
        });

        // Check required columns
        const hasName =
          normalizedRow["name"] && normalizedRow["name"].trim() !== "";
        const hasPhone =
          normalizedRow["phone"] &&
          normalizedRow["phone"].toString().trim() !== "";

        if (!hasName || !hasPhone) {
          errors.push(
            `Row ${index + 1}: Missing required columns (name, phone)`
          );
          return;
        }

        // Clean phone number (remove spaces, dashes, etc.)
        const phone = normalizedRow["phone"].toString().replace(/\D/g, "");

        if (phone.length < 10) {
          errors.push(
            `Row ${index + 1}: Invalid phone number (too short: ${
              normalizedRow["phone"]
            })`
          );
          return;
        }

        // Parse is_msg_send status
        let isSent = false;
        if (
          normalizedRow["is_msg_send"] !== undefined &&
          normalizedRow["is_msg_send"] !== ""
        ) {
          const value = normalizedRow["is_msg_send"].toString().toLowerCase();
          isSent = value === "true" || value === "1" || value === "yes";
        }

        validated.push({
          originalIndex: index,
          name: normalizedRow["name"].trim(),
          phone: phone,
          is_msg_send: isSent,
          originalRow: normalizedRow,
        });
      } catch (error) {
        errors.push(`Row ${index + 1}: ${error.message}`);
      }
    });

    if (errors.length > 0) {
      Logger.warn("Data validation issues", {
        errors,
        errorCount: errors.length,
      });
    }

    return {
      data: validated,
      total: data.length,
      valid: validated.length,
      errors,
    };
  },

  /**
   * Filter rows that need message sending
   */
  filterUnsent(data) {
    return data.filter((row) => !row.is_msg_send);
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ExcelParser;
}
