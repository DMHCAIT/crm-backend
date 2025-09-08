# 🔧 FACEBOOK INTEGRATION SETUP GUIDE

## ✅ FACEBOOK ACCESS TOKEN RECEIVED!

**Token:** `EAARjf4qcqcABPQ2Fx6BduYOjn1cZCPRO221beobGLHb7T2Q7Bmc1nGMcsPDIZC7UKXPeflqdq2oLqopN6GfQVQvbtAtFTddFJnLu7TO9cS9pbZAb9ckrZAZASZAi8hhitlithGsWYwKnStBymKOtCXyyQCXtZAdJMjzXCxxjTjUZA4HJTZC6QbJfIZBLnVxvAh5q178ugLwQvRRsv1qXXrmLKkmKMGQxcOlD5S5ZB3zNZBpXDZAoZD`

---

## 🚀 NEXT STEPS TO ACTIVATE FACEBOOK INTEGRATION

### **1. Add Environment Variables to Railway** 🛠️

**Go to Railway Dashboard:**
1. Visit: https://railway.app/dashboard
2. Select your `crm-backend` project
3. Go to **Variables** tab
4. Add these variables:

**Variable 1:**
   - **Name:** `FACEBOOK_ACCESS_TOKEN`
   - **Value:** `EAARjf4qcqcABPQ2Fx6BduYOjn1cZCPRO221beobGLHb7T2Q7Bmc1nGMcsPDIZC7UKXPeflqdq2oLqopN6GfQVQvbtAtFTddFJnLu7TO9cS9pbZAb9ckrZAZASZAi8hhitlithGsWYwKnStBymKOtCXyyQCXtZAdJMjzXCxxjTjUZA4HJTZC6QbJfIZBLnVxvAh5q178ugLwQvRRsv1qXXrmLKkmKMGQxcOlD5S5ZB3zNZBpXDZAoZD`

**Variable 2:**
   - **Name:** `FACEBOOK_PAGE_ID`
   - **Value:** `115686814967645`

**After adding both, Railway will automatically redeploy your backend!**

### **3. Test the Integration** 🧪

After setting up Railway variables, test with:
```bash
# Run this to verify Facebook integration
node test-facebook.js
```

This will:
- ✅ Verify token validity
- ✅ List your available pages
- ✅ Check permissions
- ✅ Provide Page ID for configuration

---

## 🔄 FACEBOOK LEAD ADS WORKFLOW

### **How It Works:**
1. **Lead submits form** on Facebook Ad
2. **Facebook sends webhook** to your backend
3. **Backend processes lead** and saves to database
4. **Lead appears** in your CRM dashboard
5. **Notifications sent** to your team

### **Webhook URL for Facebook:**
```
https://crm-backend-production-5e32.up.railway.app/api/facebook
```

**Set this URL in your Facebook App webhook settings!**

---

## 📋 REQUIRED FACEBOOK PERMISSIONS

Your token should have these permissions:
- ✅ `leads_retrieval` - Access lead data
- ✅ `pages_show_list` - List pages
- ✅ `pages_manage_metadata` - Manage page settings

---

## 🎯 COMPLETION CHECKLIST

✅ **Access Token:** Configured locally  
✅ **Page ID:** Configured (115686814967645)  
- [ ] Add `FACEBOOK_ACCESS_TOKEN` to Railway
- [ ] Add `FACEBOOK_PAGE_ID` to Railway  
- [ ] Test integration with test script
- [ ] Configure Facebook webhook URL
- [ ] Test with sample lead form

**🏆 Once complete, your Facebook Lead Ads will automatically flow into your CRM!**

---

## 📊 INTEGRATION STATUS

**✅ READY FOR DEPLOYMENT**
- Access Token: EAARjf4q... (249 characters)
- Page ID: 115686814967645
- Webhook Endpoint: `/api/facebook`
- Database Integration: Ready

**🔄 NEXT: Add to Railway and test!**
