# 🌾 AgriConnect: Complete Master Backend Specification & API Feature Contract

> **Project Name**: AgriConnect (Smart India Hackathon 2026 - Problem Statement: SIH26033)  
> **Target Audience**: Backend Engineers, Database Architects, ML Engineers, Frontend Developers  
> **Document Purpose**: Single source of truth containing every entity, database field, API contract, business logic rule, state machine, and AI engine schema needed to build the entire backend.

---

## 📑 Table of Contents
1. [System Architecture & Tech Stack](#1-system-architecture--tech-stack)
2. [Master Database Schema (All Entities & Fields)](#2-master-database-schema-all-entities--fields)
   - 2.1 Users & Authentication (`users`, `user_roles`, `kyc_verifications`)
   - 2.2 Farmer Profiles & Bank Accounts (`farmer_profiles`, `bank_accounts`)
   - 2.3 FPO Clusters & Memberships (`fpos`, `fpo_memberships`, `storage_hubs`)
   - 2.4 Produce Inventory & Harvest (`produce_inventory`, `crop_quality_reports`)
   - 2.5 Buyer Demand Requirements (`buyer_requirements`)
   - 2.6 AI Supply-Demand Matches (`supply_matches`, `match_contributors`)
   - 2.7 Wholesale & Consumer Orders (`orders`, `order_items`, `escrow_accounts`)
   - 2.8 Multi-Stop Logistics & Trip Stops (`logistics_trips`, `trip_stops`, `live_locations`)
   - 2.9 Consumer Retail Grocery (`consumer_products`, `consumer_carts`, `consumer_orders`)
   - 2.10 Payout Settlements (`settlements`, `payout_ledger`)
   - 2.11 Notifications & Audit Logs (`notifications`, `audit_logs`)
3. [Complete API Endpoints & Request/Response Contracts](#3-complete-api-endpoints--requestresponse-contracts)
   - 3.1 Authentication & Profile APIs
   - 3.2 Farmer & Produce APIs
   - 3.3 FPO Management & Aggregation APIs
   - 3.4 Buyer Demand & Matching APIs (`/api/matching/find`, etc.)
   - 3.5 Orders & Escrow Payment APIs
   - 3.6 Multi-Stop Logistics & Live GPS Tracking APIs
   - 3.7 Consumer Farm-to-Fork Store APIs
   - 3.8 Jan Dhan / Bank Settlement APIs
   - 3.9 AI & Machine Learning Microservice APIs
   - 3.10 Notification & Alert APIs
4. [State Machines & Lifecycle Workflows](#4-state-machines--lifecycle-workflows)
5. [Environment Variables & Configuration](#5-environment-variables--configuration)

---

## 1. System Architecture & Tech Stack

```mermaid
graph TD
    subgraph Clients
        FlutterApp["Flutter Mobile App (Farmer / FPO / Buyer / Consumer / Driver)"]
        AdminPanel["Next.js Web Admin / Mandi Dashboard"]
    end

    subgraph API Gateway & Backend Services
        Gateway["API Gateway / Reverse Proxy (FastAPI / Express / NestJS)"]
        AuthSvc["Auth & User Service (JWT / OTP / OAuth)"]
        MatchingSvc["Smart Supply Aggregation & Matching Engine"]
        OrderSvc["Order & Escrow Settlement Service"]
        LogisticsSvc["Logistics & CVRP Route Optimizer (OSRM / Google Maps)"]
        ConsumerSvc["Consumer Direct Grocery Service"]
        AISvc["AI Microservices (Computer Vision / NLP / Forecast)"]
    end

    subgraph Databases & Messaging
        Postgres[(PostgreSQL 16 + PostGIS for Geo-Spatial)]
        Redis[(Redis 7 for Caching, Sessions & Geo Pub/Sub)]
        S3[("Object Storage (S3 / Cloud Storage for Images & Audio)")]
        Kafka[("Event Bus / RabbitMQ for Async Workflows")]
    end

    Clients -->|HTTPS / REST / WSS| Gateway
    Gateway --> AuthSvc
    Gateway --> MatchingSvc
    Gateway --> OrderSvc
    Gateway --> LogisticsSvc
    Gateway --> ConsumerSvc
    Gateway --> AISvc

    AuthSvc --> Postgres
    MatchingSvc --> Postgres
    MatchingSvc --> Redis
    OrderSvc --> Postgres
    LogisticsSvc --> Postgres
    LogisticsSvc --> Redis
    ConsumerSvc --> Postgres
    AISvc --> S3
```

---

## 2. Master Database Schema (All Entities & Fields)

### 2.1 Users & Authentication

#### Table: `users`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique user identifier |
| `phone_number` | `VARCHAR(15)` | `UNIQUE, NOT NULL` | Verified mobile number (e.g., `+919876543210`) |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | Full legal name |
| `role` | `ENUM` | `NOT NULL` | `'farmer'`, `'fpo'`, `'bulk_buyer'`, `'consumer'`, `'driver'`, `'admin'` |
| `email` | `VARCHAR(120)` | `NULLABLE, UNIQUE` | Optional email address |
| `avatar_url` | `VARCHAR(500)` | `NULLABLE` | Profile image URL |
| `preferred_language` | `VARCHAR(10)` | `DEFAULT 'en'` | `'te'` (Telugu), `'hi'` (Hindi), `'mr'`, `'ta'`, `'en'` |
| `is_verified` | `BOOLEAN` | `DEFAULT FALSE` | OTP / KYC verification flag |
| `status` | `ENUM` | `DEFAULT 'active'` | `'active'`, `'suspended'`, `'pending_kyc'` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Last update timestamp |

#### Table: `otp_sessions`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Session ID |
| `phone_number` | `VARCHAR(15)` | `NOT NULL` | Mobile number |
| `otp_hash` | `VARCHAR(255)` | `NOT NULL` | Bcrypt hashed 6-digit OTP |
| `attempts_count` | `INT` | `DEFAULT 0` | Failed attempts counter (max 3) |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Expiration (default 5 minutes) |
| `is_used` | `BOOLEAN` | `DEFAULT FALSE` | Flag once verified |

---

### 2.2 Farmer Profiles & Bank Accounts

#### Table: `farmer_profiles`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Profile ID |
| `user_id` | `UUID` | `FOREIGN KEY (users.id) UNIQUE` | Linked user account |
| `fpo_id` | `UUID` | `FOREIGN KEY (fpos.id) NULLABLE` | Associated FPO cluster |
| `village` | `VARCHAR(100)` | `NOT NULL` | Village / Town name |
| `mandal` | `VARCHAR(100)` | `NOT NULL` | Mandal / Taluk |
| `district` | `VARCHAR(100)` | `NOT NULL` | District |
| `state` | `VARCHAR(100)` | `NOT NULL` | State (e.g. `Telangana`, `Maharashtra`) |
| `pincode` | `VARCHAR(10)` | `NOT NULL` | Postal PIN code |
| `latitude` | `DECIMAL(10,8)` | `NOT NULL` | Farm location GPS latitude |
| `longitude` | `DECIMAL(11,8)` | `NOT NULL` | Farm location GPS longitude |
| `location_geo` | `GEOMETRY(Point, 4326)` | `INDEXED (GIST)` | PostGIS spatial geometry point |
| `land_size_acres` | `DECIMAL(6,2)` | `NOT NULL` | Farm land size in acres |
| `primary_crops` | `TEXT[]` | `NOT NULL` | Array of grown crops: `['Tomato', 'Wheat', 'Paddy']` |
| `soil_type` | `VARCHAR(50)` | `NULLABLE` | `Black Cotton`, `Red Loamy`, `Alluvial` |
| `irrigation_type` | `VARCHAR(50)` | `NULLABLE` | `Borewell`, `Drip`, `Canal`, `Rainfed` |
| `pm_kisan_id` | `VARCHAR(50)` | `NULLABLE` | Government PM-KISAN identifier |

#### Table: `bank_accounts`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Account record ID |
| `user_id` | `UUID` | `FOREIGN KEY (users.id)` | Owner user ID |
| `account_holder_name` | `VARCHAR(120)` | `NOT NULL` | Name as per bank records |
| `account_number_encrypted` | `VARCHAR(255)` | `NOT NULL` | Encrypted bank account number |
| `ifsc_code` | `VARCHAR(15)` | `NOT NULL` | IFSC code |
| `bank_name` | `VARCHAR(100)` | `NOT NULL` | Bank name (e.g., `State Bank of India`) |
| `branch_name` | `VARCHAR(100)` | `NULLABLE` | Branch name |
| `upi_id` | `VARCHAR(100)` | `NULLABLE` | UPI VPA (e.g., `ramesh@sbi`) |
| `is_jan_dhan_account` | `BOOLEAN` | `DEFAULT TRUE` | Pradhan Mantri Jan Dhan Yojana flag |
| `is_primary` | `BOOLEAN` | `DEFAULT TRUE` | Default payout destination |
| `is_verified` | `BOOLEAN` | `DEFAULT FALSE` | Penny-drop verification flag |

---

### 2.3 FPO Clusters & Memberships

#### Table: `fpos`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | FPO unique ID |
| `fpo_name` | `VARCHAR(150)` | `NOT NULL` | Name (e.g. `Sahyadri Farmers Producer Company`) |
| `registration_number` | `VARCHAR(100)` | `UNIQUE, NOT NULL` | Ministry / MCA Registration Number |
| `coordinator_user_id` | `UUID` | `FOREIGN KEY (users.id)` | Lead coordinator user ID |
| `contact_phone` | `VARCHAR(15)` | `NOT NULL` | Office contact phone |
| `operating_districts` | `TEXT[]` | `NOT NULL` | Covered operational districts |
| `total_farmer_members` | `INT` | `DEFAULT 0` | Total registered farmer count |
| `aggregation_center_name` | `VARCHAR(150)` | `NOT NULL` | Main cluster collection hub |
| `hub_latitude` | `DECIMAL(10,8)` | `NOT NULL` | Hub latitude |
| `hub_longitude` | `DECIMAL(11,8)` | `NOT NULL` | Hub longitude |
| `cold_storage_capacity_mt` | `DECIMAL(8,2)` | `DEFAULT 0.0` | Cold storage capacity in metric tons |
| `rating` | `DECIMAL(3,2)` | `DEFAULT 4.8` | Operational reliability rating |

---

### 2.4 Produce Inventory & Harvest

#### Table: `produce_inventory`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Produce lot ID |
| `farmer_id` | `UUID` | `FOREIGN KEY (users.id)` | Farmer who listed the produce |
| `fpo_id` | `UUID` | `FOREIGN KEY (fpos.id) NULLABLE` | Managing FPO |
| `crop_name` | `VARCHAR(100)` | `NOT NULL` | Crop commodity name (e.g., `Tomato`, `Wheat`) |
| `variety` | `VARCHAR(100)` | `NOT NULL` | Variety (e.g., `Sharbati`, `Hybrid Roma`) |
| `total_quantity_kg` | `DECIMAL(10,2)` | `NOT NULL` | Total harvest quantity in kg |
| `available_quantity_kg`| `DECIMAL(10,2)` | `NOT NULL` | Remaining unsold quantity |
| `min_order_quantity_kg`| `DECIMAL(10,2)` | `DEFAULT 50.0` | Minimum purchase lot |
| `expected_price_per_kg`| `DECIMAL(8,2)` | `NOT NULL` | Farmer expected base price |
| `harvest_date` | `DATE` | `NOT NULL` | Date when harvested / ready |
| `shelf_life_days` | `INT` | `DEFAULT 7` | Estimated shelf life |
| `quality_grade` | `ENUM` | `DEFAULT 'gradeA'` | `'gradeA'`, `'gradeB'`, `'gradeC'`, `'pending'` |
| `quality_score` | `DECIMAL(5,2)` | `DEFAULT 85.0` | AI computed score (0-100) |
| `confidence_score` | `DECIMAL(5,2)` | `DEFAULT 90.0` | AI confidence percentage |
| `images` | `TEXT[]` | `NOT NULL` | Array of image URLs for grading evidence |
| `pickup_latitude` | `DECIMAL(10,8)` | `NOT NULL` | Pickup GPS latitude |
| `pickup_longitude` | `DECIMAL(11,8)` | `NOT NULL` | Pickup GPS longitude |
| `pickup_address` | `TEXT` | `NOT NULL` | Readable pickup address |
| `status` | `ENUM` | `DEFAULT 'available'` | `'available'`, `'locked_in_match'`, `'sold'`, `'expired'` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Listing time |

---

### 2.5 Buyer Demand Requirements

#### Table: `buyer_requirements`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Requirement ID (e.g. `REQ-2026-001`) |
| `buyer_id` | `UUID` | `FOREIGN KEY (users.id)` | Bulk buyer / Mandi / Processor |
| `crop_name` | `VARCHAR(100)` | `NOT NULL` | Commodity requested |
| `variety` | `VARCHAR(100)` | `NULLABLE` | Preferred variety |
| `required_quantity_kg` | `DECIMAL(12,2)` | `NOT NULL` | Requested bulk volume (e.g. 50,000 kg) |
| `fulfilled_quantity_kg` | `DECIMAL(12,2)` | `DEFAULT 0.0` | Currently matched volume |
| `target_price_min` | `DECIMAL(8,2)` | `NOT NULL` | Min budget price per kg |
| `target_price_max` | `DECIMAL(8,2)` | `NOT NULL` | Max budget price per kg |
| `required_by_date` | `DATE` | `NOT NULL` | Mandatory delivery deadline |
| `quality_grade_required`| `ENUM` | `DEFAULT 'gradeA'` | Required minimum grade |
| `delivery_city` | `VARCHAR(100)` | `NOT NULL` | Destination city |
| `delivery_state` | `VARCHAR(100)` | `NOT NULL` | Destination state |
| `delivery_latitude` | `DECIMAL(10,8)` | `NOT NULL` | Unloading terminal latitude |
| `delivery_longitude` | `DECIMAL(11,8)` | `NOT NULL` | Unloading terminal longitude |
| `delivery_address` | `TEXT` | `NOT NULL` | Unloading terminal address |
| `status` | `ENUM` | `DEFAULT 'open'` | `'open'`, `'matching'`, `'fulfilled'`, `'closed'` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Posted date |

---

### 2.6 AI Supply-Demand Matches

#### Table: `supply_matches`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Match ID (e.g. `MATCH-7782`) |
| `requirement_id` | `UUID` | `FOREIGN KEY (buyer_requirements.id)` | Linked buyer requirement |
| `crop_name` | `VARCHAR(100)` | `NOT NULL` | Matched crop |
| `required_quantity_kg` | `DECIMAL(12,2)` | `NOT NULL` | Target volume |
| `matched_quantity_kg` | `DECIMAL(12,2)` | `NOT NULL` | Aggregated lot volume |
| `match_score_percent` | `DECIMAL(5,2)` | `NOT NULL` | Compatibility score (e.g. `94.2%`) |
| `overall_quality_score`| `DECIMAL(5,2)` | `NOT NULL` | Weighted quality score |
| `confidence_score` | `DECIMAL(5,2)` | `NOT NULL` | AI confidence score |
| `is_fully_fulfilled` | `BOOLEAN` | `DEFAULT TRUE` | 100% volume fulfillment flag |
| `total_estimated_value`| `DECIMAL(12,2)` | `NOT NULL` | Total cost in INR (₹) |
| `aggregation_hub_id` | `UUID` | `FOREIGN KEY (fpos.id) NULLABLE` | Suggested FPO consolidation hub |
| `status` | `ENUM` | `DEFAULT 'proposed'` | `'proposed'`, `'accepted_by_buyer'`, `'order_placed'`, `'rejected'` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Generated timestamp |

#### Table: `match_contributors`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Contributor item ID |
| `match_id` | `UUID` | `FOREIGN KEY (supply_matches.id) ON DELETE CASCADE` | Linked match |
| `produce_id` | `UUID` | `FOREIGN KEY (produce_inventory.id)` | Produce inventory item |
| `farmer_id` | `UUID` | `FOREIGN KEY (users.id)` | Contributing farmer |
| `allocated_quantity_kg`| `DECIMAL(10,2)` | `NOT NULL` | Contribution quantity in kg |
| `agreed_price_per_kg` | `DECIMAL(8,2)` | `NOT NULL` | Per kg unit rate |
| `payout_amount` | `DECIMAL(10,2)` | `NOT NULL` | Total payout amount (`allocated_kg * rate`) |
| `pickup_location` | `TEXT` | `NOT NULL` | Village / Pickup point |
| `distance_to_hub_km` | `DECIMAL(6,2)` | `NOT NULL` | Proximity distance |

---

### 2.7 Wholesale & Consumer Orders

#### Table: `orders`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Order ID |
| `order_number` | `VARCHAR(30)` | `UNIQUE, NOT NULL` | Public identifier (e.g. `AGR-1024`, `AGR-2048`) |
| `order_type` | `ENUM` | `NOT NULL` | `'wholesale_lot'`, `'consumer_retail'` |
| `buyer_id` | `UUID` | `FOREIGN KEY (users.id)` | Purchasing buyer/consumer ID |
| `match_id` | `UUID` | `FOREIGN KEY (supply_matches.id) NULLABLE` | Wholesale lot match ID |
| `fpo_id` | `UUID` | `FOREIGN KEY (fpos.id) NULLABLE` | FPO managing fulfillment |
| `total_items_count` | `INT` | `DEFAULT 1` | Total distinct line items |
| `total_weight_kg` | `DECIMAL(10,2)` | `NOT NULL` | Aggregate order weight |
| `subtotal_amount` | `DECIMAL(12,2)` | `NOT NULL` | Gross produce amount |
| `logistics_fee` | `DECIMAL(8,2)` | `DEFAULT 0.0` | Freight / transport charge |
| `platform_fee` | `DECIMAL(8,2)` | `DEFAULT 0.0` | Platform service commission (0% for farmers) |
| `total_amount` | `DECIMAL(12,2)` | `NOT NULL` | Final invoice total |
| `escrow_status` | `ENUM` | `DEFAULT 'held_in_escrow'` | `'held_in_escrow'`, `'partially_released'`, `'released'`, `'refunded'` |
| `order_status` | `ENUM` | `DEFAULT 'confirmed'` | `'pending'`, `'confirmed'`, `'in_transit'`, `'at_mandi_gate'`, `'completed'`, `'cancelled'` |
| `delivery_address` | `TEXT` | `NOT NULL` | Destination address |
| `delivery_latitude` | `DECIMAL(10,8)` | `NOT NULL` | Destination GPS latitude |
| `delivery_longitude` | `DECIMAL(11,8)` | `NOT NULL` | Destination GPS longitude |
| `estimated_delivery_time`| `TIMESTAMPTZ`| `NULLABLE` | Promised ETA |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()` | Order placement time |

---

### 2.8 Multi-Stop Logistics & Trip Stops

#### Table: `logistics_trips`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Trip ID |
| `order_id` | `UUID` | `FOREIGN KEY (orders.id)` | Linked order |
| `driver_user_id` | `UUID` | `FOREIGN KEY (users.id) NULLABLE` | Assigned driver |
| `vehicle_number` | `VARCHAR(20)` | `NOT NULL` | Vehicle registration (e.g. `MH-12-AB-8802`) |
| `vehicle_type` | `VARCHAR(50)` | `DEFAULT '1.2 Ton Mini-Truck'` | Vehicle model / category |
| `max_capacity_kg` | `DECIMAL(8,2)` | `DEFAULT 1200.0` | Vehicle payload capacity |
| `total_distance_km` | `DECIMAL(8,2)` | `NOT NULL` | Total optimized route distance |
| `estimated_duration_min`| `INT` | `NOT NULL` | Route duration in minutes |
| `current_latitude` | `DECIMAL(10,8)` | `NULLABLE` | Live driver GPS latitude |
| `current_longitude`| `DECIMAL(11,8)` | `NULLABLE` | Live driver GPS longitude |
| `trip_status` | `ENUM` | `DEFAULT 'scheduled'` | `'scheduled'`, `'pickup_in_progress'`, `'all_collected'`, `'delivering'`, `'completed'` |
| `started_at` | `TIMESTAMPTZ` | `NULLABLE` | Dispatch start time |
| `completed_at` | `TIMESTAMPTZ` | `NULLABLE` | Delivery completion time |

#### Table: `trip_stops`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Stop ID |
| `trip_id` | `UUID` | `FOREIGN KEY (logistics_trips.id) ON DELETE CASCADE` | Linked trip |
| `sequence_index` | `INT` | `NOT NULL` | Step order (`1`, `2`, `3`, `4`) |
| `stop_type` | `ENUM` | `NOT NULL` | `'farmer_pickup'`, `'fpo_hub'`, `'mandi_delivery'`, `'consumer_drop'` |
| `farmer_id` | `UUID` | `FOREIGN KEY (users.id) NULLABLE` | Associated farmer for pickup |
| `location_name` | `VARCHAR(150)` | `NOT NULL` | Stop name (e.g. `Ramesh Farm - Shirur`) |
| `latitude` | `DECIMAL(10,8)` | `NOT NULL` | Waypoint latitude |
| `longitude` | `DECIMAL(11,8)` | `NOT NULL` | Waypoint longitude |
| `quantity_kg` | `DECIMAL(10,2)` | `NOT NULL` | Volume to load/unload at this stop |
| `otp_code` | `VARCHAR(6)` | `NOT NULL` | Security verification OTP for handover |
| `is_completed` | `BOOLEAN` | `DEFAULT FALSE` | Pickup/drop completed flag |
| `completed_at` | `TIMESTAMPTZ` | `NULLABLE` | Handover timestamp |

---

### 2.9 Consumer Retail Grocery

#### Table: `consumer_products`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Product ID |
| `fpo_id` | `UUID` | `FOREIGN KEY (fpos.id)` | Sourced FPO Hub |
| `product_name` | `VARCHAR(100)` | `NOT NULL` | Title (e.g. `Fresh Farm Organic Tomato`) |
| `crop_category` | `VARCHAR(50)` | `NOT NULL` | `Vegetables`, `Fruits`, `Grains`, `Pulses` |
| `unit` | `VARCHAR(20)` | `DEFAULT 'kg'` | Unit of measure (`kg`, `pack`, `bunch`) |
| `price_per_unit` | `DECIMAL(8,2)` | `NOT NULL` | Consumer price per unit (₹) |
| `market_mrp` | `DECIMAL(8,2)` | `NOT NULL` | Supermarket benchmark price |
| `savings_percentage` | `INT` | `DEFAULT 15` | Percentage saved buying direct |
| `stock_quantity` | `DECIMAL(10,2)` | `NOT NULL` | Available stock in units |
| `quality_grade` | `VARCHAR(20)` | `DEFAULT 'Grade A+'` | Quality rating |
| `farm_origin` | `VARCHAR(150)` | `NOT NULL` | Farmer / Village origin |
| `images` | `TEXT[]` | `NOT NULL` | Product image URLs |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Visibility flag |

---

### 2.10 Payout Settlements

#### Table: `settlements`
| Field Name | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY` | Settlement ID |
| `order_id` | `UUID` | `FOREIGN KEY (orders.id)` | Linked order |
| `farmer_id` | `UUID` | `FOREIGN KEY (users.id)` | Beneficiary farmer |
| `bank_account_id` | `UUID` | `FOREIGN KEY (bank_accounts.id)` | Destination bank / Jan Dhan account |
| `payout_amount` | `DECIMAL(10,2)` | `NOT NULL` | Exact payout amount (₹) |
| `settlement_type` | `ENUM` | `DEFAULT 'instant_mandi_gate'` | `'instant_mandi_gate'`, `'scheduled_neft'`, `'upi_instant'` |
| `bank_reference_number`| `VARCHAR(100)` | `UNIQUE, NULLABLE` | UTR / IMPS / Bank Transaction Reference |
| `status` | `ENUM` | `DEFAULT 'pending'` | `'pending'`, `'processing'`, `'credited'`, `'failed'` |
| `triggered_by_event` | `VARCHAR(100)` | `DEFAULT 'mandi_gate_scan'` | Event that triggered escrow release |
| `credited_at` | `TIMESTAMPTZ` | `NULLABLE` | Bank confirmation timestamp |
| `failure_reason` | `TEXT` | `NULLABLE` | Error message if failed |

---

## 3. Complete API Endpoints & Request/Response Contracts

### 3.1 Authentication & Profile APIs

#### `POST /api/v1/auth/send-otp`
- **Description**: Sends a 6-digit SMS OTP for mobile verification.
- **Request Body**:
```json
{
  "phone_number": "+919876543210",
  "role": "farmer"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "OTP sent successfully to +919876543210",
  "session_id": "8f3b6c2a-9e12-4f3b-b891-23d4e5f6a7b8",
  "expires_in_seconds": 300
}
```

#### `POST /api/v1/auth/verify-otp`
- **Description**: Verifies OTP and returns JWT tokens with user profile.
- **Request Body**:
```json
{
  "session_id": "8f3b6c2a-9e12-4f3b-b891-23d4e5f6a7b8",
  "phone_number": "+919876543210",
  "otp": "452189"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "d7a8e9f1...",
  "user": {
    "id": "11a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
    "phone_number": "+919876543210",
    "full_name": "Ramesh Reddy",
    "role": "farmer",
    "preferred_language": "te",
    "is_verified": true
  }
}
```

---

### 3.2 Farmer & Produce APIs

#### `POST /api/v1/farmer/produce`
- **Description**: Lists a new harvest produce lot with photos and coordinates.
- **Request Body**:
```json
{
  "crop_name": "Tomato",
  "variety": "Hybrid Roma",
  "total_quantity_kg": 500.0,
  "expected_price_per_kg": 20.0,
  "harvest_date": "2026-09-05",
  "images": [
    "https://storage.agriconnect.org/uploads/tomato_01.jpg",
    "https://storage.agriconnect.org/uploads/tomato_02.jpg"
  ],
  "pickup_location": {
    "village": "Shirur",
    "mandal": "Shirur",
    "district": "Pune",
    "state": "Maharashtra",
    "pincode": "412210",
    "latitude": 18.8268,
    "longitude": 74.3788,
    "address": "Survey No 42, Shirur Rural"
  }
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "produce": {
    "id": "PROD-2026-8801",
    "crop_name": "Tomato",
    "variety": "Hybrid Roma",
    "available_quantity_kg": 500.0,
    "expected_price_per_kg": 20.0,
    "quality_grade": "gradeA",
    "quality_score": 89.2,
    "confidence_score": 93.5,
    "status": "available",
    "created_at": "2026-09-03T12:00:00Z"
  }
}
```

#### `GET /api/v1/farmer/produce`
- **Description**: Returns all produce listings for the authenticated farmer with current lock status.

---

### 3.3 Buyer Demand & Matching APIs

#### `GET /api/matching/find` *(Active Primary Endpoint)*
- **Description**: Finds matched multi-farmer lots for a given crop requirement or query filters.
- **Query Parameters**:
  - `crop` *(string, optional)*: e.g. `Tomato`, `Wheat`
  - `quantity_kg` *(number, optional)*: Minimum volume required (e.g. `500`)
  - `grade` *(string, optional)*: `gradeA`, `gradeB`
  - `max_distance_km` *(number, optional)*: Max proximity radius
- **Response (200 OK)**:
```json
{
  "success": true,
  "matches": [
    {
      "match_id": "MATCH-7782",
      "requirement_id": "REQ-2026-001",
      "crop_name": "Tomato",
      "required_quantity_kg": 500.0,
      "matched_quantity_kg": 500.0,
      "match_score_percent": 92.0,
      "quality_score": 88.5,
      "confidence_score": 91.0,
      "is_fully_fulfilled": true,
      "total_estimated_value": 10500.0,
      "buyer_name": "FreshBasket Mandi",
      "delivery_location": "Pune Wholesale Yard #4",
      "contributors": [
        {
          "farmer_id": "FARMER-01",
          "farmer_name": "Ramesh Reddy",
          "quantity_kg": 150.0,
          "price_per_kg": 21.0,
          "payout_amount": 3150.0,
          "location": "Shirur (12 km away)"
        },
        {
          "farmer_id": "FARMER-02",
          "farmer_name": "Suresh Rao",
          "quantity_kg": 200.0,
          "price_per_kg": 21.0,
          "payout_amount": 4200.0,
          "location": "Khed (18 km away)"
        },
        {
          "farmer_id": "FARMER-03",
          "farmer_name": "Ravi Kumar",
          "quantity_kg": 150.0,
          "price_per_kg": 21.0,
          "payout_amount": 3150.0,
          "location": "Junnar (24 km away)"
        }
      ],
      "logistics_summary": {
        "total_distance_km": 34.5,
        "estimated_travel_time": "1 hr 45 min",
        "vehicle_capacity": "1.2 Ton Mini-Truck"
      }
    }
  ]
}
```

#### `POST /api/v1/buyer/requirements`
- **Description**: Buyer posts a bulk demand requirement to trigger the auto-matching engine.
- **Request Body**:
```json
{
  "crop_name": "Tomato",
  "variety": "Hybrid Roma",
  "required_quantity_kg": 500.0,
  "quality_grade_required": "gradeA",
  "target_price_min": 19.0,
  "target_price_max": 22.0,
  "required_by_date": "2026-09-10",
  "delivery_location": {
    "city": "Pune",
    "state": "Maharashtra",
    "latitude": 18.5204,
    "longitude": 73.8567,
    "address": "Mandi Yard Gate 4, Pune Market"
  }
}
```

---

### 3.4 Wholesale & Consumer Order APIs

#### `POST /api/v1/orders/create-from-match`
- **Description**: Buyer confirms and locks the multi-farmer match into a wholesale order with escrow funding.
- **Request Body**:
```json
{
  "match_id": "MATCH-7782",
  "payment_method": "upi_escrow",
  "delivery_slot": "2026-09-06T08:00:00Z"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "order": {
    "order_id": "ord-8812-4412",
    "order_number": "AGR-1024",
    "status": "confirmed",
    "escrow_status": "held_in_escrow",
    "subtotal_amount": 10500.0,
    "logistics_fee": 850.0,
    "total_amount": 11350.0,
    "estimated_delivery_time": "2026-09-06T10:30:00Z"
  }
}
```

---

### 3.5 Multi-Stop Logistics & Live Tracking APIs

#### `GET /api/v1/logistics/trips/:orderId`
- **Description**: Fetches multi-stop route details, waypoint sequence, and driver live coordinates.
- **Response (200 OK)**:
```json
{
  "trip_id": "TRIP-MH-9901",
  "order_number": "AGR-1024",
  "vehicle_number": "MH-12-AB-8802",
  "driver_name": "Balram Singh",
  "driver_phone": "+919422001122",
  "current_driver_location": {
    "latitude": 18.5800,
    "longitude": 73.9100,
    "speed_kmph": 42.0,
    "updated_at": "2026-09-03T12:05:00Z"
  },
  "route_polyline": "u{~nFv|u`M_@fA_...",
  "stops": [
    {
      "sequence": 1,
      "stop_type": "farmer_pickup",
      "farmer_name": "Ramesh Reddy",
      "location": "Shirur Cluster Hub",
      "latitude": 18.8268,
      "longitude": 74.3788,
      "quantity_kg": 150.0,
      "status": "completed",
      "completed_at": "2026-09-03T09:15:00Z"
    },
    {
      "sequence": 2,
      "stop_type": "farmer_pickup",
      "farmer_name": "Suresh Rao",
      "location": "Khed Hub",
      "latitude": 18.8500,
      "longitude": 74.2200,
      "quantity_kg": 200.0,
      "status": "completed",
      "completed_at": "2026-09-03T10:00:00Z"
    },
    {
      "sequence": 3,
      "stop_type": "farmer_pickup",
      "farmer_name": "Ravi Kumar",
      "location": "Junnar Center",
      "latitude": 18.9000,
      "longitude": 74.1500,
      "quantity_kg": 150.0,
      "status": "in_progress"
    },
    {
      "sequence": 4,
      "stop_type": "mandi_delivery",
      "location": "Pune Mandi Yard Gate 4",
      "latitude": 18.5204,
      "longitude": 73.8567,
      "quantity_kg": 500.0,
      "status": "pending"
    }
  ]
}
```

#### `POST /api/v1/logistics/trips/:tripId/verify-stop`
- **Description**: Verifies OTP scan at a farm pickup or Mandi gate to trigger state progression and instant payout.
- **Request Body**:
```json
{
  "stop_id": "STOP-04",
  "verification_otp": "774912",
  "gate_entry_scan_data": "QR_MANDI_GATE_PUNE_G4"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "stop_status": "completed",
  "is_trip_finished": true,
  "settlement_triggered": true,
  "settlement_batch_id": "SETTLE-BATCH-9901"
}
```

---

### 3.6 Jan Dhan / Bank Direct Settlement APIs

#### `GET /api/v1/settlements/farmer/:farmerId`
- **Description**: Returns all settlement records, transaction reference IDs, and payout history.
- **Response (200 OK)**:
```json
{
  "total_earnings": 142500.0,
  "pending_settlements": 0.0,
  "settlements": [
    {
      "settlement_id": "SETTLE-4091",
      "order_number": "AGR-1024",
      "crop_name": "Tomato",
      "quantity_kg": 150.0,
      "rate_per_kg": 21.0,
      "payout_amount": 3150.0,
      "bank_name": "State Bank of India",
      "account_masked": "XXXX-XXXX-4512",
      "is_jan_dhan": true,
      "utr_reference": "SBI992018471203",
      "status": "credited",
      "credited_at": "2026-09-03T11:45:00Z"
    }
  ]
}
```

---

### 3.7 Consumer Farm-to-Fork Store APIs

#### `GET /api/v1/consumer/products`
- **Description**: Returns retail grocery catalog sourced directly from local FPO hubs.
- **Response (200 OK)**:
```json
{
  "products": [
    {
      "id": "PROD-C-01",
      "name": "Fresh Farm Tomatoes",
      "category": "Vegetables",
      "unit": "kg",
      "price": 28.0,
      "market_mrp": 35.0,
      "savings_percent": 20,
      "grade": "Grade A+",
      "origin": "Sahyadri FPO (Shirur Farmers)",
      "image_url": "https://storage.agriconnect.org/consumer/tomatoes.jpg",
      "in_stock": true
    }
  ]
}
```

---

### 3.8 AI & Machine Learning Microservice APIs

#### `POST /api/v1/ai/grade-produce`
- **Input**: Multi-angle crop images, harvest time, moisture reading.
- **Output**: Grade (`gradeA`, `gradeB`, `gradeC`), Quality Score (0-100), Defect %, Shelf Life.

#### `POST /api/v1/ai/voice-parse`
- **Input**: Audio stream (`.wav`, `.m4a`), `source_language` (`te-IN`, `hi-IN`, `mr-IN`, `en-IN`).
- **Output**: Transcribed text, English translation, extracted entities (`crop`, `quantity_kg`, `expected_price`).

#### `POST /api/v1/ai/optimize-route`
- **Input**: Depot location, Buyer destination, Array of farmer pickup coordinates and payloads.
- **Output**: Optimized waypoint sequence, total km, duration, polyline coordinates.

#### `GET /api/v1/ai/price-trends/:cropName`
- **Output**: Historical 30-day Mandi prices, next 14-day forecasted price curve, supply surge alerts.

---

## 4. State Machines & Lifecycle Workflows

### 4.1 Wholesale Lot Order State Machine

```mermaid
stateDiagram-v2
    [*] --> RequirementPosted: Bulk Buyer posts demand
    RequirementPosted --> MultiFarmerMatchProposed: AI aggregates smallholders
    MultiFarmerMatchProposed --> EscrowFunded: Buyer confirms & deposits funds
    EscrowFunded --> LogisticsDispatched: Multi-stop truck begins pickup
    LogisticsDispatched --> ClusterCollected: Pickups verified via farmer OTP
    ClusterCollected --> AtMandiGate: Truck arrives at delivery terminal
    AtMandiGate --> InstantSettlementReleased: Mandi Gate QR scan verified
    InstantSettlementReleased --> [*]: Farmers receive Jan Dhan / UPI payout
```

---

## 5. Environment Variables & Configuration

### Backend Server (`.env`)
```env
# Server
PORT=8000
NODE_ENV=development
APP_BASE_URL=https://hmtdt224-8000.inc1.devtunnels.ms

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/agriconnect_db
REDIS_URL=redis://localhost:6379

# JWT & Security
JWT_SECRET=super_secret_agriconnect_jwt_key_2026
JWT_EXPIRATION=7d

# SMS & OTP Service (Twilio / Fast2SMS)
SMS_PROVIDER=fast2sms
SMS_API_KEY=your_sms_api_key

# Payment & Escrow Gateway (Razorpay / Cashfree)
PAYMENT_GATEWAY=razorpay
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxxxx

# Cloud Storage (AWS S3 / GCP Storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_S3_BUCKET=agriconnect-media-bucket
AWS_REGION=ap-south-1

# Routing Engine (OSRM or Google Maps API)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Next.js Admin Panel (`.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=https://hmtdt224-8000.inc1.devtunnels.ms
```

### Flutter Mobile App
```dart
// Run with: flutter run --dart-define=API_BASE_URL=https://hmtdt224-8000.inc1.devtunnels.ms
static const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://hmtdt224-8000.inc1.devtunnels.ms',
);
```

---
*AgriConnect Master Specification — SIH 2026*
