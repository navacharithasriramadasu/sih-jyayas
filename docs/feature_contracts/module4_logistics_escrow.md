# 🚚 Frontend Feature Contract - Module 4: Logistics & Escrow Payments

This document specifies how the frontend should integrate OSRM Route Optimization and the Milestone-based Escrow Payment system.

## 📱 Feature Overview
When a match is successful, two things happen:
1. **Payments:** The Buyer pays a 20% advance to secure the order. This money is locked in an Escrow Smart Contract (via Prisma `$transaction`).
2. **Logistics:** An FPO Truck is dispatched. The frontend requests the optimal route from OSRM and tracks the driver. Upon delivery, an OTP releases the final 80% payment.

---

## 🔌 API Specification

### 1. Optimize Route (Logistics / OSRM)
**Endpoint:** `POST /api/v1/logistics/route/optimize`
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:** Sends the coordinates to the OSRM Engine to calculate the fastest route avoiding tolls and traffic for the FPO truck.

**Request Payload:**
```json
{
  "startCoords": "78.4867,17.3850",
  "endCoords": "78.4983,17.4399"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "route": {
    "distance": 8.5, // in km
    "duration": 22.4, // in minutes
    "geometry": "encoded_polyline_string_here"
  }
}
```
**Frontend State Management:**
- 🗺️ Use a package like `flutter_polyline_points` to decode the `geometry` string and draw the actual blue route line on Google Maps / Mapbox!

---

### 2. Pay 20% Advance (Escrow Lock)
**Endpoint:** `POST /api/v1/payments/escrow/advance`
**Headers:** `Authorization: Bearer <TOKEN>`

**Request Payload:**
```json
{
  "orderId": "order-uuid-here",
  "buyerId": "buyer-uuid-here",
  "amount": 5000.00
}
```
**Success Response:** Returns `success: true`. The frontend should transition the Order Status to "In Transit".

---

### 3. Verify Delivery (Release 80% Final Payment)
**Endpoint:** `POST /api/v1/payments/escrow/release`
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:** When the truck arrives at the buyer, the driver asks for a 6-digit OTP. Submitting this OTP proves delivery and triggers the Prisma `$transaction` to instantly deposit the final 80% to the Farmer's Bank Account.

**Request Payload:**
```json
{
  "orderId": "order-uuid-here",
  "otp": "492811"
}
```

---

## 🎨 UI/UX Guidelines & Edge Cases

> [!WARNING]  
> **Driver Tracking:** 
> Do not spam the backend with location updates every second! Configure your frontend geolocation background task to send updates to `/api/v1/logistics/trip/location` only once every **30 seconds** or when the driver moves more than 50 meters.
