# The Dabba - Premium Tiffin Delivery Ecosystem PRD

## Original Problem Statement
Build "The Dabba" - Nova Scotia's most competitive premium tiffin delivery app with AI-powered customer support, intelligent planning, and Halifax localization. Now evolving into a **Self-Evolving Logistics Ecosystem**.

## Current Build
- **Version**: 2.0.0
- **Build Number**: 17
- **Status**: PHASE 1 COMPLETE - Real-time Infrastructure

## What's Been Implemented

### 🚀 Phase 1: Self-Evolving Logistics Foundation (Mar 11, 2025)

#### Real-Time WebSocket Infrastructure
- **WebSocket Manager**: Full duplex communication at `/ws/{role}/{user_id}`
- **< 1 second latency**: Status changes propagate instantly across all portals
- **Auto-reconnect**: Exponential backoff with 5 retry attempts
- **Ping/pong keep-alive**: 30-second heartbeat

#### Dynamic Skip-Logic with Reindexing
- **Recursive Re-indexing**: When User #7 skips, User #8 becomes #7, etc.
- **Perfect sequences**: No gaps in delivery sequence (1, 2, 3...)
- **Instant propagation**: Kitchen Prep List, Driver Manifest, Print Labels all sync
- **Auto-credit**: $12 CAD credited to wallet on skip

#### Driver Full Manifest
- **No list capping**: Full daily route displayed
- **Real-time GPS distance**: Haversine formula calculates km
- **Live ETA**: `ETA = Current_Time + (Distance/Avg_Speed) + Buffer`
- **Cumulative routing**: Each stop updates position for next calculation

#### Kitchen Clean Manifest
- **NO PRICES**: Pure logistics view (no $ amounts)
- **Plan filters**: Toggle Daily/Weekly/Monthly subscriptions
- **Dabba Ready**: Check-in system syncs to Driver instantly

#### Performance Metrics & Self-Learning
- **Delivery logging**: Predicted vs Actual time recorded
- **15% delay detection**: Auto-generates route suggestions
- **Route optimization**: AI suggests earlier start times

### API Endpoints Added
```
WebSocket: /ws/{role}/{user_id}
GET  /api/driver/full-manifest - Full route with GPS & ETA
POST /api/driver/delivery/{id}/complete - Complete with photo
POST /api/subscription/skip-with-reindex - Skip + reindex sequence
GET  /api/kitchen/clean-manifest - No-price logistics view
POST /api/kitchen/mark-dabba-ready/{id} - Sync to drivers
POST /api/metrics/delivery-completed - Log for AI learning
GET  /api/admin/route-suggestions - AI optimization suggestions
```

## Remaining Phases

### Phase 2: Driver Portal UI Overhaul
- [ ] Full route manifest UI (remove "Next 3" cap)
- [ ] Live distance/ETA display per stop
- [ ] Delivery photo capture with instant sync
- [ ] Proof-of-delivery gallery for customers

### Phase 3: Security & Intelligence
- [ ] 2FA onboarding (Email + SMS OTP via Twilio)
- [ ] Ghost user prevention (inactive until verified)
- [ ] Nightly maintenance scripts (12:00 AM)
- [ ] Business Intelligence reports
- [ ] 1% daily accuracy improvement tracking

## Architecture
```
/app
├── backend/
│   ├── server.py (~3300 lines)
│   │   ├── WebSocket Manager (ConnectionManager class)
│   │   ├── Dynamic Indexing Engine (reindex_delivery_sequence)
│   │   ├── GPS/ETA Calculations (Haversine)
│   │   └── Performance Metrics logging
│   └── .env
├── frontend/
│   ├── src/services/
│   │   ├── api.ts (enhanced with new APIs)
│   │   └── realtime.ts (NEW - WebSocket client)
│   ├── app/
│   │   ├── (customer)/ - Customer Portal
│   │   ├── (kitchen)/ - Kitchen Portal
│   │   └── (driver)/ - Driver Portal
```

## Test Credentials
- **Customer**: `test2@dabba.com` / `test123`
- **Kitchen**: `kitchen@dabba.com` / `kitchen123`
- **Driver**: `driver@dabba.com` / `driver123`

## URLs
- Preview: https://halifax-meal-planner.preview.emergentagent.com/
- WebSocket: wss://halifax-meal-planner.preview.emergentagent.com/ws/{role}/{user_id}
