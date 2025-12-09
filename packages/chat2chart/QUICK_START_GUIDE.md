# Quick Start Guide - Onboarding & Pricing Implementation

## 🚀 **Quick Setup (3 Steps)**

### **Step 1: Run Database Migration**
```bash
# Option A: Via Docker (Recommended)
docker exec aiser-chat2chart-dev poetry run python /app/scripts/run_onboarding_migrations.py

# Option B: Via shell script
./packages/chat2chart/server/scripts/run_migration.sh

# Option C: Directly
cd packages/chat2chart/server
poetry run python scripts/run_onboarding_migrations.py
```

### **Step 2: Restart Services**
```bash
# Restart backend to load new endpoints
docker compose restart aiser-chat2chart-dev

# Or rebuild if needed
docker compose up -d --build aiser-chat2chart-dev
```

### **Step 3: Test the Flow**
1. Open browser to `http://localhost:3000`
2. Sign up with a new account
3. Verify onboarding modal appears
4. Complete onboarding
5. Check organization was created

---

## ✅ **What's Implemented**

### **Backend:**
- ✅ Enhanced onboarding service with frictionless features
- ✅ Pricing plan system (Free/Pro/Team/Enterprise)
- ✅ AI credit calculator (multi-agent support)
- ✅ Rate limiter with plan enforcement
- ✅ New API endpoints for flow optimization

### **Frontend:**
- ✅ Enhanced onboarding modal with:
  - Smart pre-filling
  - Progress persistence
  - Contextual help
  - Plan selection
  - Welcome message display

### **Database:**
- ✅ Migration script ready
- ✅ New tables: `onboarding_analytics`, `onboarding_friction_logs`, `usage_records`, `ai_usage_logs`, `subscriptions`
- ✅ Enhanced `users` and `organizations` tables

---

## 📋 **Next Actions**

1. **Run Migration** (Required)
   ```bash
   docker exec aiser-chat2chart-dev poetry run python /app/scripts/run_onboarding_migrations.py
   ```

2. **Verify Endpoints** (Optional)
   ```bash
   # Check if endpoints are registered
   curl http://localhost:8000/docs
   # Look for /api/onboarding/* endpoints
   ```

3. **Test Onboarding** (Recommended)
   - Sign up with company email → Should see minimal flow
   - Sign up with personal email → Should see full flow
   - Refresh during onboarding → Should resume

---

## 🎯 **Expected Results**

After migration and testing:
- ✅ New users get optimized onboarding flow
- ✅ Organizations auto-created with correct plan limits
- ✅ Projects auto-created for Free/Pro users
- ✅ Quick start dashboard created
- ✅ Welcome message with next steps
- ✅ Progress tracked and persisted

---

**Status**: Ready for migration execution and testing! 🚀


