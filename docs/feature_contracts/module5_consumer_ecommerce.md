# 🛒 Frontend Feature Contract - Module 5: Consumer E-Commerce & Farm-to-Doorstep Logistics

This document is the **complete Technical Feature Contract and Backend Requirements** between the Backend and Frontend teams for the **Consumer Module** of AgriConnect. 

It covers every step of the consumer journey: product catalog browsing, farm provenance, cart synchronization, address management, checkout, UPI/Card/NetBanking/COD payment gateway integration, order lifecycle tracking, and direct farmer payout transparency.

---

## 📱 Feature Overview & Architecture

AgriConnect empowers urban households to purchase farm-fresh vegetables, fruits, staples, and herbs sourced **directly from local FPOs and verified farmers** with zero middleman markups. Deliveries are fulfilled within 15–35 minutes from local urban micro-hubs via electric delivery partners.

### Core User Flows:
1. **Catalog & Discovery:** Consumer browses categories (Vegetables, Fruits, Staples, Greens, Herbs), inspects harvest freshness (e.g., *"Harvested 3h ago"*), quality grades (*Grade A Organic*), and farmer origins.
2. **Cart Management:** Synchronized across devices, recalculates bill (subtotal, delivery fee, taxes, packaging, farmer savings), and validates real-time inventory limits.
3. **Address Management:** Consumer manages saved addresses (*Home*, *Work*, *Parents*), selects delivery instructions, and captures GPS coordinates for accurate delivery.
4. **Checkout & Multi-Mode Payment:** Supports Instant UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards, NetBanking, and Cash on Delivery (COD).
5. **Real-time Tracking & Direct Settlement:** Tracks EV delivery rider with live GPS, timeline stages (*Order Placed*, *Packed at FPO Hub*, *Out for Delivery*, *Delivered*), and displays transparent direct-to-farmer bank credit evidence.

---

## 🔄 Farmer Produce -> Direct Consumer Catalog Auto-Sync Pipeline

### 1. The Core Requirement
When a farmer lists produce on AgriConnect (for example, adding **2 kg of Tomatoes** via the Farmer App UI or speaking *"నా 2 కిలోల టొమాటో అమ్మాలి"* via the AI Voice Assistant in Module 3), this produce must **immediately and automatically reflect in the urban Consumer's vegetable catalog**. 

Urban consumers in the corresponding delivery radius must be able to view the newly available produce, see that it was just harvested, add it to their farm basket, and purchase it with zero manual intervention from admins or coordinators.

### 2. Dual-Channel Ingestion Workflow

```
[ Farmer Adds Produce ] (e.g. 2 kg Tomatoes @ ₹20/kg)
         │
         ▼
[ POST /api/v1/farmer/produce ]
         │
         ├──> 1. Writes to `produce_items` (PostgreSQL)
         │
         └──> 2. Database Trigger / NestJS Event: `produce.created`
                     │
                     ├──> Determines Category & Quality Grade
                     │
                     ├──> Auto-Upserts into `consumer_products`:
                     │      - `available_quantity_kg` += 2.0
                     │      - `price_per_kg` = ₹20.0
                     │      - `mrp_price` = ₹32.0 (35-45% retail benchmark)
                     │      - `source` = "Direct from Farmer (Ramesh Reddy, Chevella)"
                     │      - `farmer_id` = 'usr_farmer_001'
                     │      - `harvest_freshness` = "Harvested Today (Just Listed)"
                     │
                     └──> 3. WebSocket Broadcast (`consumer:catalog:item_added`)
                                 │
                                 ▼
                     [ Urban Consumer Flutter App ]
                     (Live UI updates instantly; stock counter increments)
```

### 3. Automated PostgreSQL Database Trigger / Function
The backend database must execute this automatically via a PostgreSQL trigger whenever `produce_items` receives an insert or update:

```sql
-- Function to automatically sync farmer produce to consumer catalog
CREATE OR REPLACE FUNCTION sync_farmer_produce_to_consumer_catalog()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id VARCHAR(50);
    v_mrp_price NUMERIC(10, 2);
    v_farmer_name VARCHAR(150);
    v_farmer_location VARCHAR(255);
    v_consumer_product_id VARCHAR(50);
    v_icon_emoji VARCHAR(10);
BEGIN
    -- 1. Determine Category and Icon Emoji based on crop name
    CASE LOWER(NEW.crop_name)
        WHEN 'tomato' THEN v_category_id := 'vegetables'; v_icon_emoji := '🍅';
        WHEN 'potato' THEN v_category_id := 'vegetables'; v_icon_emoji := '🥔';
        WHEN 'onion' THEN v_category_id := 'vegetables'; v_icon_emoji := '🧅';
        WHEN 'carrot' THEN v_category_id := 'vegetables'; v_icon_emoji := '🥕';
        WHEN 'spinach', 'palak' THEN v_category_id := 'greens'; v_icon_emoji := '🥬';
        WHEN 'coriander', 'kothimeera' THEN v_category_id := 'herbs'; v_icon_emoji := '🌿';
        WHEN 'apple' THEN v_category_id := 'fruits'; v_icon_emoji := '🍎';
        WHEN 'banana' THEN v_category_id := 'fruits'; v_icon_emoji := '🍌';
        WHEN 'rice', 'wheat' THEN v_category_id := 'staples'; v_icon_emoji := '🌾';
        ELSE v_category_id := 'vegetables'; v_icon_emoji := '🥦';
    END CASE;

    -- 2. Fetch Farmer details for provenance display
    SELECT full_name, location INTO v_farmer_name, v_farmer_location 
    FROM users 
    WHERE id = NEW.farmer_id;

    IF v_farmer_name IS NULL THEN
        v_farmer_name := 'Verified Local Farmer';
    END IF;

    -- 3. Calculate Recommended MRP (35-45% retail mandi benchmark to display direct savings)
    v_mrp_price := ROUND((NEW.price_per_kg * 1.45)::numeric, 0);

    -- 4. Check if an active consumer product already exists for this farmer and crop
    SELECT id INTO v_consumer_product_id 
    FROM consumer_products 
    WHERE farmer_id = NEW.farmer_id 
      AND LOWER(name) LIKE '%' || LOWER(NEW.crop_name) || '%'
    LIMIT 1;

    IF v_consumer_product_id IS NOT NULL THEN
        -- Product exists: Increment stock and update harvest freshness
        UPDATE consumer_products
        SET available_quantity_kg = available_quantity_kg + NEW.quantity_kg,
            price_per_kg = NEW.price_per_kg,
            mrp_price = v_mrp_price,
            harvest_freshness = 'Harvested Today (Freshly Added)',
            is_available = TRUE,
            updated_at = NOW()
        WHERE id = v_consumer_product_id;
    ELSE
        -- Insert as a brand new Consumer Product listing
        INSERT INTO consumer_products (
            id,
            category_id,
            name,
            description,
            price_per_kg,
            mrp_price,
            unit,
            available_quantity_kg,
            source,
            farmer_id,
            distance_km,
            quality_grade,
            icon_emoji,
            delivery_time,
            is_bestseller,
            harvest_freshness,
            is_available
        ) VALUES (
            'cp_' || SUBSTRING(gen_random_uuid()::text, 1, 8),
            v_category_id,
            'Fresh ' || INITCAP(NEW.crop_name) || COALESCE(' (' || NEW.variety || ')', ''),
            'Farm-fresh ' || NEW.crop_name || ' harvested directly by ' || v_farmer_name || ' from ' || COALESCE(v_farmer_location, 'local cluster') || '. 100% natural, sorted Grade A.',
            NEW.price_per_kg,
            v_mrp_price,
            '1 kg',
            NEW.quantity_kg,
            'Direct from Farmer (' || v_farmer_name || ')',
            NEW.farmer_id,
            COALESCE(NEW.distance_km, 8.5),
            COALESCE(NEW.quality_grade, 'Grade A'),
            v_icon_emoji,
            '15-25 mins',
            (NEW.quantity_kg >= 50),
            'Harvested Today (Just Listed)',
            TRUE
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger firing immediately whenever a farmer adds produce
CREATE TRIGGER trigger_auto_sync_farmer_produce_to_consumer
AFTER INSERT OR UPDATE OF quantity_kg ON produce_items
FOR EACH ROW
EXECUTE FUNCTION sync_farmer_produce_to_consumer_catalog();
```

### 4. Real-time WebSocket Event Specification

Whenever a farmer registers produce, the backend WebSocket gateway emits an event on the `'consumer-catalog'` room:

**Socket Event:** `consumer:catalog:item_added`  
**Event Payload:**
```json
{
  "event": "consumer:catalog:item_added",
  "timestamp": "2026-09-12T14:45:00Z",
  "data": {
    "product_id": "cp_001",
    "name": "Fresh Farm Tomatoes (Hybrid Roma)",
    "category": "Vegetables",
    "added_quantity_kg": 2.0,
    "total_available_kg": 502.0,
    "price_per_kg": 20.0,
    "mrp_price": 32.0,
    "unit": "1 kg",
    "source": "Direct from Farmer (Ramesh Reddy)",
    "farmer_id": "usr_farmer_001",
    "icon_emoji": "🍅",
    "harvest_freshness": "Harvested Today (Just Listed)"
  }
}
```

**Flutter Consumer App Behavior:**
- The consumer app's `SocketService` listens for `consumer:catalog:item_added`.
- Updates `AppState.consumerProducts` dynamically.
- Displays an interactive in-app toast: *"⚡ Ramesh Reddy just listed 2 kg of Fresh Tomatoes in your area!"*

---

### 5. Explicit Synchronization Endpoint (For Backend / FPO Portal)

In addition to the automatic database trigger, the backend must expose a manual synchronization endpoint:

**Endpoint:** `POST /api/v1/farmer/produce/:produceId/sync-to-consumer`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Request Payload (Optional overrides):**
```json
{
  "retail_price_per_kg": 22.0,  // Optional custom retail price override
  "retail_unit": "1 kg",
  "min_order_qty": 0.5,
  "max_order_qty": 10.0,
  "is_bestseller": true
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Produce synced to Consumer catalog successfully",
  "consumer_product_id": "cp_001",
  "available_quantity_kg": 2.0,
  "status": "active_in_store"
}
```

---

## 🗄️ PostgreSQL Database Schema

The backend must implement the following normalized relational schema:

```sql
-- 1. Consumer Product Categories
CREATE TABLE consumer_categories (
    id VARCHAR(50) PRIMARY KEY,          -- e.g., 'vegetables', 'fruits', 'greens', 'staples'
    name VARCHAR(100) NOT NULL,
    icon_emoji VARCHAR(10) NOT NULL,      -- e.g., '🥦', '🍎', '🥬', '🌾'
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Consumer Products (Linked to FPO Lots & Farmer Batches)
CREATE TABLE consumer_products (
    id VARCHAR(50) PRIMARY KEY,          -- e.g., 'cp_001', 'cp_002'
    category_id VARCHAR(50) REFERENCES consumer_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_kg NUMERIC(10, 2) NOT NULL,
    mrp_price NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) DEFAULT '1 kg',     -- '1 kg', '500 g', '1 bunch', '250 g'
    available_quantity_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    source VARCHAR(255) NOT NULL,        -- e.g., 'Direct from FPO (Ranga Reddy)'
    farmer_id VARCHAR(50) REFERENCES users(id), -- Provenance: which farmer harvested this
    distance_km NUMERIC(6, 2) DEFAULT 8.5,
    quality_grade VARCHAR(50) DEFAULT 'Grade A',
    icon_emoji VARCHAR(10) DEFAULT '🥦',
    image_url TEXT,
    rating NUMERIC(3, 2) DEFAULT 4.8,
    rating_count INT DEFAULT 0,
    delivery_time VARCHAR(50) DEFAULT '15-25 mins',
    is_bestseller BOOLEAN DEFAULT FALSE,
    harvest_freshness VARCHAR(100) DEFAULT 'Harvested Today',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Consumer Cart Items (Persistent per User)
CREATE TABLE consumer_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE consumer_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES consumer_carts(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES consumer_products(id) ON DELETE CASCADE,
    quantity_kg NUMERIC(6, 2) NOT NULL CHECK (quantity_kg > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);

-- 4. Consumer Saved Delivery Addresses
CREATE TABLE consumer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,             -- 'Home', 'Work / Office', 'Villa / Parents', 'Other'
    recipient_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    flat_house_number VARCHAR(150),
    apartment_area TEXT NOT NULL,
    landmark TEXT,
    city VARCHAR(100) DEFAULT 'Hyderabad',
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Consumer Orders
CREATE TYPE consumer_order_status AS ENUM (
    'pending_payment',
    'placed',
    'packed',
    'out_for_delivery',
    'delivered',
    'cancelled'
);

CREATE TYPE consumer_payment_method AS ENUM (
    'upi_phonepe',
    'upi_gpay',
    'upi_paytm',
    'upi_generic',
    'card',
    'netbanking',
    'cash_on_delivery'
);

CREATE TYPE consumer_payment_status AS ENUM (
    'pending',
    'authorized',
    'captured',
    'failed',
    'refunded'
);

CREATE TABLE consumer_orders (
    id VARCHAR(50) PRIMARY KEY,          -- e.g., 'AGR-C-4819'
    user_id VARCHAR(50) REFERENCES users(id),
    address_id UUID REFERENCES consumer_addresses(id),
    delivery_address_snapshot JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 20.00,
    handling_fee NUMERIC(10, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    total_quantity_kg NUMERIC(10, 2) NOT NULL,
    items_summary JSONB NOT NULL,         -- Array of summary text strings
    payment_method consumer_payment_method NOT NULL,
    payment_status consumer_payment_status DEFAULT 'pending',
    order_status consumer_order_status DEFAULT 'placed',
    delivery_eta VARCHAR(50) DEFAULT '25-35 mins',
    delivery_partner_id VARCHAR(50) REFERENCES users(id),
    delivery_partner_name VARCHAR(100),
    delivery_partner_phone VARCHAR(20),
    delivery_partner_vehicle VARCHAR(50), -- e.g. 'Hero Electric Nyx (TS 07 UA 4821)'
    driver_lat NUMERIC(10, 7),
    driver_lng NUMERIC(10, 7),
    farmer_payout_amount NUMERIC(10, 2),  -- Total amount disbursed to farmers (Direct Jan Dhan)
    delivery_otp VARCHAR(6) NOT NULL,     -- 6-digit OTP for delivery verification
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Consumer Order Items
CREATE TABLE consumer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) REFERENCES consumer_orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES consumer_products(id),
    product_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    quantity_kg NUMERIC(6, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    farmer_id VARCHAR(50) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Payment Gateway Logs & Signatures
CREATE TABLE consumer_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) REFERENCES consumer_orders(id) ON DELETE CASCADE,
    gateway VARCHAR(50) DEFAULT 'razorpay', -- 'razorpay', 'cashfree', 'phonepe'
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    signature VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status consumer_payment_status DEFAULT 'pending',
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Order Status Tracking Timeline
CREATE TABLE consumer_order_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(50) REFERENCES consumer_orders(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,          -- 'orderCreated', 'supplyAggregated', 'inTransit', 'delivered'
    title VARCHAR(150) NOT NULL,
    subtitle TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    is_current BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔌 API Endpoints Specification

Base URL: `https://agriconnect-api-fiz5.onrender.com`  
Authentication: All private consumer endpoints require `Authorization: Bearer <JWT_TOKEN>`.

---

### SECTION 1: Product Catalog & Discovery

#### 1.1 List Products (Catalog Search, Filter & Distance)
**Endpoint:** `GET /api/v1/consumer/products`  
**Headers:** `Authorization: Bearer <TOKEN>` (Optional for guest browsing)  
**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `category` | String | No | Filter by category: `Vegetables`, `Fruits`, `Grains`, `Greens`, `Herbs`, `Staples`, or `All` |
| `search` | String | No | Search query for crop/vegetable name (e.g., `tomato`, `methi`, `potato`) |
| `is_bestseller` | Boolean | No | Filter bestseller products (`true` / `false`) |
| `max_distance_km`| Number | No | Max distance from consumer location (default `50.0`) |
| `lat` | Number | No | Consumer latitude for hyper-local sorting (e.g. `17.4483`) |
| `lng` | Number | No | Consumer longitude (e.g. `78.3915`) |
| `page` | Int | No | Pagination page (default `1`) |
| `limit` | Int | No | Items per page (default `20`) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 48,
  "data": [
    {
      "id": "cp_001",
      "name": "Fresh Farm Tomatoes (Hybrid Roma)",
      "category": "Vegetables",
      "price_per_kg": 20.0,
      "mrp_price": 32.0,
      "unit": "1 kg",
      "available_quantity_kg": 500.0,
      "source": "Direct from Farmer (Chevella)",
      "farmer_id": "usr_farmer_001",
      "distance_km": 8.2,
      "quality_grade": "Grade A Organic",
      "icon_emoji": "🍅",
      "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
      "rating": 4.9,
      "rating_count": 142,
      "delivery_time": "15-25 mins",
      "is_bestseller": true,
      "harvest_freshness": "Harvested 3h ago"
    },
    {
      "id": "cp_002",
      "name": "Fresh Organic Potatoes (Agria Golden)",
      "category": "Vegetables",
      "price_per_kg": 25.0,
      "mrp_price": 38.0,
      "unit": "1 kg",
      "available_quantity_kg": 750.0,
      "source": "Direct from FPO (Shabad)",
      "farmer_id": "usr_farmer_002",
      "distance_km": 11.5,
      "quality_grade": "Grade A",
      "icon_emoji": "🥔",
      "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
      "rating": 4.8,
      "rating_count": 98,
      "delivery_time": "15-25 mins",
      "is_bestseller": true,
      "harvest_freshness": "Harvested Today"
    }
  ]
}
```

---

#### 1.2 Get Single Product Details & Farmer Provenance
**Endpoint:** `GET /api/v1/consumer/products/:id`  
**What it does:** Returns product info, origin farm location, harvest time, AI quality grading score, and farmer KYC verification badge.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "cp_001",
    "name": "Fresh Farm Tomatoes (Hybrid Roma)",
    "category": "Vegetables",
    "price_per_kg": 20.0,
    "mrp_price": 32.0,
    "unit": "1 kg",
    "available_quantity_kg": 480.0,
    "source": "Oakwood Farm, Chevella Village",
    "farmer": {
      "id": "usr_farmer_001",
      "name": "Ramesh Reddy",
      "location": "Chevella Village, Ranga Reddy Dist",
      "is_verified": true,
      "fpo_cluster": "Ranga Reddy Organic Producers FPO"
    },
    "ai_quality_evidence": {
      "overall_grade": "Grade A",
      "purity_score": 96.4,
      "confidence": 0.94,
      "inspected_at": "2026-09-12T06:30:00Z"
    },
    "harvest_freshness": "Harvested 3h ago",
    "description": "Crisp, hand-picked Hybrid Roma tomatoes directly from red soil fields in Chevella. Free from chemical wax or artificial ripening agents.",
    "icon_emoji": "🍅",
    "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80"
  }
}
```

---

#### 1.3 List Active Categories
**Endpoint:** `GET /api/v1/consumer/categories`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": "vegetables", "name": "Vegetables", "icon_emoji": "🥦", "item_count": 28 },
    { "id": "fruits", "name": "Fruits", "icon_emoji": "🍎", "item_count": 14 },
    { "id": "greens", "name": "Greens", "icon_emoji": "🥬", "item_count": 9 },
    { "id": "staples", "name": "Staples & Grains", "icon_emoji": "🌾", "item_count": 12 },
    { "id": "herbs", "name": "Herbs & Spices", "icon_emoji": "🌿", "item_count": 6 }
  ]
}
```

---

### SECTION 2: Cart Management

#### 2.1 View Cart (Calculate Totals, Delivery Fee & Dynamic Stock Check)
**Endpoint:** `GET /api/v1/consumer/cart`  
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:** Fetches all items in the user's active farm basket, recalculates real-time price totals, checks if any item is out of stock, and applies delivery fee logic.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "cart_id": "8fa88b64-2dbb-4fa8-b2ec-551eef38c201",
    "items": [
      {
        "product_id": "cp_001",
        "name": "Fresh Farm Tomatoes (Hybrid Roma)",
        "unit_price": 20.0,
        "mrp_price": 32.0,
        "unit": "1 kg",
        "quantity_kg": 2.0,
        "item_total": 40.0,
        "available_stock_kg": 480.0,
        "icon_emoji": "🍅",
        "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80"
      },
      {
        "product_id": "cp_002",
        "name": "Fresh Organic Potatoes (Agria Golden)",
        "unit_price": 25.0,
        "mrp_price": 38.0,
        "unit": "1 kg",
        "quantity_kg": 1.0,
        "item_total": 25.0,
        "available_stock_kg": 750.0,
        "icon_emoji": "🥔",
        "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80"
      }
    ],
    "item_count": 2,
    "subtotal": 65.0,
    "mrp_subtotal": 102.0,
    "farmer_direct_savings": 37.0,
    "delivery_fee": 20.0,
    "free_delivery_threshold": 199.0,
    "handling_fee": 0.0,
    "total_amount": 85.0
  }
}
```

---

#### 2.2 Add Item to Cart
**Endpoint:** `POST /api/v1/consumer/cart/add`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Request Payload:**
```json
{
  "product_id": "cp_001",
  "quantity_kg": 1.0
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Item added to farm basket",
  "data": {
    "product_id": "cp_001",
    "quantity_kg": 3.0,
    "item_total": 60.0,
    "cart_total": 105.0
  }
}
```

**Error (400 Bad Request - Stock Limit):**
```json
{
  "success": false,
  "message": "Only 2 kg remaining for Fresh Farm Tomatoes in your area."
}
```

---

#### 2.3 Update Cart Item Quantity
**Endpoint:** `PUT /api/v1/consumer/cart/update`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Request Payload:**
```json
{
  "product_id": "cp_001",
  "quantity_kg": 2.0  // Set to 0 to remove item
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart updated",
  "cart_count": 2,
  "subtotal": 65.0,
  "total_amount": 85.0
}
```

---

#### 2.4 Remove Single Item from Cart
**Endpoint:** `DELETE /api/v1/consumer/cart/item/:productId`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Item removed from basket"
}
```

---

#### 2.5 Clear Entire Cart
**Endpoint:** `DELETE /api/v1/consumer/cart/clear`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

---

### SECTION 3: Consumer Saved Delivery Addresses

#### 3.1 List Saved Addresses
**Endpoint:** `GET /api/v1/consumer/addresses`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "addr_001",
      "tag": "Home",
      "recipient_name": "Ananya Sharma",
      "phone_number": "+919123456789",
      "flat_house_number": "Flat 402",
      "apartment_area": "Green Meadows, Madhapur, Hyderabad",
      "landmark": "Near D-Mart",
      "city": "Hyderabad",
      "pincode": "500081",
      "latitude": 17.4483,
      "longitude": 78.3915,
      "is_default": true
    },
    {
      "id": "addr_002",
      "tag": "Work / Office",
      "recipient_name": "Ananya Sharma",
      "phone_number": "+919123456789",
      "flat_house_number": "Tower 3, Level 5",
      "apartment_area": "Mindspace IT Park, Hitech City, Hyderabad",
      "landmark": "Near Inorbit Mall",
      "city": "Hyderabad",
      "pincode": "500081",
      "latitude": 17.4350,
      "longitude": 78.3700,
      "is_default": false
    }
  ]
}
```

---

#### 3.2 Add New Delivery Address
**Endpoint:** `POST /api/v1/consumer/addresses`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Request Payload:**
```json
{
  "tag": "Villa / Parents",
  "recipient_name": "R. Sharma",
  "phone_number": "+919876543210",
  "flat_house_number": "Plot 18",
  "apartment_area": "Road No. 36, Jubilee Hills, Hyderabad",
  "landmark": "Opposite Peddamma Temple",
  "city": "Hyderabad",
  "pincode": "500033",
  "latitude": 17.4312,
  "longitude": 78.4073,
  "is_default": false
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Address saved successfully",
  "data": {
    "id": "addr_003",
    "tag": "Villa / Parents",
    "address_formatted": "Plot 18, Road No. 36, Jubilee Hills, Hyderabad - 500033"
  }
}
```

---

#### 3.3 Update or Set Default Address
**Endpoint:** `PUT /api/v1/consumer/addresses/:id`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Request Payload:**
```json
{
  "is_default": true
}
```

---

#### 3.4 Delete Saved Address
**Endpoint:** `DELETE /api/v1/consumer/addresses/:id`  
**Headers:** `Authorization: Bearer <TOKEN>`

---

### SECTION 4: Checkout, Order Placement & Payment Gateway

#### 4.1 Create Consumer Order
**Endpoint:** `POST /api/v1/consumer/orders/create`  
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:**
1. Validates current stock for each product in cart.
2. Deducts reserved stock in PostgreSQL within an ACID transaction.
3. Computes final bill, delivery fee, and farmer payout amount.
4. Generates a unique `order_id` (e.g. `AGR-C-4819`) and 6-digit delivery OTP (e.g. `821940`).
5. If payment method is UPI/Card/NetBanking, initializes Razorpay/Cashfree order ID and deep link.
6. Clears the user's active cart.

**Request Payload:**
```json
{
  "address_id": "addr_001",
  "payment_method": "upi_phonepe", // 'upi_phonepe', 'upi_gpay', 'upi_paytm', 'card', 'cash_on_delivery'
  "delivery_instructions": "Leave at doorstep with security if unattended",
  "tip_amount": 0.0
}
```

**Success Response (201 Created - UPI / Online Payment):**
```json
{
  "success": true,
  "order": {
    "order_id": "AGR-C-4819",
    "order_status": "placed",
    "payment_status": "pending",
    "payment_method": "upi_phonepe",
    "total_amount": 85.0,
    "subtotal": 65.0,
    "delivery_fee": 20.0,
    "delivery_eta": "25-35 mins",
    "delivery_otp": "821940",
    "farmer_payout_amount": 65.0,
    "items_summary": [
      "Fresh Farm Tomatoes (2 kg)",
      "Fresh Organic Potatoes (1 kg)"
    ]
  },
  "payment_gateway": {
    "gateway": "razorpay",
    "razorpay_order_id": "order_OG728hd92b1a",
    "amount_paise": 8500,
    "currency": "INR",
    "upi_intent_url": "upi://pay?pa=agriconnect@icici&pn=AgriConnect&am=85.00&tr=AGR-C-4819&tn=AgriConnect%20Farm%20Basket",
    "key_id": "rzp_live_AgriConnectKey"
  }
}
```

**Success Response (201 Created - Cash on Delivery):**
```json
{
  "success": true,
  "order": {
    "order_id": "AGR-C-4820",
    "order_status": "placed",
    "payment_status": "pending",
    "payment_method": "cash_on_delivery",
    "total_amount": 85.0,
    "delivery_eta": "25-35 mins",
    "delivery_otp": "491022",
    "message": "Order placed with Cash on Delivery. Keep exact change ready."
  }
}
```

---

#### 4.2 Verify Online Payment Signature (or Webhook)
**Endpoint:** `POST /api/v1/consumer/payments/verify`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**What it does:** Verifies Razorpay HMAC SHA-256 signature (`razorpay_order_id|razorpay_payment_id`). On successful verification, marks `consumer_orders.payment_status = 'captured'` and triggers SMS/push notification to the nearest FPO packing hub.

**Request Payload:**
```json
{
  "order_id": "AGR-C-4819",
  "razorpay_order_id": "order_OG728hd92b1a",
  "razorpay_payment_id": "pay_OG739ah91823",
  "razorpay_signature": "4a58f4a1329bf92837bcde819401726a71829bc817361928"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment verified successfully. Packing started.",
  "payment_status": "captured",
  "order_status": "placed"
}
```

---

### SECTION 5: Order History & Real-Time Tracking

#### 5.1 List Consumer Past Orders
**Endpoint:** `GET /api/v1/consumer/orders`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**Query Parameters:** `page=1&limit=10`

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "order_id": "AGR-C-4819",
      "crop_name": "Farm Fresh Vegetables Basket",
      "items_summary": [
        "Fresh Farm Tomatoes (2 kg)",
        "Fresh Organic Potatoes (1 kg)"
      ],
      "total_quantity_kg": 3.0,
      "total_amount": 85.0,
      "payment_method": "UPI (PhonePe)",
      "payment_status": "captured",
      "order_status": "out_for_delivery",
      "current_status_text": "Out for Delivery (Mahesh on EV)",
      "eta": "In 18 mins",
      "created_at": "2026-09-12T14:30:00Z"
    }
  ]
}
```

---

#### 5.2 Get Order Details with Timeline Stages & Farmer Impact
**Endpoint:** `GET /api/v1/consumer/orders/:id`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "order_id": "AGR-C-4819",
    "order_status": "out_for_delivery",
    "delivery_eta": "In 18 mins",
    "delivery_otp": "821940",
    "total_amount": 85.0,
    "subtotal": 65.0,
    "delivery_fee": 20.0,
    "payment_method": "UPI (PhonePe)",
    "payment_status": "captured",
    "delivery_address": "Flat 402, Green Meadows, Madhapur, Hyderabad - 500081",
    "recipient_name": "Ananya Sharma",
    "recipient_phone": "+919123456789",
    "items": [
      {
        "product_id": "cp_001",
        "name": "Fresh Farm Tomatoes (Hybrid Roma)",
        "unit": "1 kg",
        "quantity_kg": 2.0,
        "unit_price": 20.0,
        "total_price": 40.0,
        "farmer_name": "Ramesh Reddy (Chevella Village)"
      },
      {
        "product_id": "cp_002",
        "name": "Fresh Organic Potatoes (Agria Golden)",
        "unit": "1 kg",
        "quantity_kg": 1.0,
        "unit_price": 25.0,
        "total_price": 25.0,
        "farmer_name": "Suresh Rao (Shabad Center)"
      }
    ],
    "direct_farmer_impact": {
      "farmer_payout": 65.0,
      "percentage_to_farmer": 76.5,
      "logistics_cut": 20.0,
      "middleman_commission": 0.0,
      "farmer_bank_payout_status": "Escrow Secured (Jan Dhan Direct Credit upon delivery)"
    },
    "delivery_partner": {
      "name": "Mahesh Goud",
      "phone": "+919848022338",
      "vehicle": "Hero Electric Nyx (TS 07 UA 4821)",
      "live_lat": 17.4100,
      "live_lng": 78.3450
    },
    "timeline": [
      {
        "stage": "orderCreated",
        "title": "Order Placed & Payment Verified",
        "subtitle": "₹85 paid via UPI (PhonePe)",
        "is_completed": true,
        "is_current": false,
        "timestamp": "2026-09-12T14:30:10Z"
      },
      {
        "stage": "supplyAggregated",
        "title": "Packed at Ranga Reddy FPO Hub",
        "subtitle": "Sorted Grade A produce from Ramesh & Suresh",
        "is_completed": true,
        "is_current": false,
        "timestamp": "2026-09-12T14:35:00Z"
      },
      {
        "stage": "inTransit",
        "title": "Out for Delivery",
        "subtitle": "Delivery Partner Mahesh en route on EV",
        "is_completed": true,
        "is_current": true,
        "timestamp": "2026-09-12T14:42:00Z"
      },
      {
        "stage": "delivered",
        "title": "Doorstep Delivery & OTP Verification",
        "subtitle": "Awaiting delivery confirmation at Madhapur",
        "is_completed": false,
        "is_current": false,
        "timestamp": null
      }
    ]
  }
}
```

---

#### 5.3 Live Delivery Tracking Telemetry & Polyline
**Endpoint:** `GET /api/v1/consumer/orders/:id/tracking`  
**Headers:** `Authorization: Bearer <TOKEN>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "order_id": "AGR-C-4819",
  "driver_location": {
    "lat": 17.4100,
    "lng": 78.3450,
    "heading": 45.2,
    "speed_kmph": 28.5
  },
  "destination": {
    "lat": 17.4483,
    "lng": 78.3915,
    "address": "Flat 402, Green Meadows, Madhapur, Hyderabad"
  },
  "eta_minutes": 18,
  "distance_remaining_km": 4.8,
  "encoded_polyline": "wz_wE}eqxMgBgAm@_@mBgAgBcAyAaAu@a@aBcAkCcByCcBsBoAgCcBgCcB",
  "status": "in_transit"
}
```

---

#### 5.4 Confirm Delivery & Verify 6-digit OTP (Delivery Partner Call)
**Endpoint:** `POST /api/v1/consumer/orders/:id/verify-delivery-otp`  
**Headers:** `Authorization: Bearer <TOKEN>`  
**What it does:** The delivery rider inputs the 6-digit OTP shown on the consumer's tracking screen. Once verified:
1. Marks `consumer_orders.order_status = 'delivered'`.
2. Automatically triggers instant Jan Dhan UPI payout of `farmer_payout_amount` to the associated farmers.

**Request Payload:**
```json
{
  "otp": "821940"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Delivery verified successfully! Direct settlement executed.",
  "order_status": "delivered",
  "settlement": {
    "total_disbursed": 65.0,
    "direct_farmer_credits": [
      { "farmer_id": "usr_farmer_001", "name": "Ramesh Reddy", "amount": 40.0 },
      { "farmer_id": "usr_farmer_002", "name": "Suresh Rao", "amount": 25.0 }
    ]
  }
}
```

---

## 🛡️ Critical Backend Requirements & Edge Cases

1. **Atomic Inventory Reservation:**
   - When `POST /api/v1/consumer/orders/create` is executed, use **PostgreSQL Row-Level Locking** (`SELECT ... FOR UPDATE`) or Redis locks on product inventory to avoid overselling vegetables during peak hours.
2. **Dynamic Delivery Fee Calculation:**
   - Default delivery fee is **₹20.00**.
   - Free delivery for orders with `subtotal >= ₹199.00`.
   - Backend must enforce this calculation server-side regardless of frontend values.
3. **Razorpay / Payment Gateway Webhook Idempotency:**
   - Listen to `order.paid` and `payment.captured` webhooks.
   - If user network disconnects before the Flutter app calls `/payments/verify`, the webhook must independently mark the order as `placed` and dispatch the packing signal to the FPO hub.
4. **Transparent Middleman-Free Accounting:**
   - Every consumer order item must maintain a foreign key reference to `farmer_id`.
   - When order is delivered, calculate the exact amount owed to the farmer and record it in the escrow/settlement ledger.
5. **Driver Telemetry Throttling:**
   - Driver mobile app pushes GPS updates via `POST /api/v1/logistics/trip/location` every 5–10 seconds.
   - Consumers listen to changes via WebSocket or HTTP polling on `/api/v1/consumer/orders/:id/tracking`.

---

## 📋 Frontend - Backend Integration Checklist

| Endpoint | Method | Path | Status |
|---|---|---|---|
| Catalog | `GET` | `/api/v1/consumer/products` | 🔲 Pending Backend |
| Product Details | `GET` | `/api/v1/consumer/products/:id` | 🔲 Pending Backend |
| Categories | `GET` | `/api/v1/consumer/categories` | 🔲 Pending Backend |
| View Cart | `GET` | `/api/v1/consumer/cart` | 🔲 Pending Backend |
| Add to Cart | `POST` | `/api/v1/consumer/cart/add` | 🔲 Pending Backend |
| Update Cart | `PUT` | `/api/v1/consumer/cart/update` | 🔲 Pending Backend |
| Remove Item | `DELETE` | `/api/v1/consumer/cart/item/:productId` | 🔲 Pending Backend |
| Clear Cart | `DELETE` | `/api/v1/consumer/cart/clear` | 🔲 Pending Backend |
| Get Addresses | `GET` | `/api/v1/consumer/addresses` | 🔲 Pending Backend |
| Save Address | `POST` | `/api/v1/consumer/addresses` | 🔲 Pending Backend |
| Create Order | `POST` | `/api/v1/consumer/orders/create` | 🔲 Pending Backend |
| Verify Payment | `POST` | `/api/v1/consumer/payments/verify` | 🔲 Pending Backend |
| Order History | `GET` | `/api/v1/consumer/orders` | 🔲 Pending Backend |
| Order Detail | `GET` | `/api/v1/consumer/orders/:id` | 🔲 Pending Backend |
| Live GPS Tracking | `GET` | `/api/v1/consumer/orders/:id/tracking` | 🔲 Pending Backend |
| Verify OTP Delivery | `POST` | `/api/v1/consumer/orders/:id/verify-delivery-otp` | 🔲 Pending Backend |
