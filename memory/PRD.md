# The Dabba - Premium Tiffin Delivery Ecosystem PRD

## Original Problem Statement
Build "The Dabba" - a full-featured tiffin delivery ecosystem for both a premium website (`thadabba.ca`) and an iOS mobile app. The system includes three synchronized portals (Customer, Kitchen, Driver) with a consistent high-end UI/UX.

## User Personas
1. **Busy Professionals** - Need convenient, healthy meal subscriptions
2. **Indian Families** - Want authentic home-style Indian cooking  
3. **Food Explorers** - Interested in trying different regional Indian cuisines
4. **Kitchen Staff** - Need efficient batch preparation and order management
5. **Delivery Drivers** - Need optimized routes and delivery tracking

## Core Requirements

### Mobile App (React Native Expo)
- **Customer Portal**: Home dashboard, subscription management, meal skipping, wallet
- **Kitchen Portal**: Daily batch view, preparation lists, menu/plan management
- **Driver Portal**: Delivery list, proof of delivery, navigation integration

### Website (Premium Dark Theme)
- Landing page with subscription plans
- Interactive menu display
- Live delivery tracking with Mapbox
- Tiffin customizer

## Technical Stack
- **Frontend (Mobile)**: React Native, Expo, Expo Router
- **Frontend (Web)**: HTML, CSS, JavaScript, Mapbox GL JS
- **Backend**: FastAPI (Python)
- **Database**: In-memory Python dictionaries (Mocked - not persistent)
- **Deployment**: Expo Application Services (EAS) for iOS builds

## What's Been Implemented

### Dec 2025 - Website
- [x] Complete dark luxury theme with maroon/gold accents
- [x] Responsive mobile-first design
- [x] Interactive menu tabs (5 regional cuisines)
- [x] Tiffin customizer with tier selection
- [x] Subscription plans with CAD pricing
- [x] Calendar widget for delivery management
- [x] "Track My Dabba" Live Tracking Feature with Mapbox
- [x] Social proof testimonials
- [x] GSAP scroll animations

### Mar 2025 - Mobile App
- [x] Three-portal architecture (Customer, Kitchen, Driver)
- [x] User authentication with JWT tokens
- [x] Customer meal skipping with 24-hour cutoff
- [x] Today/Tomorrow tab system for meal management
- [x] Wallet/Trust Engine with auto-credits
- [x] Kitchen editable plans, categories, and menu items
- [x] Full 42-item menu database
- [x] Kitchen preparation list with quantity calculations
- [x] Driver delivery list with map selection (Apple/Google/Waze)
- [x] Proof of delivery photo capture
- [x] **Customer Home Page Refactor (Mar 8, 2025)**:
  - Added delivery tracking status card with progress steps
  - Removed Quick Actions from home page
  - Moved Menu/Wallet/Support links to Profile page
  - Simplified bottom tab bar to Home/Plans/Profile

## Key API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/customer/delivery-status` - Real-time delivery status
- `GET /api/kitchen/preparation-list` - Daily preparation breakdown
- `POST /api/customer/report-issue` - Issue reporting with auto-credits
- `POST /api/subscription/vacation` - Vacation mode toggle
- `POST /api/kitchen/plans` - CRUD for subscription plans

## Test Credentials
- **Customer**: `test2@dabba.com` / `test123`
- **Driver**: `driver@dabba.com` / `driver123`  
- **Kitchen Admin**: `kitchen@dabba.com` / `kitchen123`

## Prioritized Backlog

### P0 - Critical
- [ ] iOS TestFlight verification (Build 1.1.0 - user needs to test)

### P1 - High Priority
- [ ] "Greatest App" polish - fluid animations, micro-interactions
- [ ] Driver smart routing (GPS-based sorting)
- [ ] Driver live location sharing

### P2 - Medium Priority
- [ ] Backend refactoring (break down monolithic server.py)
- [ ] MongoDB integration (replace in-memory mock DB)
- [ ] Payment integration (Stripe/Apple Pay)
- [ ] 3D Tiffin Customizer with Three.js

### P3 - Nice to Have
- [ ] Domain setup (`thadabba.ca` - GoDaddy parked page issue)
- [ ] Instagram/Google Reviews API integration
- [ ] PWA support
- [ ] Push notifications

## Known Issues
1. **iOS Build Process**: User finds TestFlight workflow confusing
2. **Website Domain**: `thedabba.ca` shows GoDaddy parked page (user needs to contact GoDaddy)
3. **Backend**: Monolithic server.py file (~1000+ lines) needs refactoring
4. **Database**: In-memory mock DB - data not persistent across restarts

## URLs
- Preview: https://delivery-test-2.preview.emergentagent.com/
- Target domain: thadabba.ca (not yet configured)
