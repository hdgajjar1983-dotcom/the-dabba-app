# Tha Dabba - Premium Tiffin Website PRD

## Original Problem Statement
Build "The Greatest Tiffin Website on Earth" for `thadabba.ca` - A premium, dark-themed tiffin delivery website for Halifax, Nova Scotia.

## User Personas
1. **Busy Professionals** - Need convenient, healthy meal subscriptions
2. **Indian Families** - Want authentic home-style Indian cooking
3. **Food Explorers** - Interested in trying different regional Indian cuisines

## Core Requirements

### Visual Design ✅
- **Dark Mode** aesthetic with:
  - Charcoal background (#121212)
  - Deep Saffron accents (#FF9933)
  - Brushed Gold highlights (#D4AF37)
- Elegant typography (Playfair Display headings, Manrope body)
- Noise texture overlay for premium feel
- Glass morphism effects on navigation

### Sections Implemented ✅
1. **Hero Section** - Premium landing with animated badges, stats (500+ families, 15+ cuisines, 99% on-time)
2. **Menu Section** - Daily rotating menus (Mon-Fri, 5 regional cuisines) with macro-nutrient info
3. **Tiffin Customizer** - Interactive 3-4 tier selection with food choices
4. **Subscription Plans** - Daily ($14.99), Weekly ($12.99), Monthly ($10.99)
5. **Calendar Widget** - Delivery schedule management
6. **Delivery Map** - Halifax, Bedford, Dartmouth coverage areas
7. **Testimonials** - Social proof with Google/Instagram reviews
8. **About Section** - Company heritage story
9. **Footer** - Navigation, social links, certifications

### Technical Stack
- **Frontend**: Static HTML/CSS/JavaScript
- **Animations**: GSAP + ScrollTrigger
- **Icons**: Lucide Icons
- **Hosting**: Served via Expo's public folder

## Service Areas
- Halifax (30 min delivery)
- Bedford (40 min delivery)
- Dartmouth (35 min delivery)

## What's Been Implemented (Dec 2025)
- [x] Complete dark luxury theme
- [x] Responsive mobile-first design
- [x] Interactive menu tabs (5 regional cuisines)
- [x] Tiffin customizer with tier selection
- [x] Subscription plans with pricing
- [x] Calendar widget for delivery management
- [x] **"Track My Dabba" Live Tracking Feature** (NEW!)
  - Mapbox GL JS integration with dark theme
  - Animated delivery route visualization
  - Real-time driver marker movement
  - ETA countdown that updates dynamically
  - Delivery journey timeline
  - Driver info card with call button
  - Demo mode for showcasing
- [x] Social proof testimonials
- [x] GSAP scroll animations
- [x] Mobile menu functionality

## Prioritized Backlog

### P0 - Critical
- [ ] iOS App Store submission (BLOCKED - waiting on Emergent Support for credential upload)

### P1 - High Priority
- [ ] Real Three.js 3D Tiffin Customizer (currently CSS-based placeholder)
- [ ] Payment integration (Stripe, Apple Pay, Google Pay, Interac)
- [ ] Connect tracking to real driver GPS data via WebSocket

### P2 - Medium Priority  
- [ ] Instagram/Google Reviews API integration for live social proof
- [ ] User authentication and order history
- [ ] Admin dashboard for menu management

### P3 - Nice to Have
- [ ] PWA support for mobile app-like experience
- [ ] Push notifications for delivery updates
- [ ] Referral program

## Known Issues
1. **iOS Build BLOCKED** - Revoked certificate, waiting on Emergent Support
2. **Website domain** - `thedabba.ca` shows GoDaddy parked page (user needs to contact GoDaddy)

## Credentials
- Customer test: `test2@dabba.com` / `test123`
- Driver test: `driver@dabba.com` / `driver123`
- Kitchen test: `kitchen@dabba.com` / `kitchen123`

## URLs
- Preview: https://delivery-test-2.preview.emergentagent.com/
- Target domain: thadabba.ca (not yet configured)
