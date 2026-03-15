# The Dabba - Product Requirements Document

## Original Problem Statement
Build a full-featured tiffin delivery ecosystem named "The Dabba" for thadabba.ca and an iOS mobile app. System requires three synchronized portals (Customer, Kitchen, Driver) with a high-end, dark-themed UI/UX, real-time WebSocket updates, AI-powered features, and a credit-based wallet system.

## Architecture
- **Frontend**: React Native (Expo) with Expo Router
- **Backend**: FastAPI (Python) - monolithic server.py
- **Database**: MongoDB Atlas
- **Deployment**: Render.com (backend), EAS Build (iOS)
- **AI/LLM**: OpenAI GPT-5.2 via openai SDK

## What's Been Implemented

### Backend (server.py)
- Full auth system (JWT-based login/register for customer, kitchen, driver roles)
- Kitchen Portal APIs: dashboard, dishes CRUD, categories CRUD, plans CRUD (with plan_type: daily/weekly/yearly), menu management, preparation list, customer management, orders, batch totals, modular prep list
- Driver Portal APIs: optimized route, delivery status updates, location tracking
- Customer Portal APIs: subscriptions, meal skipping with credits, meal planner, preferences, ratings, wallet
- WebSocket endpoints for real-time updates
- Driver location tracking endpoint for kitchen (/kitchen/driver-locations)
- Root /health endpoint for Render deployment compatibility
- AI chatbot endpoint

### Frontend (React Native/Expo)
- Three portal layout with tab navigation (Customer, Kitchen, Driver)
- Kitchen Portal: Dashboard, Items management, Dabba builder, Plans (with daily/weekly/yearly), Prep list, Customers, Orders
- Driver Portal: Delivery manifest, route optimization, location tracking
- Customer Portal: Meal planner, subscriptions, wallet, ratings
- Landing website (static HTML) served by backend

### Recent Changes (March 15, 2026)
- **Terminology**: "Dabba" -> "Item" (for dishes), "Menu" -> "Dabba" (for daily meal set)
- **Plans**: Added plan_type field (daily/weekly/yearly) with filter tabs
- **Dal quantity**: Updated from 227g to 340g (12oz) per portion
- **Roti default**: Updated from 4 to 6 per tiffin
- **Prep list**: Now shows plan_type badge, skip activity (total_skips, recent_skips)
- **Quick Actions**: Redesigned as vertical list (was grid), added Track Driver and Customers
- **Items management**: Added category selector and quantity-per-tiffin fields
- **Driver locations**: New /kitchen/driver-locations API for kitchen tracking
- **Health endpoint**: Added root /health for Render deployment
- **Backend**: requirements.txt cleaned (no litellm, no emergentintegrations)

## Key Credentials
- Customer: test2@dabba.com / test123
- Driver: driver@dabba.com / driver123
- Kitchen: kitchen@dabba.com / kitchen123

## Deployment Status
- Backend on Render: Previously failing (litellm issue). Now cleaned up and ready for deployment.
- iOS app: Pending Render fix for App Store submission

## P0 Issues
- Render deployment needs "Clear build cache & deploy" after pushing clean code
- MongoDB Atlas connection string: mongodb+srv://thedabba:Hiya%40143@cluster0.zmy7dzw.mongodb.net/thedabba?retryWrites=true&w=majority

## P1 Upcoming Tasks
- Connect frontend to WebSocket endpoints for real-time updates
- Implement 2FA (Email + SMS) for new customer sign-ups
- Fix Driver Portal "Slide-to-Deliver" bug

## P2 Future Tasks
- Refactor server.py into proper FastAPI project structure (routers, models, services)
- Implement "Self-Evolving Brain" nightly maintenance script
- Stripe payment integration
- Go live on thadabba.ca (GoDaddy DNS)
