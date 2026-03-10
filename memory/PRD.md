# The Dabba - Premium Tiffin Delivery Ecosystem PRD

## Original Problem Statement
Build "The Dabba" - Nova Scotia's most competitive premium tiffin delivery app with AI-powered customer support, intelligent planning, and Halifax localization.

## Current Build
- **Version**: 1.2.0
- **Build Number**: 16
- **Status**: COMPLETE ECOSYSTEM + UI/UX REVISIONS

## What's Been Implemented

### 🎨 UI/UX Revisions (Mar 10, 2025)

#### Kitchen Portal Redesign
- **Hero Card**: Premium gradient card showing today's orders with animated counter and progress bar
- **Stats Row**: 3 mini stat cards (Customers, Active Plans, Dishes) with color-coded icons
- **Quick Actions**: 2x2 grid with Add Dish, Set Menu, Plans, Orders
- **New Plans Page**: Full CRUD for subscription plans with inline editing
  - Edit plan name, price, description inline
  - Toggle active/inactive status
  - Delete with confirmation
  - Add new plan modal

#### Customer Portal Menu Display
- **MenuItemCard Component**: Beautiful card for each menu item with:
  - Category icon (roti, sabji, dal, rice, salad, extra)
  - Color-coded backgrounds per category
  - Item name and quantity badge
- **Quick Stats Bar**: Shows totals by category at bottom of each day
- **Date Circle**: Enhanced date display with day/month

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
- **UI**: Floating chat button on Customer Portal
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

### Kitchen Plans APIs
```
GET  /api/kitchen/plans       - Get all subscription plans
POST /api/kitchen/plans       - Create new plan
PUT  /api/kitchen/plans/{id}  - Update plan (name, price, description)
DELETE /api/kitchen/plans/{id} - Delete plan
```

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
│   │   │   └── index.tsx (MenuItemCard, DayCard components)
│   │   ├── (kitchen)/ - Kitchen Portal  
│   │   │   ├── index.tsx (Hero card, redesigned home)
│   │   │   └── plans.tsx (NEW - Plan management page)
│   │   ├── (driver)/ - Driver Portal
│   │   └── components/
│   │       └── TiffinConcierge.tsx - AI Chatbot Widget
│   └── src/services/api.ts
```

## Remaining Work

### P1 - High Priority
- [x] Kitchen Portal UI redesign ✅
- [x] Kitchen Plans editing page ✅
- [x] Customer menu beautiful display ✅
- [ ] iOS Certificate renewal (Apple Developer Portal)
- [ ] Driver slide-to-deliver animation fix

### P2 - Medium Priority
- [ ] Production deployment for 24/7 access
- [ ] Backend refactoring (break down server.py)
- [ ] MongoDB persistent storage
- [ ] Website integration of chat widget

## URLs
- Preview: https://halifax-meal-planner.preview.emergentagent.com/
- Target domain: thadabba.ca
