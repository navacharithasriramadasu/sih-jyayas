# 📱 Frontend API Guide: Consumer & Delivery Modules

This guide is designed for the Frontend Team (Flutter/React Native) to integrate the **Consumer E-Commerce (Module 5)** and **Delivery Partner Logistics (Module 6)** flows into the mobile applications.

## 🌍 Base URLs
- **Production API URL:** `https://agriconnect-api-fiz5.onrender.com`
- **Voice AI Engine URL:** `https://agriconnect-voice-ai.onrender.com`


> [!IMPORTANT]
> **Authentication:** Almost all of these endpoints require a valid JWT token. You must pass it in the Headers as:
> `Authorization: Bearer <your_jwt_token>`

---

## 🛒 Module 5: Consumer E-Commerce API
*These APIs power the B2C App where urban users buy farm-fresh produce.*

### 1. Discovery & Catalog
* **Get Categories**
  * **Endpoint:** `GET /api/v1/consumer/categories`
  * **Purpose:** Fetches all active produce categories to render the top chips on the home screen.
* **Get Products**
  * **Endpoint:** `GET /api/v1/consumer/products?category=All&search=tomato`
  * **Purpose:** Fetches the active catalog. Passing `category` filters by category. Passing `search` filters by name.

### 2. Cart Management (Requires JWT)
* **Get Active Cart**
  * **Endpoint:** `GET /api/v1/consumer/cart`
  * **Purpose:** Returns the user's cart, subtotal, delivery fee, and grand total.
* **Add to Cart**
  * **Endpoint:** `POST /api/v1/consumer/cart/add`
  * **Payload:** `{ "product_id": "uuid", "quantity_kg": 2 }`
  * **Purpose:** Adds an item to the cart. It will throw an error if the requested quantity exceeds the farmer's available stock.
* **Clear Cart**
  * **Endpoint:** `DELETE /api/v1/consumer/cart/clear`

### 3. Addresses & Checkout (Requires JWT)
* **Get Saved Addresses**
  * **Endpoint:** `GET /api/v1/consumer/addresses`
* **Create Order (Checkout)**
  * **Endpoint:** `POST /api/v1/consumer/orders/create`
  * **Payload:** `{ "address_id": "uuid", "payment_method": "cash_on_delivery" }`
  * **Purpose:** The core Escrow Checkout Engine. This endpoint atomically deducts the stock from the farmer's inventory, empties the consumer's cart, creates the order, and **generates the 6-digit Delivery OTP** that acts as the Escrow lock.

---

## 🛵 Module 6: Delivery Partner Logistics API
*These APIs power the Delivery App where EV drivers manage trips and verify cargo.*

### 1. Driver Duty & Profile (Requires JWT)
* **Toggle Duty Status**
  * **Endpoint:** `POST /api/v1/delivery/duty/toggle`
  * **Payload:** `{ "is_online": true, "lat": 17.3850, "lng": 78.4867 }`
  * **Purpose:** Marks the driver as online/offline and updates their geocoordinates.
* **Get Driver Profile & Wallet**
  * **Endpoint:** `GET /api/v1/delivery/profile`
  * **Purpose:** Fetches driver rating, wallet balance, and total completed trips.

### 2. Trip Management (Requires JWT)
* **Get Available Trips**
  * **Endpoint:** `GET /api/v1/delivery/trips/available?lat=x&lng=y`
  * **Purpose:** Returns trips that are waiting for a driver to accept.
* **Accept Trip**
  * **Endpoint:** `POST /api/v1/delivery/trips/:tripId/accept`
  * **Purpose:** Atomically assigns the trip to the driver, locking out other drivers.
* **Update Trip Step**
  * **Endpoint:** `PUT /api/v1/delivery/trips/:tripId/step`
  * **Payload:** `{ "step": 1, "current_lat": 17.38, "current_lng": 78.48 }`
  * **Purpose:** Updates the UI progress bar. (0 = Heading to Pickup, 1 = At Pickup Hub, 2 = En Route Customer, 3 = At Doorstep)

### 3. Verification & Escrow Payout (Requires JWT)
* **Verify Cargo Checklist**
  * **Endpoint:** `POST /api/v1/delivery/trips/:tripId/verify-checklist`
  * **Payload:** `{ "is_crate_seal_intact": true, "is_weight_accurate": true, "is_damage_free": true }`
  * **Purpose:** Mandatory step at the FPO hub before picking up the crate to ensure quality isn't compromised in transit.
* **Verify OTP & Release Escrow Funds (CRITICAL)**
  * **Endpoint:** `POST /api/v1/delivery/trips/:tripId/verify-otp`
  * **Payload:** `{ "otp": "123456" }`
  * **Purpose:** The final step. The driver inputs the 6-digit OTP provided by the consumer. If valid, the backend marks the trip delivered and **instantly releases the Escrow funds**, writing a record to the Driver Payout Ledger via UPI.
