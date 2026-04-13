# Google Sheets -> CRM Webhook Setup

Webhook URL:
`https://crm-backend-fh34.onrender.com/api/leads/google-sheet-webhook`

## Required backend env vars
- `GOOGLE_SHEETS_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Google Apps Script

```javascript
const WEBHOOK_URL = 'https://crm-backend-fh34.onrender.com/api/leads/google-sheet-webhook';
const WEBHOOK_SECRET = 'same_secret_as_backend_env';
const SHEET_NAME = 'Sheet1';

function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    if (sheet.getName() !== SHEET_NAME) return;

    const row = e.range.getRow();
    if (row <= 1) return; // skip header

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

    const payload = {};
    headers.forEach((header, idx) => payload[String(header).trim()] = values[idx]);

    UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        secret: WEBHOOK_SECRET,
        lead: payload
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Webhook error: ' + err.message);
  }
}
