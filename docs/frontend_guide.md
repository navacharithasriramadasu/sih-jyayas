# AgriConnect: Frontend Integration Guide

This guide details everything the Mobile App (Expo/React Native) team needs to know to integrate with the completed Phase 1 backend architecture.

## 1. Authentication (OTP Flow)

We use Twilio SMS for OTP.

### Step 1: Request OTP
**POST** `/api/v1/auth/send-otp`
```json
{
  "phone_number": "+919876543210",
  "role": "farmer"
}
```
**Response:**
```json
{
  "success": true,
  "session_id": "uuid-string"
}
```

### Step 2: Verify OTP
**POST** `/api/v1/auth/verify-otp`
```json
{
  "session_id": "uuid-string",
  "phone_number": "+919876543210",
  "otp": "123456"
}
```
**Response:**
Returns the `access_token` and `refresh_token`. The `access_token` must be attached to the `Authorization` header as `Bearer <token>` for all subsequent requests.

---

## 2. Real-Time WebSockets (Socket.io)

We stripped out database polling and implemented a highly-performant **Redis Pub/Sub WebSocket** backplane.

### Connecting
Install the `socket.io-client` in your React Native app.
```javascript
import { io } from 'socket.io-client';

// Connect to the deployed Render URL
const socket = io('https://agriconnect-api-fiz5.onrender.com');

socket.on('connect', () => {
  console.log('Connected to Real-Time Server!');
});
```

### Receiving Public Produce Broadcasts (For Buyers)
Whenever any farmer lists produce, you will instantly receive it on this channel:
```javascript
socket.on('produce.created', (newProduceListing) => {
  // Update your React state to instantly show the new listing in the feed
  console.log("New produce available:", newProduceListing);
});
```

### Receiving Secure Match Alerts (For Specific Buyers)
To receive alerts for matches found specifically for a buyer, the frontend must first **join a room**.
```javascript
// Once the buyer logs in, tell the socket to join their personal room
const buyerId = 'b1a2c3...'; // Get from JWT or auth state
socket.emit('joinRoom', `buyer_${buyerId}`);

// Listen for secure AI matching alerts
socket.on('match.updated', (matchData) => {
  // Trigger a push notification or in-app toast
  console.log("AI Found new matches for your requirement!", matchData);
});
```

---

## 3. AI Semantic Matching & Requirements

When a buyer posts a requirement, the backend converts it into a 384-dimensional mathematical vector using `@xenova/transformers` and stores it in Postgres using `pgvector`. A BullMQ background job instantly runs a Cosine Similarity Search (`<=>`) mixed with earthdistance limits to find the absolute best match.

### Post Requirement (Buyer)
**POST** `/api/v1/buyer/requirements`
```json
{
  "crop_name": "Tomato",
  "variety": "Hybrid Roma",
  "required_quantity_kg": 500,
  "target_price_max": 25.0,
  "required_by_date": "2026-09-10",
  "delivery_address": "Pune Market",
  "delivery_latitude": 18.5204,
  "delivery_longitude": 73.8567
}
```

### Create Listing (Farmer)
**POST** `/api/v1/farmer/produce`
```json
{
  "crop_name": "Tomato",
  "variety": "Hybrid Roma",
  "expected_price_per_kg": 20.0,
  "total_quantity_kg": 150,
  "available_quantity_kg": 150,
  "pickup_address": "Shirur, Maharashtra",
  "pickup_latitude": 18.8268,
  "pickup_longitude": 74.3788,
  "harvest_date": "2026-09-05"
}
```
*Note: This automatically triggers the `produce.created` WebSocket broadcast.*
