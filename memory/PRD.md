# The Dabba - Premium Tiffin Delivery Ecosystem PRD

## Original Problem Statement
Build "The Dabba" - Nova Scotia's most competitive premium tiffin delivery app with intelligent features for Halifax market. Three-portal iOS app (Customer, Kitchen, Driver) with 7-day meal planning, weather alerts, and predictive kitchen intelligence.

## What's Been Implemented

### Platinum Tiffin Upgrade (Mar 10, 2025)

**1. 7-Day "Dinner Discovery" (Customer Portal)**
- [x] Horizontal date slider showing next 7 days
- [x] Modular visibility: Shows selected items (3x Butter Roti, Mixed Veg, etc.)
- [x] One-Tap Skip: Issues CAD credit instantly
- [x] Add-on Marketplace: Customers can add extras (Lassi, Gulab Jamun, etc.) for CAD fee
- [x] Skip cutoff logic: 24 hours before 4 PM delivery

**2. Proactive Customer Features**
- [x] Spice Level Preference Profile (Mild/Medium/Spicy)
- [x] "Rate My Dinner" emoji feedback (😋/👍/👎)
- [x] Automatic follow-up question on bad ratings
- [x] Halifax Weather Integration banner
  - Normal: "Deliveries running on schedule"
  - Caution: "Light snow: Deliveries may be delayed 15-30 mins"
  - Warning: "Heavy snow: Deliveries delayed 30-60 mins"
  - Severe: "Blizzard warning: All deliveries cancelled"

**3. Kitchen Intelligence**
- [x] Ingredient Forecast API: 7-day procurement list based on menu + subscriptions
- [x] Customer Preferences API: Spice levels for all customers on prep list
- [x] Meal Ratings Dashboard: View customer satisfaction metrics
- [x] Weather Status Control: Kitchen can set weather alerts

**4. Add-On Marketplace Items (CAD)**
- Cold Mango Lassi: $4.99
- Sweet Lassi: $3.99
- Masala Chai: $2.99
- Extra Gulab Jamun (2pc): $3.99
- Rasmalai (2pc): $4.99
- Samosa (2pc): $3.49
- Extra Roti (3pc): $2.99
- Papad Pack: $1.99

### Previous Implementations
- Modular Meal Builder (Kitchen)
- Halifax Test Data (10 addresses)
- Credit System with auto-deductions
- Premium animations and haptics
- 42-item categorized menu database

## API Endpoints

### Platinum Tiffin APIs
```
GET  /api/customer/weekly-plan       - 7-day dinner plan with skip status
GET  /api/customer/preferences       - Get spice level preference
PUT  /api/customer/preferences       - Update spice preference
POST /api/customer/rate-meal         - Submit meal rating
POST /api/customer/add-extra         - Add extra item to a day
GET  /api/weather-status             - Halifax weather/delivery status
PUT  /api/kitchen/weather-status     - Set weather alert (Kitchen)
GET  /api/extras                     - Available add-on items
GET  /api/kitchen/ingredient-forecast - 7-day procurement list
GET  /api/kitchen/customer-preferences - All customer spice levels
GET  /api/kitchen/meal-ratings       - Meal satisfaction metrics
```

## Test Credentials
- **Customer**: `test2@dabba.com` / `test123`
- **Kitchen**: `kitchen@dabba.com` / `kitchen123`
- **Driver**: `driver@dabba.com` / `driver123`

## Current Build
- **Version**: 1.1.0
- **Build Number**: 14

## Remaining Tasks

### P1 - High Priority
- [ ] Driver Portal: Slide-to-Deliver with success animation + haptic
- [ ] Kitchen Home: Dark Mode option
- [ ] Kitchen: High-quality category icons

### P2 - Medium Priority
- [ ] Geo-fencing: Smart route within HRM boundaries
- [ ] Production deployment (Railway/Render)
- [ ] MongoDB integration

## Why These Features Make It "Great"
1. **Weather Alerts**: Halifax winters are harsh - proactive alerts build trust
2. **Spice Preferences**: Personalized service without extra work
3. **Ingredient Forecast**: Prevents over-buying groceries (major cost savings)
4. **7-Day Planning**: Customers can plan ahead, reduce last-minute skips

## URLs
- Preview: https://delivery-test-2.preview.emergentagent.com/
- Target domain: thadabba.ca
