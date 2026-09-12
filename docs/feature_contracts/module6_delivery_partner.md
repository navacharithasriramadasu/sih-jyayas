# 🛵 Frontend Feature Contract - Module 6: Delivery Partner & Logistics Driver Operations

This document is the **complete Technical Feature Contract and Backend Requirements** between the Backend and Frontend teams for the **Delivery Partner / Driver Module** of AgriConnect.

It covers the complete driver lifecycle: registration, KYC, online/offline duty status, intelligent trip dispatch, turn-by-turn multi-stop routing, live GPS telemetry transmission, crate checklist inspection, OTP-based proof of delivery, and instant Jan Dhan UPI earnings payouts.

---

## 📱 Feature Overview & Operational Workflows

AgriConnect manages two specialized logistics fleets:
1. **Rural Multi-Farm Bulk Logistics Fleet (Mini-Trucks & 3-Wheelers):** Transports aggregated produce (500 kg – 2,000 kg) from rural farm clusters (Farm A, Farm B, Farm C) to FPO Aggregation Centers or wholesale Mandis.
2. **Hyper-local Last-Mile Urban Delivery Fleet (EV Cargo Scooters & 2-Wheelers):** Fulfills household vegetable basket deliveries from urban FPO micro-hubs to consumer doorsteps within 15–35 minutes.

### Core Driver Flows:
1. **Duty Toggle & Radar:** Driver flips "Go Online". Backend detects GPS location and streams nearby available delivery trips via WebSocket.
2. **Trip Acceptance:** Driver reviews pickup hub, destination address, distance (km), crate seal ID, weight, and guaranteed trip payout (e.g. ₹50–₹75).
3. **4-Stage Trip Progression:**
   - **Stage 0:** Heading to Hub / Farm Pickup Gate
   - **Stage 1:** At Hub (Inspect Crate Seal & Produce Checklist)
   - **Stage 2:** En Route (Live GPS Telemetry broadcast to Customer & Ops Dashboard)
   - **Stage 3:** Customer Doorstep (Delivery OTP Verification & Instant Jan Dhan Payout)
4. **Zero-Delay Earnings Ledger:** Upon successful OTP verification, trip payout is credited directly to the driver's registered UPI/Jan Dhan account with zero deduction.

---

## 🗄️ PostgreSQL Database Schema

```sql
-- 1. Delivery Partner Profile & Vehicle Details
CREATE TYPE vehicle_category AS ENUM (
    'ev_scooter_cargo',     -- e.g. Hero Electric Nyx, Ather (300kg payload)
    'two_wheeler_ice',      -- Standard motorcycle
    'three_wheeler_auto',   -- Piaggio Ape / Bajaj Maxima (500-800kg)
    'mini_truck_tata_ace'   -- Tata Ace / Mahindra Bolero (1000-2000kg)
);

CREATE TYPE driver_duty_status AS ENUM (
    'offline',
    'online_available',
    'on_active_trip',
    'suspended'
);

CREATE TABLE delivery_partners (
    id VARCHAR(50) PRIMARY KEY,          -- Foreign key to users(id)
    user_id VARCHAR(50) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type vehicle_category NOT NULL DEFAULT 'ev_scooter_cargo',
    vehicle_number VARCHAR(20) NOT NULL, -- e.g. 'TS 07 EA 4821'
    license_number VARCHAR(50) NOT NULL,
    rc_book_number VARCHAR(50),
    is_electric BOOLEAN DEFAULT TRUE,
    battery_percentage INT DEFAULT 85,
    duty_status driver_duty_status DEFAULT 'offline',
    current_lat NUMERIC(10, 7),
    current_lng NUMERIC(10, 7),
    last_location_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active_hub_id VARCHAR(50),           -- Current assigned FPO hub
    rating NUMERIC(3, 2) DEFAULT 4.9,
    rating_count INT DEFAULT 0,
    total_trips_completed INT DEFAULT 0,
    wallet_balance NUMERIC(10, 2) DEFAULT 0.0,
    upi_id VARCHAR(100) NOT NULL,        -- e.g. 'mahesh.goud@sbi' (Jan Dhan Account)
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Delivery Trips
CREATE TYPE trip_type_enum AS ENUM (
    'rural_bulk_aggregation', -- Multi-farm pickup -> Mandi / Hub
    'last_mile_consumer'      -- FPO hub -> Consumer doorstep
);

CREATE TYPE trip_status_enum AS ENUM (
    'available',
    'assigned',
    'heading_to_pickup',
    'at_pickup_hub',
    'en_route_customer',
    'at_doorstep',
    'delivered',
    'cancelled'
);

CREATE TABLE delivery_trips (
    id VARCHAR(50) PRIMARY KEY,          -- e.g. 'TRIP-4921'
    order_id VARCHAR(50) NOT NULL,       -- References consumer_orders(id) or bulk order
    trip_type trip_type_enum NOT NULL DEFAULT 'last_mile_consumer',
    driver_id VARCHAR(50) REFERENCES delivery_partners(id),
    pickup_hub_name VARCHAR(150) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_lat NUMERIC(10, 7) NOT NULL,
    pickup_lng NUMERIC(10, 7) NOT NULL,
    destination_name VARCHAR(150) NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat NUMERIC(10, 7) NOT NULL,
    destination_lng NUMERIC(10, 7) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    crate_id VARCHAR(50) NOT NULL,       -- e.g. 'CR-104'
    weight_kg NUMERIC(8, 2) NOT NULL,
    items_summary JSONB NOT NULL,        -- ["Fresh Farm Tomatoes (2 kg)", "Organic Potatoes (1 kg)"]
    distance_km NUMERIC(6, 2) NOT NULL,
    estimated_minutes INT NOT NULL,
    base_payout NUMERIC(8, 2) NOT NULL,  -- e.g. ₹50.00
    tip_amount NUMERIC(8, 2) DEFAULT 0.00,
    total_payout NUMERIC(8, 2) NOT NULL,
    status trip_status_enum DEFAULT 'available',
    delivery_otp VARCHAR(6) NOT NULL,    -- Verification OTP to be input by driver
    checklist_verified BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crate Quality & Inspection Checklist (At Hub Pickup)
CREATE TABLE delivery_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id VARCHAR(50) UNIQUE REFERENCES delivery_trips(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES delivery_partners(id),
    is_crate_seal_intact BOOLEAN DEFAULT TRUE,
    is_weight_accurate BOOLEAN DEFAULT TRUE,
    is_damage_free BOOLEAN DEFAULT TRUE,
    inspector_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Driver Live Telemetry Stream
CREATE TABLE delivery_telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    driver_id VARCHAR(50) REFERENCES delivery_partners(id),
    trip_id VARCHAR(50) REFERENCES delivery_trips(id),
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    speed_kmph NUMERIC(5, 2),
    heading_degrees NUMERIC(5, 2),
    battery_percentage INT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Driver Daily Earnings & Payout Ledger
CREATE TABLE driver_payout_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id VARCHAR(50) REFERENCES delivery_partners(id),
    trip_id VARCHAR(50) REFERENCES delivery_trips(id),
    amount NUMERIC(8, 2) NOT NULL,
    upi_id VARCHAR(100) NOT NULL,
    payout_mode VARCHAR(50) DEFAULT 'instant_upi',
    bank_reference_number VARCHAR(100),
    payout_status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 API Endpoints Specification

Base URL: `https://agriconnect-api-fiz5.onrender.com`  
Authentication: All delivery endpoints require `Authorization: Bearer <JWT_TOKEN>` with driver role permissions.

---

### SECTION 1: Driver Duty, Status & Profile

#### 1.1 Toggle Duty Online / Offline
**Endpoint:** `POST /api/v1/delivery/duty/toggle`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**What it does:** Flips driver between `online_available` and `offline`. Updates driver GPS location and begins matching nearby trips.

**Request Payload:**
```json
{
  "is_online": true,
  "lat": 17.3850,
  "lng": 78.3100,
  "battery_percentage": 88
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "duty_status": "online_available",
  "message": "You are now ONLINE. Searching for nearby farm hub orders...",
  "assigned_hub": "Ranga Reddy FPO Hub (Dock 2, Shabad)"
}
```

---

#### 1.2 Get Driver Profile & Performance Summary
**Endpoint:** `GET /api/v1/delivery/profile`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_driver_001",
    "name": "Mahesh Goud",
    "phone": "+919848022338",
    "vehicle_type": "EV Cargo Scooter (300kg)",
    "vehicle_number": "TS 07 EA 4821",
    "duty_status": "online_available",
    "rating": 4.9,
    "total_trips_completed": 342,
    "today_stats": {
      "trips_count": 6,
      "earnings": 380.0,
      "distance_km": 34.2,
      "online_hours": "4h 15m"
    },
    "upi_id": "mahesh.goud@sbi"
  }
}
```

---

### SECTION 2: Trip Matching & Acceptance

#### 2.1 Get Available Delivery Trips Nearby
**Endpoint:** `GET /api/v1/delivery/trips/available`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | Number | Yes | Driver's current latitude (e.g. `17.3850`) |
| `lng` | Number | Yes | Driver's current longitude (e.g. `78.3100`) |
| `radius_km` | Number | No | Search radius in km (default `15.0`) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "trips": [
    {
      "trip_id": "TRIP-4921",
      "order_id": "AGR-C-4921",
      "trip_type": "last_mile_consumer",
      "pickup_hub_name": "Ranga Reddy FPO Hub (Dock 2, Shabad)",
      "pickup_address": "Dock 2, Ranga Reddy Central Warehouse, Shabad Center",
      "pickup_lat": 17.3450,
      "pickup_lng": 78.2380,
      "destination_name": "Ananya Sharma",
      "destination_address": "Flat 402, Green Meadows, Madhapur, Hyderabad",
      "destination_lat": 17.4483,
      "destination_lng": 78.3915,
      "recipient_phone": "+919123456789",
      "crate_id": "CR-104",
      "weight_kg": 3.0,
      "items_summary": [
        "Fresh Farm Tomatoes (2 kg)",
        "Organic Potatoes (1 kg)"
      ],
      "distance_km": 6.4,
      "estimated_minutes": 22,
      "total_payout": 50.0,
      "status": "available"
    },
    {
      "trip_id": "TRIP-4890",
      "order_id": "AGR-C-4890",
      "trip_type": "last_mile_consumer",
      "pickup_hub_name": "Ranga Reddy FPO Hub (Dock 1, Shabad)",
      "pickup_address": "Dock 1, Shabad Center",
      "pickup_lat": 17.3450,
      "pickup_lng": 78.2380,
      "destination_name": "Dr. K. Srinivas",
      "destination_address": "Plot 18, Road No. 12, Banjara Hills, Hyderabad",
      "destination_lat": 17.4150,
      "destination_lng": 78.4350,
      "recipient_phone": "+919848022199",
      "crate_id": "CR-109",
      "weight_kg": 5.5,
      "items_summary": [
        "Organic Red Onions (5 kg)",
        "Spicy Green Chillies (500 g)"
      ],
      "distance_km": 8.2,
      "estimated_minutes": 28,
      "total_payout": 65.0,
      "status": "available"
    }
  ]
}
```

---

#### 2.2 Accept Delivery Trip
**Endpoint:** `POST /api/v1/delivery/trips/:tripId/accept`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**What it does:** Performs an **atomic lock** on the trip so no other driver can take it. Assigns driver ID, marks `status = 'heading_to_pickup'`, and sets driver `duty_status = 'on_active_trip'`.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Trip accepted successfully. Proceed to Hub for crate pickup.",
  "trip": {
    "trip_id": "TRIP-4921",
    "status": "heading_to_pickup",
    "pickup_hub": "Ranga Reddy FPO Hub (Dock 2, Shabad)",
    "crate_id": "CR-104",
    "navigation": {
      "start_lat": 17.3850,
      "start_lng": 78.3100,
      "hub_lat": 17.3450,
      "hub_lng": 78.2380
    }
  }
}
```

---

### SECTION 3: Active Trip Progression & Crate Checklist

#### 3.1 Update Trip Step / Progression
**Endpoint:** `PUT /api/v1/delivery/trips/:tripId/step`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Allowed Steps:**
- `0`: `heading_to_pickup` (Driving towards farm / FPO Hub)
- `1`: `at_pickup_hub` (Arrived at loading dock)
- `2`: `en_route_customer` (Picked up crate, delivering to customer)
- `3`: `at_doorstep` (Arrived at customer location, waiting for OTP)

**Request Payload:**
```json
{
  "step": 2,
  "status": "en_route_customer",
  "current_lat": 17.3850,
  "current_lng": 78.3100
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "current_step": 2,
  "status": "en_route_customer",
  "message": "Trip marked as En Route to Customer. Live telemetry active."
}
```

---

#### 3.2 Verify Crate Seal & Produce Checklist (At Loading Dock)
**Endpoint:** `POST /api/v1/delivery/trips/:tripId/verify-checklist`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Request Payload:**
```json
{
  "is_crate_seal_intact": true,
  "is_weight_accurate": true,
  "is_damage_free": true,
  "scanned_crate_barcode": "CR-104",
  "notes": "Produce crisp and clean. Seal verified."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Checklist verified. Dispatch authorized.",
  "checklist_verified": true
}
```

---

### SECTION 4: Live Telemetry & GPS Telemetry Push

#### 4.1 Driver GPS Telemetry Push
**Endpoint:** `POST /api/v1/logistics/trip/location`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**What it does:** Called automatically by the driver's Flutter app background service every 5–10 seconds. Updates PostgreSQL and broadcasts location to the customer's live tracking map via WebSockets.

**Request Payload:**
```json
{
  "trip_id": "TRIP-4921",
  "lat": 17.4100,
  "lng": 78.3450,
  "speed": 28.5,
  "heading": 45.0,
  "battery_percentage": 82
}
```

**Success Response (200 OK):**
```json
{
  "status": "updated",
  "recorded_at": "2026-09-12T14:48:30Z"
}
```

---

### SECTION 5: Proof of Delivery & Instant Earnings Payout

#### 5.1 Verify Customer 6-Digit Delivery OTP (Complete Trip)
**Endpoint:** `POST /api/v1/delivery/trips/:tripId/verify-otp`  
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:**
1. Validates the 6-digit delivery OTP entered by the driver against `consumer_orders.delivery_otp`.
2. Marks trip status as `delivered`.
3. Marks customer order status as `delivered`.
4. Automatically triggers an **instant UPI payout of ₹50.00** directly to the driver's registered Jan Dhan UPI (`mahesh.goud@sbi`).
5. Releases the farmer's produce payout simultaneously.

**Request Payload:**
```json
{
  "otp": "2048" // or "821940"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Delivery successfully verified! Payout executed.",
  "trip_status": "delivered",
  "payout_summary": {
    "trip_id": "TRIP-4921",
    "base_payout": 50.0,
    "tip": 0.0,
    "total_credited": 50.0,
    "upi_id": "mahesh.goud@sbi",
    "utr_number": "UPI/20260912/481920",
    "status": "credited_instantly"
  }
}
```

**Error (400 Bad Request - Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid Delivery OTP. Ask the customer to provide the 4 or 6-digit PIN on their screen."
}
```

---

#### 5.2 Get Driver Daily & Weekly Earnings Breakdown
**Endpoint:** `GET /api/v1/delivery/earnings`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Query Parameters:** `filter=today` (or `this_week`, `this_month`)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "today",
    "total_earnings": 380.0,
    "trips_completed": 7,
    "total_distance_km": 38.6,
    "active_hours": "4h 45m",
    "payout_history": [
      {
        "trip_id": "TRIP-4921",
        "time": "15:10",
        "customer": "Ananya Sharma",
        "distance": "6.4 km",
        "amount": 50.0,
        "status": "settled_upi"
      },
      {
        "trip_id": "TRIP-4890",
        "time": "14:20",
        "customer": "Dr. K. Srinivas",
        "distance": "8.2 km",
        "amount": 65.0,
        "status": "settled_upi"
      }
    ]
  }
}
```

---

## 🛡️ Critical Edge Cases & Operational Rules

1. **Store & Forward Telemetry Buffering:**
   - Rural delivery routes often suffer from cellular blackouts.
   - The Flutter mobile client buffers GPS breadcrumbs locally in SQLite and pushes them in batches once 4G connectivity restores.
2. **Strict Crate Chain-of-Custody:**
   - Every vegetable crate has a unique barcode ID (e.g. `CR-104`).
   - Drivers must confirm the crate ID at the loading dock before departure to eliminate incorrect order dispatches.
3. **Instant Jan Dhan Payouts:**
   - Zero middleman cuts or delayed monthly pay cycles.
   - Drivers receive immediate UPI disbursements into their Jan Dhan bank accounts upon customer OTP verification.
4. **Customer Doorstep Timer (Unattended Protocols):**
   - If the customer does not open the door within 5 minutes, the app enables masked phone call proxying.
   - If still unreachable, return protocol routes the crate back to the nearest FPO cold storage.

---

## 📋 Delivery Partner Integration Checklist

| Endpoint | Method | Path | Status |
|---|---|---|---|
| Toggle Duty | `POST` | `/api/v1/delivery/duty/toggle` | 🔲 Pending Backend |
| Driver Profile | `GET` | `/api/v1/delivery/profile` | 🔲 Pending Backend |
| Available Trips | `GET` | `/api/v1/delivery/trips/available` | 🔲 Pending Backend |
| Accept Trip | `POST` | `/api/v1/delivery/trips/:tripId/accept` | 🔲 Pending Backend |
| Update Step | `PUT` | `/api/v1/delivery/trips/:tripId/step` | 🔲 Pending Backend |
| Verify Checklist | `POST` | `/api/v1/delivery/trips/:tripId/verify-checklist` | 🔲 Pending Backend |
| Push Telemetry | `POST` | `/api/v1/logistics/trip/location` | 🔲 Pending Backend |
| Verify OTP & Settle | `POST` | `/api/v1/delivery/trips/:tripId/verify-otp` | 🔲 Pending Backend |
| Earnings Ledger | `GET` | `/api/v1/delivery/earnings` | 🔲 Pending Backend |
