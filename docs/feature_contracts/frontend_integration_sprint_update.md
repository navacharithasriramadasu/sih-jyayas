# Frontend Integration Guide (Sprint Update)

This guide details the exact API contract updates made to the live backend to fulfill the Priority 1-6 handoff specification. Your Flutter team can use this to transition from local SQLite fallbacks to the live cloud database.

## 1. User Profile & KYC (`api/v1/users/profile`)
**Method:** `PATCH`
**Headers:** `Authorization: Bearer <JWT_TOKEN>`
**Purpose:** Call this after OTP verification to register the user's role and details.
**Payload Example:**
```json
{
  "full_name": "Ramesh Kumar",
  "preferred_language": "te",
  "role": "farmer",
  "location": "Warangal, Telangana",
  "farm_location": "Warangal, Telangana",
  "primary_crops": ["Paddy", "Tomato"],
  "land_size_acres": 3.5,
  "fpo_cluster_assigned": "Chevella Agro Cluster",
  "upi_id": "ramesh@upi",
  "bank_name": "State Bank of India"
}
```

## 2. Farmer Produce (`api/v1/farmer/produce`)
**Method:** `POST` (Create) & `GET` (Fetch own listings)
**Headers:** `Authorization: Bearer <JWT_TOKEN>`
**Notes:** 
- The `POST` method now accepts the flattened structure.
- When creating produce, the backend automatically generates a `consumer_products` listing so retail buyers can see it immediately.

## 3. Buyer Requirements (`api/v1/buyer/requirements`)
**Method:** `POST` (Create) & `GET` (Fetch own requirements)
**Headers:** `Authorization: Bearer <JWT_TOKEN>`
**Notes:**
- Replaces the 500/404 errors. Works exactly like the Produce endpoints.

## 4. Smart Matching Engine (`api/v1/matching/find`)
**Method:** `GET`
**Query Parameters:** `?crop=Tomato&quantity_kg=200&lat=17.3&lng=78.1&max_distance_km=50`
**Response:** Returns an array of matches ranked by a 40:40:20 algorithmic score (Quality, Price, Distance) utilizing native PostgreSQL Haversine math.

## 5. Razorpay & Escrow (`api/v1/payments`)
**Endpoints:**
- `POST api/v1/payments/razorpay/create-order`
- `POST api/v1/payments/razorpay/verify`
- `POST api/v1/payments/escrow/release` (Expects `{ "orderId": "...", "otpCode": "123456" }`)

## 6. Consumer E-Commerce (`api/v1/consumer`)
**Endpoints:**
- `GET api/v1/consumer/products`
- `POST api/v1/consumer/cart/add`
- `GET api/v1/consumer/cart`
- `POST api/v1/consumer/orders/create` (Locks the cart, generates a 6-digit Delivery OTP, and clears the cart).
- `GET api/v1/consumer/orders`

## 7. Delivery Logistics (`api/v1/delivery`)
**Endpoints:**
- `POST api/v1/delivery/duty/toggle`
- `GET api/v1/delivery/trips/available`
- `POST api/v1/delivery/trips/:tripId/accept`
- `PUT api/v1/delivery/trips/:tripId/step`
- `POST api/v1/delivery/trips/:tripId/verify-checklist`
- `POST api/v1/delivery/trips/:tripId/verify-otp`
- `GET api/v1/delivery/wallet` (Returns driver payout ledger balance)
