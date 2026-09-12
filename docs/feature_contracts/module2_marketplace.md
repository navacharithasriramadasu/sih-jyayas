# 🍅 Frontend Feature Contract - Module 2: Produce Marketplace & Matching

This document is the **Feature Contract** between the Backend and Frontend for the Produce Marketplace Module.

## 📱 Feature Overview
This module handles the core B2B agricultural transaction. 
1. **Farmers** use it to list their harvested crops for sale (`ProduceInventory`).
2. **Bulk Buyers** (Restaurants/FPOs) use it to post their requirements (`BuyerRequirement`).
3. The Backend automatically matches them.

---

## 🔌 API Specification

### 1. Register Produce (Farmer POV)
**Endpoint:** `POST /api/v1/farmer/produce`
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:** Inserts the farmer's crop into the PostgreSQL `ProduceInventory` table. It becomes instantly visible to the Matching Engine.

**Request Payload:**
```json
{
  "farmer_id": "user-uuid-here",
  "data": {
    "crop_name": "tomato",
    "variety": "Hybrid",
    "total_quantity_kg": 500.0,
    "available_quantity_kg": 500.0,
    "expected_price_per_kg": 25.50,
    "harvest_date": "2026-09-07T00:00:00Z",
    "pickup_latitude": 17.3850,
    "pickup_longitude": 78.4867,
    "pickup_address": "Hyderabad Farm"
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Produce registered successfully"
}
```

**Frontend State Management:**
- 🟢 **Success:** Show a Success Animation (e.g. Lottie checkmark) and navigate the user back to the Dashboard. Reload the "My Active Listings" list.
- 🔴 **Error (400):** Validate input fields on the frontend *before* sending (e.g., ensure quantity is > 0).

---

### 2. Post a Requirement (Buyer POV)
**Endpoint:** `POST /api/v1/buyer/requirements`
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:** A restaurant or bulk buyer specifies what they want to buy. The backend uses this to generate the Demand Forecasting metrics and matches them with farmers.

**Request Payload:**
```json
{
  "buyer_id": "buyer-uuid-here",
  "data": {
    "crop_name": "tomato",
    "required_quantity_kg": 200,
    "target_price_min": 20.0,
    "target_price_max": 28.0,
    "required_by_date": "2026-09-15T00:00:00Z",
    "delivery_city": "Secunderabad",
    "delivery_state": "Telangana",
    "delivery_latitude": 17.4399,
    "delivery_longitude": 78.4983,
    "delivery_address": "Secunderabad Market"
  }
}
```

---

## 🎨 UI/UX Guidelines & Edge Cases

> [!IMPORTANT]  
> **Location Fetching:** 
> Do NOT ask the farmer to manually type their `pickup_latitude` or `pickup_longitude`. Use a geolocation package (e.g., `geolocator` in Flutter) to fetch their GPS coordinates seamlessly in the background when they submit the form!

### Recommended UI Flow:
1. **Drop-downs for Crops:** Do not use free-text input for `crop_name`. Use a Dropdown menu (Tomato, Onion, Wheat) so the AI engine has clean data to process.
2. **Date Pickers:** Use a native Calendar widget for `harvest_date` and `required_by_date` to ensure strict ISO-8601 formatting before hitting the API.
