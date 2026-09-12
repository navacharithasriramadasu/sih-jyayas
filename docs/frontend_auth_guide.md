# Frontend Integration Guide: Authentication & OTP

This guide explains how the mobile frontend (React Native/Expo) should interact with the newly updated Twilio OTP Authentication endpoints.

---

## 1. Important: Base URL
Because you are building a mobile application, **you must use an Absolute URL** for all API calls. Relative paths (like `/api/v1/...`) will fail because mobile apps do not run on a domain.

- **Production API**: `https://<YOUR-RENDER-BACKEND-URL>.onrender.com`
- **Production**: `https://agriconnect-api-fiz5.onrender.com`

> [!WARNING]
> Twilio Trial Limitation: Real SMS messages will only be delivered to the verified phone number on your Twilio account. However, you can always check the backend logs on Render to see the OTP generated for any phone number!

---

## 2. Requesting an OTP (`/api/v1/auth/send-otp`)

We have introduced an `is_login` flag. The backend uses this to ensure that a user who is trying to log in actually exists in the database.

### For Registration (Sign Up)
When a user is signing up for the first time, do not pass `is_login`.

**Request:**
```json
POST /api/v1/auth/send-otp
{
  "phone_number": "+917093211385",
  "role": "farmer"
}
```

### For Login (Sign In)
When a user is logging into an existing account, pass `is_login: true`. 

**Request:**
```json
POST /api/v1/auth/send-otp
{
  "phone_number": "+917093211385",
  "role": "farmer",
  "is_login": true
}
```

> [!IMPORTANT]
> If you pass `is_login: true` and the phone number is **not** found in the database, the backend will return a `400 Bad Request` with the message:
> `"User not found. Please register first."`
> 
> You should catch this error in your frontend and redirect the user to the Sign Up screen.

---

## 3. Verifying the OTP (`/api/v1/auth/verify-otp`)

When the backend successfully sends an OTP, it returns a `session_id`. You must store this `session_id` in state, and send it back along with the code the user types in.

**Request:**
```json
POST /api/v1/auth/verify-otp
{
  "session_id": "uuid-returned-from-send-otp",
  "phone_number": "+917093211385",
  "otp": "268448"
}
```

**Success Response:**
```json
{
  "success": true,
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": "...",
    "phone_number": "+917093211385",
    "role": "farmer"
  }
}
```

Once you receive this response, save the `user` and tokens into your Expo app's global state or `AsyncStorage` to keep the user logged in!
