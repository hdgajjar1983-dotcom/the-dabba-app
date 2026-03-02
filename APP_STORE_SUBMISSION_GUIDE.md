# 📱 The Dabba - App Store Submission Guide

## 🍎 APP STORE CONNECT INFORMATION

### Basic Information
| Field | Value |
|-------|-------|
| **App Name** | The Dabba |
| **Subtitle** | Gujarati Ghar Ka Swad |
| **Bundle ID** | com.thedabba.app |
| **SKU** | THEDABBA2024 |
| **Primary Language** | English (U.S.) |
| **Category** | Food & Drink |
| **Secondary Category** | Lifestyle |
| **Content Rights** | Does not contain third-party content |

---

## 📝 APP DESCRIPTION (Copy this)

### Short Description (Promotional Text - 170 chars)
```
Fresh homestyle Gujarati meals delivered daily to your doorstep. Subscribe, skip meals, earn credits. Authentic taste, modern convenience. 🍲
```

### Full Description (4000 chars max)
```
The Dabba brings the authentic taste of Gujarati home cooking straight to your doorstep. Experience the warmth of traditional homestyle meals prepared with love, just like Maa's kitchen.

🍲 WHAT WE OFFER:
• Daily fresh Gujarati thali delivered to your home
• Authentic recipes passed down through generations
• Premium quality ingredients
• Vegetarian options available

📱 APP FEATURES:

FOR CUSTOMERS:
• Easy subscription plans (Weekly/Monthly)
• View today's menu with detailed descriptions
• Skip meals anytime and earn wallet credits
• Track your delivery in real-time
• Wallet system for credits and payments
• Simple profile management

FOR DRIVERS:
• Uber-style delivery interface
• One delivery at a time view
• GPS-based route optimization
• Photo proof of delivery
• Easy customer contact

FOR KITCHEN:
• Complete menu management
• Add, edit, delete dishes
• Set weekly menu schedule
• View all customers and orders
• Track daily deliveries

🏆 WHY CHOOSE THE DABBA:
• Fresh meals prepared daily
• No preservatives or artificial flavors
• Flexible subscription options
• Skip anytime, no questions asked
• Earn credits when you skip
• Traditional Gujarati recipes

🍛 POPULAR DISHES:
• Dal Tadka with Jeera Rice
• Paneer Butter Masala with Naan
• Undhiyu - Traditional Gujarati Delicacy
• Gujarati Kadhi with Rice
• Dhokla Chaat with Chutneys
• And many more authentic dishes!

📍 DELIVERY AREAS:
Currently serving select areas. Check app for availability.

💬 CONTACT US:
Have questions? Reach out through the app's support section.

Download The Dabba today and taste the difference of real Gujarati home cooking!

~ Ghar Ka Swad, Roz ~
```

---

## 🔑 KEYWORDS (100 chars max)
```
gujarati,tiffin,dabba,food delivery,indian food,homemade,thali,meal subscription,vegetarian,lunch
```

---

## 🔒 PRIVACY POLICY URL
```
https://dabba-driver-portal.preview.emergentagent.com/privacy
```
(In-app page created - also available as HTML at /assets/legal/privacy-policy.html)

## 📞 SUPPORT URL
```
https://dabba-driver-portal.preview.emergentagent.com/support
```
(In-app page created - also available as HTML at /assets/legal/support.html)

---

## 📸 SCREENSHOTS REQUIRED

### iPhone 6.5" Display (Required - 1290 x 2796 pixels)
You need **3-10 screenshots**. Recommended order:

1. **Login Screen** - Shows the beautiful royal logo
2. **Customer Dashboard** - Today's thali with meal details
3. **Kitchen Portal** - Admin dashboard view
4. **Driver Portal** - Delivery management interface
5. **Menu Screen** - Weekly menu display

### Screenshot Captions (Add in App Store Connect):
1. "Traditional Gujarati meals delivered daily"
2. "View today's fresh thali menu"
3. "Manage your kitchen with ease"
4. "Efficient delivery management"
5. "Browse the weekly menu"

---

## 🎬 APP PREVIEW VIDEO (Optional)
- 15-30 seconds
- Show: Login → Dashboard → Menu → Order flow
- Resolution: 1290 x 2796 (6.5")

---

## ⭐ APP STORE RATING

### Age Rating Questionnaire Answers:
| Question | Answer |
|----------|--------|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content or Nudity | None |
| Profanity or Crude Humor | None |
| Alcohol, Tobacco, or Drug Use | None |
| Simulated Gambling | None |
| Horror/Fear Themes | None |
| Mature/Suggestive Themes | None |
| Medical/Treatment Information | None |
| Unrestricted Web Access | No |

**Result: Rated 4+**

---

## 📋 APP REVIEW INFORMATION

### Demo Account Credentials:
| Role | Email | Password |
|------|-------|----------|
| Customer | test2@dabba.com | test123 |
| Driver | driver@dabba.com | driver123 |
| Kitchen | kitchen@dabba.com | kitchen123 |

### Review Notes:
```
This is a food delivery app for Gujarati homestyle meals.

To test Customer features:
- Login with: test2@dabba.com / test123
- View today's menu on dashboard
- Check weekly menu tab
- View wallet credits

To test Driver features:
- Login with: driver@dabba.com / driver123
- View delivery dashboard
- See delivery status

To test Kitchen Admin features:
- Login with: kitchen@dabba.com / kitchen123
- View admin dashboard
- Manage dishes and menu

Note: This is a subscription-based meal delivery service for the Indian market.
```

---

## 🔧 BUILD CONFIGURATION

### Version Information:
| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Build Number | 1 |
| Minimum iOS | 13.0 |

### Capabilities Required:
- ✅ Camera (for delivery photo proof)
- ✅ Location (for delivery routing)
- ✅ Push Notifications (optional)

---

## 🚀 SUBMISSION STEPS

### On Your Windows Machine:

1. **Install EAS CLI** (if not done):
```bash
npm install -g eas-cli
eas login
```

2. **Update eas.json** with your Apple credentials:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID_EMAIL",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```

3. **Build for iOS**:
```bash
cd frontend
eas build --platform ios --profile production
```

4. **Submit to App Store**:
```bash
eas submit --platform ios
```

5. **In App Store Connect**:
- Add screenshots
- Fill in description
- Set pricing (Free)
- Submit for review

---

## 📱 APP ICON CHECKLIST
- ✅ 1024x1024 App Store icon created
- ✅ All iOS icon sizes generated
- ✅ No alpha/transparency
- ✅ Royal Gujarati theme (Maroon + Gold)

---

## 💰 PRICING
- **Price**: Free
- **In-App Purchases**: None (currently)

---

## 🌍 AVAILABILITY
- **Countries**: All countries or select India only
- **Release Date**: Immediate upon approval

---

Good luck with your App Store submission! 🎉
