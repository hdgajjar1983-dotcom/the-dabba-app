# The Dabba - Premium Tiffin Delivery Ecosystem PRD

## Original Problem Statement
Build "The Dabba" - Nova Scotia's most competitive premium tiffin delivery app with AI-powered customer support, intelligent planning, and Halifax localization.

## Current Build
- **Version**: 1.1.0
- **Build Number**: 16
- **Status**: COMPLETE ECOSYSTEM

## What's Been Implemented

### 🤖 Tiffin Concierge AI Chatbot (Mar 10, 2025)
- **Powered by**: GPT-5.2 via Emergent LLM Key
- **Personality**: Friendly Halifax-based assistant
- **Capabilities**:
  - [x] Check wallet balance
  - [x] Skip meals with confirmation
  - [x] Update spice preferences (mild/medium/spicy)
  - [x] Track deliveries in real-time
  - [x] Weather-aware responses
  - [x] Human handover escalation
  - [x] Menu knowledge base
- **UI**: Floating chat button (🍱) on Customer Portal
- **Quick Actions**: Track food, Skip tomorrow, Check wallet, Spice complaints

### Previous Implementations
- 7-Day Dinner Discovery slider
- Halifax Weather Alerts (normal/caution/warning/severe)
- Spice Level preferences
- Add-on Marketplace (8 items: Lassi, Gulab Jamun, Samosa, etc.)
- "Rate My Dinner" emoji feedback
- Ingredient Forecast for Kitchen
- Modular Meal Builder
- Halifax Test Data (10 addresses)
- Credit System with auto-deductions
- Premium animations and haptics

## API Endpoints

### AI Chatbot APIs
```
POST /api/chat/concierge      - Chat with Tiffin Concierge AI
GET  /api/chat/history        - Get user's chat history
GET  /api/kitchen/quality-alerts - AI-summarized customer feedback
GET  /api/menu/knowledge-base - Full menu for AI knowledge base
```

## Test Credentials
- **Customer**: `test2@dabba.com` / `test123`
- **Kitchen**: `kitchen@dabba.com` / `kitchen123`
- **Driver**: `driver@dabba.com` / `driver123`

## Architecture
```
/app
├── backend/
│   ├── .env (includes EMERGENT_LLM_KEY)
│   └── server.py (~3000 lines - needs refactoring)
├── frontend/
│   ├── app/
│   │   ├── (customer)/ - Customer Portal
│   │   ├── (kitchen)/ - Kitchen Portal  
│   │   ├── (driver)/ - Driver Portal
│   │   └── components/
│   │       └── TiffinConcierge.tsx - AI Chatbot Widget
│   └── src/services/api.ts
```

## Why This Is "The Greatest App"

1. **Immediate Resolution**: Customers can skip meals at 2 AM via AI
2. **Personalized Service**: AI remembers spice levels and past ratings
3. **Proactive Problem Solving**: Weather awareness manages expectations
4. **Quality Loop**: Bad ratings auto-trigger Kitchen alerts

## Remaining Work

### P1 - High Priority
- [ ] iOS Certificate renewal (Apple Developer Portal)
- [ ] Driver slide-to-deliver animation
- [ ] Website integration of chat widget

### P2 - Medium Priority
- [ ] Production deployment for 24/7 access
- [ ] Backend refactoring (break down server.py)
- [ ] MongoDB persistent storage

## URLs
- Preview: https://delivery-test-2.preview.emergentagent.com/
- Target domain: thadabba.ca
