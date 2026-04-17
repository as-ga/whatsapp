# WhatsApp Auto Sender - Chrome Extension

A powerful Chrome Extension that automates sending personalized messages to multiple WhatsApp contacts using data from an Excel file.

## 📋 Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Technical Details](#technical-details)

## ✨ Features

### Core Features

- **Excel File Upload**: Load contact data from `.xlsx`, `.xls`, or `.csv` files
- **Automated Message Sending**: Send messages to multiple contacts without manual intervention
- **Personalization**: Use `{name}` placeholder to personalize messages
- **Status Tracking**: Track which messages have been sent with `is_msg_send` column
- **Progress Dashboard**: Real-time progress monitoring with statistics
- **Error Handling**: Automatic retry mechanism for failed messages
- **Logging System**: Comprehensive logging for debugging and audit trails

### Advanced Features

- **Pause/Resume**: Pause automation and resume from where you left off
- **Rate Limiting**: Built-in delays between messages to avoid WhatsApp blocking
- **Configuration Panel**: Customize message templates, delays, and retry attempts
- **Log Export**: Export logs as JSON for analysis
- **Status Indicators**: Visual feedback for automation state

## 📋 Requirements

### Excel Data Format

Your Excel file must contain these columns:

| Column Name   | Type          | Description                                 |
| ------------- | ------------- | ------------------------------------------- |
| `name`        | String        | Contact name (used for personalization)     |
| `phone`       | String/Number | Phone number (with or without country code) |
| `is_msg_send` | Boolean       | `false` = pending, `true` = already sent    |

### Example Excel Data:

```
| name     | phone        | is_msg_send |
|----------|--------------|-------------|
| John     | +1234567890  | false       |
| Sarah    | 9876543210   | false       |
| Mike     | +44 9876 543210 | true    |
```

### Browser Requirements

- Chrome/Chromium browser (version 88+)
- Active internet connection
- WhatsApp Web access (https://web.whatsapp.com)

## 🚀 Installation

### Method 1: Load as Development Extension

1. **Download/Clone the extension folder** to your computer

2. **Open Chrome Extensions page**:

   - Navigate to: `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**:

   - Toggle "Developer mode" in the top-right corner

4. **Load the extension**:
   - Click "Load unpacked"
   - Select the extension folder
   - The extension will appear in your extensions list

### Method 2: Package for Distribution

```bash
# The extension is ready to package using Chrome's built-in tools
# or tools like CRX Creator
```

## 📖 Usage Guide

### Step 1: Prepare Your Data

Create an Excel file with contact data:

```xlsx
name,phone,is_msg_send
Alice,+1 (234) 567-8900,false
Bob,9876543210,false
Charlie,+44 20 7946 0958,false
```

**Tips**:

- Phone numbers can be in any format (spaces, dashes, parentheses will be removed)
- Duplicate entries will be processed
- Maximum rows depend on your WhatsApp rate limits (typically 50-100/hour)

### Step 2: Upload Data

1. Open the extension popup (click extension icon)
2. Go to **Upload** tab
3. Click "📁 Choose Excel File" and select your file
4. Wait for data validation and preview
5. Confirm the data is correct

### Step 3: Configure Message

1. Go to **Configure** tab
2. Edit the **Message Template**:
   - Use `{name}` placeholder: `"Hello {name}, this is a test message"`
   - The `{name}` will be replaced with contact's actual name
3. Adjust **Delay between messages** (1000-10000ms recommended)
   - Higher delays are safer to avoid rate limiting
4. Set **Retry Attempts** (1-5 recommended)
5. Click save (settings auto-save to storage)

### Step 4: Start Automation

1. Go back to **Configure** tab
2. Click **▶️ Start Automation**
3. WhatsApp Web will open automatically
4. Monitor progress in **Progress** tab
5. Use **Pause** (⏸️) / **Resume** (▶️) / **Stop** (⏹️) as needed

### Step 5: Monitor Progress

1. Switch to **Progress** tab for real-time updates:

   - Total messages to send
   - Messages sent successfully
   - Failed messages count
   - Progress percentage bar

2. Check **Logs** tab for detailed execution logs

### Step 6: Review Results

After automation completes:

1. Check the statistics in Progress tab
2. Export logs if needed
3. Update your Excel file with `is_msg_send = true` for successful sends
4. Re-upload for remaining contacts

## 📁 File Structure

```
whtasapp/
├── manifest.json                 # Extension configuration
├── src/
│   ├── popup.html               # Popup UI template
│   ├── popup.css                # Popup styling
│   ├── popup.js                 # Popup logic
│   ├── background.js            # Service worker / background script
│   ├── content-script.js        # WhatsApp Web interaction
│   └── utils/
│       ├── logger.js            # Logging utility
│       ├── excel-parser.js      # Excel file parser
│       └── message-queue.js     # Message queue manager
├── images/                       # Extension icons (add icons here)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md                     # This file
```

## ⚙️ Configuration

### Message Template Variables

```javascript
// Default template
"{name} - Default message";

// Examples
"Hi {name}, welcome to our service!";
"Hello {name}, we have great news for you!";
"Dear {name}, please check this important update.";
```

### Settings

| Setting          | Default | Range      | Description                              |
| ---------------- | ------- | ---------- | ---------------------------------------- |
| Delay (ms)       | 2000    | 1000-10000 | Wait time between messages               |
| Retry Attempts   | 3       | 1-5        | Retry count for failed messages          |
| Message Template | Custom  | Text       | Message template with {name} placeholder |

### Performance Tips

- **Smaller batches**: Send 10-20 messages at a time
- **Longer delays**: Use 3000-5000ms delays for stability
- **Off-peak hours**: Send during off-peak times
- **Monitor WhatsApp**: Keep extension active while running

## 🛠️ Troubleshooting

### Extension Won't Load

**Problem**: Extension not appearing after "Load unpacked"

**Solutions**:

- Ensure all files are in the correct folder structure
- Check manifest.json for syntax errors
- Clear Chrome cache and reload
- Open DevTools (F12) to see error messages

### Upload Fails

**Problem**: "Excel file parsing failed" error

**Solutions**:

- Ensure file has required columns: `name`, `phone`, `is_msg_send`
- Check file format (`.xlsx`, `.xls`, or `.csv`)
- Validate phone numbers are numeric or properly formatted
- Check browser console for detailed errors

### Messages Not Sending

**Problem**: Automation starts but no messages sent

**Solutions**:

1. **WhatsApp Login**: Ensure you're logged into https://web.whatsapp.com
2. **Chat Opening**: Verify WhatsApp loads successfully
3. **Message Input**: Check message input field is visible
4. **Browser DevTools**: Press F12 → Console to see errors
5. **Increase Delay**: Try increasing message delay to 3000-5000ms
6. **Manual Test**: Try sending one message manually first

### Rate Limited by WhatsApp

**Problem**: WhatsApp blocks or delays messages

**Solutions**:

- Increase delay between messages (5000ms+)
- Reduce batch size (send 10 messages, wait 1 hour, continue)
- Use smaller phone number lists
- Spread over multiple days
- Check WhatsApp Business terms

### Browser Crashes

**Problem**: Browser becomes unresponsive

**Solutions**:

- Increase delay between messages (reduce CPU usage)
- Reduce batch size
- Close other tabs/extensions
- Use different browser profile
- Check system RAM usage

## 🔧 Technical Details

### How It Works

1. **Popup Interface**: User uploads Excel file and configures settings
2. **Excel Parsing**: XLSX.js library parses Excel data
3. **Data Validation**: Validates required columns and phone formats
4. **Background Script**: Manages automation workflow and state
5. **Content Script**: Injects into WhatsApp Web to automate messaging
6. **Message Injection**: Types messages and clicks send button

### Message Sending Flow

```
1. User clicks "Start Automation"
   ↓
2. Open WhatsApp Web in new tab
   ↓
3. For each unsent contact:
   a. Open chat with phone number
   b. Wait for chat to load
   c. Type personalized message
   d. Click send button
   e. Wait delay period
   f. Update status
   ↓
4. Complete and show final stats
```

### Data Flow Architecture

```
┌─────────────┐
│  Popup UI   │ (popup.html, popup.js, popup.css)
└──────┬──────┘
       │ Messages & Status
       ↓
┌──────────────────┐
│ Background.js    │ (Service Worker)
│ (Orchestration)  │
└────────┬──────────┘
         │
         ↓
┌─────────────────────────┐
│ Content Script          │
│ (WhatsApp interaction)  │
└─────────────────────────┘

Utils:
- logger.js (Logging)
- excel-parser.js (File parsing)
- message-queue.js (Queue management)
```

### Browser APIs Used

- **Chrome Runtime API**: Message passing between scripts
- **Chrome Storage API**: Store configuration and logs
- **Chrome Tabs API**: Manage WhatsApp Web tabs
- **File API**: Read Excel files
- **DOM API**: Interact with WhatsApp Web elements

## 📝 Logging

All actions are logged:

```
[INFO] [2026-04-17T10:30:45.123Z] Message sent to John
[WARN] [2026-04-17T10:31:00.456Z] Message to Sarah failed, will retry
[ERROR] [2026-04-17T10:31:15.789Z] Message to Mike failed permanently
[DEBUG] [2026-04-17T10:31:30.012Z] Chat loaded successfully
```

Export logs for:

- Debugging issues
- Audit trails
- Performance analysis

## 🚨 Important Notes

### Legal Considerations

- **WhatsApp Terms of Service**: Using automation may violate WhatsApp's ToS
- **Rate Limits**: WhatsApp blocks high-volume senders
- **User Consent**: Ensure recipients consent to receive messages
- **Jurisdiction**: Check local laws on automated messaging
- **Business Use**: WhatsApp Business API is recommended for production

### Best Practices

1. **Test First**: Send 1-2 test messages manually
2. **Small Batches**: Start with 10-20 messages
3. **Monitor**: Watch for blocking/rate limiting
4. **Delays**: Use longer delays (3000-5000ms minimum)
5. **Contact List**: Validate phone numbers before sending
6. **Backups**: Keep backups of Excel files
7. **Logging**: Export and review logs

## 🤝 Support & Contributing

### Debugging

Enable debug logs:

1. Open extension popup
2. Go to "Logs" tab
3. Export logs for analysis
4. Check browser console (F12 → Console)

### Common Issues Repository

See logs for detailed error messages and stack traces.

## 📄 License

This extension is provided as-is for personal use.

## 🎯 Future Enhancements

- [ ] Custom message templates with conditions
- [ ] Schedule messages for specific dates/times
- [ ] Database integration (Google Sheets, Airtable)
- [ ] Export updated Excel file
- [ ] Message delivery confirmation
- [ ] Advanced analytics dashboard
- [ ] Bulk contact validation
- [ ] WhatsApp Web element detection improvements

---

**Last Updated**: April 2026
**Version**: 1.0.0
