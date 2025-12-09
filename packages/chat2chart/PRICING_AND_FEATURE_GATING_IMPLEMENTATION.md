# Pricing Plans & Feature Gating Implementation

## ✅ Completed Changes

### 1. Pricing Plans Updated
- **Pro Plan**: $14.99/month (was $19.99)
- **Team Plan**: $74.95/month (minimum 5 seats, $14.99/user after)
- **Enterprise Plan**: 
  - Removed "-1" AI credits display (now shows "Unlimited")
  - Removed "Own AI project" (already have Custom AI models)
  - Added SSO (Single Sign-On)

### 2. Settings Page Improvements
- ✅ Removed "Login Notifications" from Security tab
- ✅ Appearance tab: Removed theme dropdown, added Alert directing to header toggle
- ✅ **API Keys Tab Enhanced**:
  - **AI Model Preference**: Dropdown to select preferred AI model (aligned with ModelSelector)
  - **AI Provider API Keys**: Management for OpenAI, Azure, Anthropic with encryption indicators
  - **Secure Storage**: Modal for adding/updating provider keys with encryption notices
  - **Aiser Platform API Keys**: Existing functionality preserved

### 3. Pricing Modal Improvements
- Added value proposition text
- Enhanced footer with benefit checkmarks
- Better messaging for trials and cancellation
- Team plan shows minimum seats and per-user pricing

### 4. Backend Endpoints Implemented

#### `/users/provider-api-keys` (GET)
- Returns encrypted status of provider API keys (never returns full keys)
- Returns preview (first 8 chars + dots) and encrypted status
- Providers: openai, azure, anthropic

#### `/users/provider-api-keys` (PUT)
- Saves and encrypts AI provider API keys
- Uses existing encryption utilities from `app.modules.data.utils.credentials`
- Stores in user settings with key: `provider_api_key_{provider}`

#### `/users/preferences/ai-model` (GET/PUT)
- Already existed, now properly integrated with frontend
- Stores user's preferred AI model preference

### 5. Feature Gating Infrastructure

#### Created `feature_gate.py`
- `require_feature(feature_name, plan_required)` decorator
- `require_plan(min_plan)` decorator
- Helper functions for checking feature access

#### Feature Gating Applied
- **Chart Generation** (`/charts/generate`): Requires Pro plan (api_access feature)
- **Data Source Creation**: Checks data source limits based on plan
- More endpoints to be gated (see TODO below)

## 📋 Feature Gating by Plan

### Free Plan
- ✅ Access to all charts (with watermark)
- ✅ 10 AI credits/month
- ✅ 1 project
- ✅ 2 data sources
- ✅ 2 GB storage
- ❌ Theme customization
- ❌ API access
- ❌ White-label
- ❌ Collaboration

### Pro Plan ($14.99/month)
- ✅ Access to all charts (no watermark)
- ✅ 100 AI credits/month
- ✅ Unlimited projects
- ✅ Unlimited data sources
- ✅ 20 GB storage
- ✅ Theme customization
- ✅ API access
- ❌ White-label
- ❌ Collaboration

### Team Plan ($74.95/month, 5 seats min)
- ✅ Everything in Pro
- ✅ 800 AI credits/month
- ✅ User collaboration (unlimited)
- ✅ 100 GB storage
- ✅ Advanced analytics
- ✅ Custom integrations
- ❌ White-label
- ❌ On-premise

### Enterprise Plan (Custom pricing)
- ✅ Everything in Team
- ✅ Unlimited AI credits (own AI)
- ✅ On-premise/Own cloud
- ✅ White-label options
- ✅ Custom AI models
- ✅ SSO (Single Sign-On)
- ✅ SLA guarantee
- ✅ 24/7 dedicated support

## 🔒 Security & Encryption

### Provider API Keys
- Encrypted at rest using Fernet (symmetric encryption)
- Encryption key from `ENCRYPTION_KEY` environment variable
- Never returned in full (only preview)
- Stored in user settings table

### Aiser Platform API Keys
- Generated securely using `secrets.token_urlsafe()`
- Stored with user association
- Can be revoked/deleted

## 🚀 Next Steps / TODO

### Feature Gating to Complete
1. **API Access Endpoints**: Gate all `/api/*` endpoints (require Pro+)
2. **White-label Features**: Gate white-label customization (require Enterprise)
3. **Collaboration Features**: Gate team invites, sharing (require Team+)
4. **On-premise Features**: Gate on-premise deployment options (require Enterprise)
5. **Custom AI Models**: Gate custom model configuration (require Enterprise)
6. **SSO Configuration**: Gate SSO setup (require Enterprise)

### Frontend Feature Gating
1. Add plan-based UI restrictions (disable buttons, show upgrade prompts)
2. Show feature comparison in upgrade modals
3. Display current plan limits in usage dashboards
4. Add upgrade CTAs when limits are reached

### Testing
1. Test feature gating for each plan tier
2. Test encryption/decryption of provider API keys
3. Test AI model preference persistence
4. Test data source limit enforcement
5. Test AI credit consumption and limits

## 📝 API Endpoints Summary

### User Settings
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/preferences/ai-model` - Get AI model preference
- `PUT /users/preferences/ai-model` - Set AI model preference
- `GET /users/provider-api-keys` - Get provider API keys status
- `PUT /users/provider-api-keys` - Save provider API key
- `GET /users/api-keys` - Get Aiser platform API keys
- `POST /users/api-keys` - Create Aiser platform API key
- `DELETE /users/api-keys/{key_id}` - Delete API key

### Feature Gating
- Applied to: `/charts/generate` (requires Pro+)
- Applied to: `/data/database/connect` (checks data source limits)
- More endpoints to be gated (see TODO above)

## 🔧 Configuration

### Environment Variables
- `ENCRYPTION_KEY`: Fernet encryption key (urlsafe_base64 format) for encrypting API keys

### Database
- User settings stored in `user_settings` table
- Provider API keys stored with key pattern: `provider_api_key_{provider}`
- AI model preference stored with key: `ai_model`


