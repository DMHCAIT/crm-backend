# 🔗 Facebook Lead Ads Integration Setup Guide

## Required Facebook API Credentials

Add these environment variables to your `.env` file:

```bash
# Facebook App Credentials
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_ACCESS_TOKEN=your_long_lived_access_token

# Facebook Business Details  
FACEBOOK_PAGE_ID=your_facebook_page_id
FACEBOOK_AD_ACCOUNT_ID=act_your_ad_account_id

# Webhook Configuration
FACEBOOK_WEBHOOK_VERIFY_TOKEN=dmhca_crm_facebook_webhook_2024
FACEBOOK_WEBHOOK_URL=https://your-backend-domain.com/api/facebook-leads
```

## Step-by-Step Setup Process

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App" → Choose "Business" type
3. Fill in your app details:
   - **App Name**: "DMHCA CRM Lead Integration"
   - **Contact Email**: Your email
   - **Business Use**: Lead generation

### 2. Add Lead Ads Product
1. In your app dashboard, click "Add Product"
2. Find "Lead Ads" and click "Set Up"
3. This gives you access to Lead Ads API

### 3. Generate Access Token
1. Go to **Tools** → **Graph API Explorer**
2. Select your app from dropdown
3. Add these permissions:
   - `leads_retrieval` (Required for accessing leads)
   - `pages_read_engagement` 
   - `ads_read`
   - `pages_manage_ads`
4. Click "Generate Access Token"
5. **Important**: Extend token to long-lived (60 days):
   ```bash
   curl -i -X GET "https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}"
   ```

### 4. Get Your IDs

#### Facebook Page ID:
1. Go to your Facebook page
2. Click "About" → "Page Transparency" 
3. Copy the Page ID

#### Ad Account ID:
1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Click "Ad Accounts" 
3. Your Ad Account ID (format: `act_1234567890`)

### 5. Set Up Webhooks (Optional - for real-time sync)
1. In your Facebook App → "Webhooks"
2. Click "Add Subscription" → "Page"
3. **Callback URL**: `https://your-backend.com/api/facebook-leads`
4. **Verify Token**: `dmhca_crm_facebook_webhook_2024`
5. Subscribe to field: `leadgen`

## API Endpoints

### Fetch Facebook Leads
```javascript
GET /api/facebook-leads
```

**Query Parameters:**
- `limit`: Number of leads to fetch (default: 25)
- `since`: Unix timestamp for date range start
- `until`: Unix timestamp for date range end

**Example:**
```bash
curl "https://your-backend.com/api/facebook-leads?limit=50&since=1672531200"
```

### Manual Sync Trigger
```javascript
POST /api/facebook-leads
```

**Body:**
```json
{
  "timeRange": "7d",    // "1d", "7d", "30d"
  "limit": 50
}
```

### Webhook Receiver
```javascript
POST /api/facebook-leads
```
- Automatically receives real-time lead notifications from Facebook
- Processes and saves leads immediately when submitted

## Testing Your Integration

### 1. Test API Connection
```bash
# Test fetch leads
curl -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_jwt_token" \
     "https://your-backend.com/api/facebook-leads?limit=5"
```

### 2. Test Manual Sync
```bash
curl -X POST "https://your-backend.com/api/facebook-leads" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your_jwt_token" \
     -d '{"timeRange": "1d", "limit": 10}'
```

## Facebook Lead Field Mapping

Your Facebook lead form fields will be automatically mapped to CRM fields:

| Facebook Field | CRM Field | Notes |
|---|---|---|
| `full_name` / `name` | `fullName` | Primary name field |
| `email` / `email_address` | `email` | Required for lead |  
| `phone_number` / `phone` | `phone` | Contact number |
| `country` / `location` | `country` | Location data |
| `qualification` / `education` | `qualification` | Education level |
| `course` / `course_interest` | `course` | Course selection |

## Lead Processing Flow

1. **Fetch**: API retrieves leads from all your Facebook lead forms
2. **Transform**: Maps Facebook fields to your CRM structure  
3. **Dedupe**: Checks for existing leads by email
4. **Save**: Stores new leads in your Supabase database
5. **Notify**: Assigns to "Facebook Leads Team" for follow-up

## Troubleshooting

### Common Issues:

**1. "Missing Facebook API credentials" Error**
- Ensure all environment variables are set correctly
- Verify your access token hasn't expired

**2. "Facebook API Error: Invalid OAuth access token"**  
- Generate a new long-lived access token
- Check your app permissions

**3. "No leads found"**
- Verify your Page ID is correct
- Ensure your lead forms have submitted leads
- Check date range parameters

**4. Webhook not receiving leads**
- Verify webhook URL is publicly accessible
- Check verify token matches exactly
- Ensure SSL certificate is valid

### Debug Mode:
Set `NODE_ENV=development` to see detailed logs of the Facebook API integration process.

## Security Best Practices

1. **Environment Variables**: Never commit credentials to git
2. **Access Tokens**: Use long-lived tokens and rotate regularly  
3. **Webhook Security**: Enable signature verification in production
4. **Rate Limits**: Facebook has API rate limits - respect them
5. **Error Handling**: Monitor logs for failed lead imports

## Production Deployment

1. Add environment variables to your hosting platform
2. Ensure webhook URL is HTTPS and publicly accessible
3. Test the integration with a few leads first
4. Monitor logs for any import failures
5. Set up alerts for failed lead imports