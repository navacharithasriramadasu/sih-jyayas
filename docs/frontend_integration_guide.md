# AgriConnect: Complete Frontend Integration Guide

This guide is designed for the Frontend Team (building with Expo/React Native) to seamlessly integrate with the complete backend API.

## 1. Authentication Module (`/api/auth`)
We use JWT-based authentication. All protected routes require a `Bearer <token>` in the `Authorization` header.

### Endpoints
- **`POST /api/auth/send-otp`**
  - **Payload**: `{ "phone_number": "+919876543210", "role": "farmer" }`
  - **Usage**: Triggers an OTP to the user's phone.
- **`POST /api/auth/verify-otp`**
  - **Payload**: `{ "session_id": "uuid", "phone_number": "+91...", "otp": "123456" }`
  - **Response**: Returns `access_token` (JWT) and user profile object. Save the token in `AsyncStorage`.

## 2. Produce Inventory Module (`/api/produce`)
Used by **Farmers** to list their harvested crops.

### Endpoints
- **`POST /api/produce`**
  - **Headers**: `Authorization: Bearer <token>`
  - **Payload**:
    ```json
    {
      "crop_name": "Tomato",
      "variety": "Hybrid Roma",
      "total_quantity_kg": 500,
      "expected_price_per_kg": 20.0,
      "harvest_date": "2026-09-05",
      "images": ["url1"],
      "pickup_latitude": 18.8268,
      "pickup_longitude": 74.3788,
      "pickup_address": "Shirur Rural"
    }
    ```
- **`GET /api/produce`**
  - Returns a list of the authenticated farmer's active produce listings.

## 3. Buyer Requirements Module (`/api/requirements`)
Used by **Bulk Buyers** to post their demand.

### Endpoints
- **`POST /api/requirements`**
  - **Headers**: `Authorization: Bearer <token>`
  - **Payload**:
    ```json
    {
      "crop_name": "Tomato",
      "required_quantity_kg": 5000,
      "target_price_max": 22.0,
      "required_by_date": "2026-09-10",
      "delivery_city": "Pune",
      "delivery_state": "Maharashtra",
      "delivery_latitude": 18.5204,
      "delivery_longitude": 73.8567,
      "delivery_address": "Mandi Yard Gate 4"
    }
    ```
- **`GET /api/requirements`**
  - Returns the buyer's posted requirements and their fulfillment status.

## 4. Smart Matching Engine (`/api/matching`)
Used by **Buyers** to find groups of farmers that can collectively fulfill their requirements. This engine utilizes high-performance Postgres `earthdistance` calculations and Redis background queues.

### Endpoints
- **`GET /api/matching/find`**
  - **Query Parameters**:
    - `crop` (String) - e.g., `Tomato`
    - `quantity_kg` (Number) - e.g., `5000`
    - `lat` (Number) - Buyer's delivery latitude
    - `lng` (Number) - Buyer's delivery longitude
    - `max_distance_km` (Number, Optional) - Default `50`
  - **Response**: Returns a ranked array of `matches`. Each match contains an aggregated list of `contributors` (farmers) whose combined volume meets the required quantity. 

### UX Best Practices for Matches
1. **Visualizing the Clusters**: Since one match might aggregate 5 different farmers, design your UI to show a "Match Option" card that expands to show the individual farmer contributors.
2. **Comparing Options**: The API returns up to 5 potential matches ranked by a `match_score_percent`. Some matches might be cheaper but further away. Let the buyer choose!
3. **Location Requirement**: Ensure you use React Native's Expo Location module to accurately capture the buyer's delivery `lat` and `lng`. The backend uses these coordinates to run spatial SQL queries for optimal routing.
