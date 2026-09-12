# 🔌 AgriConnect: Frontend API Integration Guide

This document outlines all the critical REST APIs and endpoints currently available in the NestJS Backend. Frontend developers (Flutter/React) should use this guide to connect the UI.

## 📡 Base URL
**Local Development:** `http://localhost:3000/api/v1`
*(Note: Ensure you are prefixing endpoints with `/api/v1` if configured, or just `/` depending on your `main.ts` global prefix).*

---

## 🔐 1. Authentication (OTP)
*Standard OTP flow for Farmers and Buyers.*

### Request OTP
`POST /auth/request-otp`
```json
{
  "phone_number": "+919999999991"
}
```

### Verify OTP
`POST /auth/verify-otp`
```json
{
  "phone_number": "+919999999991",
  "otp": "123456"
}
```
**Response:** Returns a `Bearer Token`. Store this in `SharedPreferences` (Flutter) or `localStorage` (React) and attach it to all subsequent API requests.

---

## 🍅 2. Produce Marketplace (For Farmers)
*How farmers list their crops for sale.*

### Register Produce (List for Sale)
`POST /farmer/produce`
**Headers:** `Authorization: Bearer <TOKEN>`
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

---

## 🏢 3. Bulk Buyer Requirements
*How restaurants and supermarkets request crops.*

### Post a Requirement
`POST /buyer/requirements`
**Headers:** `Authorization: Bearer <TOKEN>`
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

## 📊 4. Market Insights (AI & Real-Time Prices)
*The endpoints that power the demand forecasting and government integration.*

### Get Historical Demand & Prices (For AI/Graphs)
`GET /market-insights/historical-demand?crop=tomato`
*(No auth required for MVP)*
**Response:** Returns 30 days of internal search volume + 30 days of official `data.gov.in` Mandi prices. Use this to plot graphs on the frontend!

---

## 🎙️ 5. Voice AI Assistant (Python Microservice)
*The Python FastAPI server that handles voice.*

**Base URL:** `http://localhost:8001/api/v1`

### Chat (Voice to Voice)
`POST /voice/chat`
**Headers:** `Authorization: Bearer <TOKEN>`
**Body (FormData):** 
- Key: `audio`
- Value: *The recorded `.m4a` or `.wav` file from the user's phone.*
**Response:** Returns an `.mp3` audio file stream containing the AI's response (e.g. *"I have registered your tomatoes for sale"*).

---

> [!TIP]
> **Hackathon Testing Tip:** Use the provided Postman collection or `cURL` commands to test these endpoints before plugging them into Flutter. Use the Demo Users created in the Database Seed to bypass the OTP flow easily during testing!
