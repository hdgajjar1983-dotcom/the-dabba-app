# The Dabba - Premium Tiffin Delivery Ecosystem PRD

## Original Problem Statement
Build "The Dabba" - a premium tiffin delivery iOS app for the Halifax market. Three portals (Customer, Kitchen, Driver) with modular menu building, Halifax logistics, and CAD currency.

## What's Been Implemented (Latest Update)

### System Refinement - Halifax Localization (Mar 8, 2025)

**1. Modular "Meal Builder" (Kitchen Portal)**
- [x] Category-Based Menu: Roti, Sabji, Dal, Rice, Salad, Extra
- [x] Multi-Select Logic: Kitchen admin taps to select multiple items for "Today's Dinner"
- [x] New `/kitchen/menu` page with category tabs and tap-to-select chips
- [x] Changed all "Lunch" references to "Dinner"

**2. Manage Dabba & Pricing**
- [x] Removed pricing from dish/recipe management (prices at subscription level)
- [x] Added `quantity_per_tiffin` and `unit` fields for prep calculations
- [x] Currency set to CAD ($)

**3. Halifax Test Data**
- [x] 10 test customers with real Halifax addresses:
  - 1505 Barrington St, Halifax
  - 6299 Quinpool Rd, Halifax
  - 210 Chain Lake Dr, Halifax
  - 5670 Spring Garden Rd, Halifax
  - 1595 Bedford Hwy, Bedford
  - 90 Alderney Dr, Dartmouth
  - 7001 Mumford Rd, Halifax
  - 1969 Upper Water St, Halifax
  - 3280 Kempt Rd, Halifax
  - 1000 Micmac Blvd, Dartmouth
- [x] Seeding endpoint: `POST /api/kitchen/seed-halifax-data`

**4. Modular Prep List**
- [x] New `/api/kitchen/modular-prep-list` endpoint
- [x] Calculates totals by category (e.g., "Total Rotis: 150", "Total Sabji: 10kg")
- [x] Based on modular menu items selected for the day

**5. Credit System Logic**
- [x] Automatic credit deductions on failed deliveries
- [x] `PUT /driver/fail-delivery/{id}` credits customer wallet $12 CAD
- [x] Kitchen payout deductions tracked separately

**6. Default Dishes Seeded**
- Roti: Butter Roti (3 pcs), Plain Chapati (3 pcs), Garlic Naan (2 pcs), Paratha (2 pcs)
- Sabji: Paneer Tikka Masala (150g), Aloo Gobi (150g), Bhindi Masala (120g), Mixed Veg (150g), Palak Paneer (150g)
- Dal: Tadka Dal (150ml), Dal Makhani (150ml), Chana Dal (150ml)
- Rice: Jeera Rice (150g), Plain Rice (150g), Veg Pulao (180g)
- Salad: Kachumber (50g), Green Salad (50g), Raita (80ml)
- Extra: Papad (1 pc), Pickle (15g), Gulab Jamun (2 pcs)

## API Endpoints

### New Endpoints
- `POST /api/kitchen/seed-halifax-data` - Seed Halifax test data
- `GET /api/kitchen/modular-prep-list` - Get detailed prep breakdown
- `PUT /api/driver/fail-delivery/{id}` - Mark delivery failed, auto-credit customer

### Updated Endpoints
- `POST /api/kitchen/menu` - Now accepts `dinner_item_ids: string[]` for multi-select
- `GET /api/kitchen/menu` - Returns `dishes_by_category` and `categories`

## Test Credentials
- **Customer**: `test2@dabba.com` / `test123`
- **Kitchen**: `kitchen@dabba.com` / `kitchen123`
- **Driver**: `driver@dabba.com` / `driver123`
- **Halifax Test Customers**: `priya@test.com`, `raj@test.com`, etc. / `test123`

## Current Build
- **Version**: 1.1.0
- **Build Number**: 13

## Remaining Tasks

### P1 - High Priority
- [ ] Driver Portal: Slide-to-Deliver fix with smooth haptic
- [ ] Driver Portal: Smart routing with Halifax addresses
- [ ] Kitchen Home: Visual overhaul with "Live Pulse" animation
- [ ] Dishes page: Update to use categories, remove price fields

### P2 - Medium Priority
- [ ] Backend refactoring to MongoDB
- [ ] Payment integration (Stripe)
- [ ] Production deployment for 24/7 access

## Known Issues
1. App only works when Emergent session is active (needs production deployment)
2. Backend uses in-memory mock DB (data resets on restart)
