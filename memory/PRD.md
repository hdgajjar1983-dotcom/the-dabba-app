# The Dabba - Premium Tiffin Delivery Ecosystem PRD

## Original Problem Statement
Build "The Dabba" - the greatest tiffin delivery app for iOS. A full-featured ecosystem with Customer, Kitchen, and Driver portals featuring premium animations, haptic feedback, and exceptional UI/UX.

## User Personas
1. **Busy Professionals** - Need convenient, healthy meal subscriptions
2. **Indian Families** - Want authentic home-style Indian cooking  
3. **Kitchen Staff** - Need efficient batch preparation and order management
4. **Delivery Drivers** - Need optimized routes and delivery tracking

## Technical Stack
- **Frontend (Mobile)**: React Native, Expo, Expo Router, React Native Reanimated, Expo Haptics
- **Frontend (Web)**: HTML, CSS, JavaScript, Mapbox GL JS
- **Backend**: FastAPI (Python)
- **Database**: In-memory Python dictionaries (Mocked - not persistent)
- **Deployment**: Expo Application Services (EAS) for iOS builds

## What's Been Implemented

### Mar 8, 2025 - "Greatest App" Polish
- [x] **Animated Components Library** (`/app/frontend/src/components/AnimatedComponents.tsx`)
  - AnimatedCard with stagger effects
  - PulsingDot for status indicators
  - AnimatedProgress bars
  - AnimatedCounter for stats
  - Skeleton loading states
  - AnimatedButton with haptic feedback
  - SuccessCheckmark animation
  - FloatingActionButton

- [x] **Enhanced Customer Portal**
  - Smooth entrance animations on all cards
  - Staggered reveal for content
  - Haptic feedback on all interactions
  - Animated delivery tracking progress
  - PulsingDot on active subscription status
  - Skeleton loading state
  - Tab animations for Today/Tomorrow

- [x] **Enhanced Kitchen Portal**
  - Animated stat cards with counters
  - Progress bar for delivery completion
  - Staggered quick action cards
  - PulsingDot on pending deliveries
  - Haptic feedback throughout

- [x] **Enhanced Login Screen**
  - Smooth entrance animations
  - Button press animations with scale
  - Error shake animation
  - Demo credentials quick-fill buttons
  - Haptic feedback on all interactions

- [x] **Enhanced Profile Screen**
  - Animated menu items
  - Staggered reveal
  - Quick link cards with scale animation

### Previous Implementations
- [x] Delivery tracking card on Customer home
- [x] Quick Actions moved to Profile (Menu/Wallet/Support)
- [x] Premium dark-themed website with Mapbox tracking
- [x] Wallet/Trust Engine with auto-credits
- [x] Kitchen editable plans, categories, menu
- [x] Full 42-item menu database
- [x] Driver delivery with map selection

## Key API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/customer/delivery-status` - Real-time delivery status
- `GET /api/kitchen/dashboard` - Kitchen stats
- `GET /api/kitchen/preparation-list` - Daily prep breakdown

## Test Credentials
- **Customer**: `test2@dabba.com` / `test123`
- **Driver**: `driver@dabba.com` / `driver123`  
- **Kitchen Admin**: `kitchen@dabba.com` / `kitchen123`

## Current Build
- **Version**: 1.1.0
- **Build Number**: 12
- **Bundle ID**: com.thedabba.app

## Prioritized Backlog

### P0 - Critical
- [ ] User to test iOS build 1.1.0 (12) on TestFlight

### P1 - High Priority
- [ ] Driver portal animations polish
- [ ] Driver smart routing (GPS-based sorting)
- [ ] Driver live location sharing

### P2 - Medium Priority
- [ ] Backend refactoring (break down monolithic server.py)
- [ ] MongoDB integration (replace in-memory mock DB)
- [ ] Payment integration (Stripe/Apple Pay)

### P3 - Nice to Have
- [ ] Domain setup (`thadabba.ca`)
- [ ] 3D Tiffin Customizer with Three.js
- [ ] Push notifications

## Known Issues
1. Backend uses in-memory mock DB - data not persistent
2. Website domain shows GoDaddy parked page

## URLs
- Preview: https://delivery-test-2.preview.emergentagent.com/
- Target domain: thadabba.ca
