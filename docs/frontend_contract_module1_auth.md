# 🚀 Frontend Feature Contract - Module 1: Authentication & Onboarding

This document is the **Feature Contract** between the Backend and Frontend for the Authentication Module. Frontend developers should use this exact specification to build the UI, manage state, and handle edge cases.

## 📱 Feature Overview
AgriConnect uses a **Passwordless OTP (One-Time Password)** system. This is a critical design choice because rural farmers may struggle with remembering passwords. The system relies entirely on their Mobile Number for identity verification.

**Primary User Flows:**
1. User enters their phone number -> Backend sends a 6-digit OTP via SMS (Twilio).
2. User enters the 6-digit OTP -> Backend verifies and returns a secure JWT Token.
3. User is navigated to the Home Screen (or KYC/Profile setup if they are a new user).

---

## 🔌 API Specification

### 1. Request OTP (Initiate Login/Signup)
**Endpoint:** `POST /api/v1/auth/request-otp`

**What it does:** Checks if the phone number exists. If it does not exist, it registers a temporary session. It generates a 6-digit OTP, hashes it, saves it to PostgreSQL, and triggers the Twilio SMS service.

**Request Payload:**
```json
{
  "phone_number": "+919999999991" // MUST include country code
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully via SMS",
  "sessionId": "uuid-v4-string" // Save this in memory!
}
```

**Frontend State Management:**
- 🟢 **Success:** Navigate the user to the `OTPVerificationScreen`. Pass the `phone_number` and `sessionId` as route arguments.
- 🔴 **Error (400):** Show a snackbar: *"Invalid phone number format. Please include +91."*
- ⏳ **Loading:** Disable the "Send OTP" button and show a circular progress indicator to prevent spamming the API.

---

### 2. Verify OTP (Complete Login/Signup)
**Endpoint:** `POST /api/v1/auth/verify-otp`

**What it does:** Validates the user's input against the hashed OTP in the database. If correct, it either logs them in (returning a JWT) or creates their account and logs them in.

**Request Payload:**
```json
{
  "phone_number": "+919999999991",
  "otp": "123456"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "user": {
      "id": "uuid-v4",
      "role": "farmer",
      "is_verified": true
    }
  }
}
```

**Frontend State Management:**
- 🟢 **Success:** 
  1. Save `access_token` securely (e.g., `flutter_secure_storage` or `AsyncStorage`).
  2. Save the `user` object in your global state (Redux/Provider/Zustand).
  3. If `is_verified` is false, route to `ProfileSetupScreen`. If true, route to `DashboardScreen`.
- 🔴 **Error (401 Unauthorized):** Show a red text label: *"Incorrect OTP. Please try again."*
- 🔴 **Error (403 Forbidden):** Show a snackbar: *"OTP has expired. Please request a new one."*

---

## 🎨 UI/UX Guidelines & Edge Cases

> [!IMPORTANT]  
> **Global API Interceptor:**
> After completing this module, configure your HTTP client (e.g., `Dio` or `Axios`) to automatically inject the `access_token` into the header of every future request:
> `Authorization: Bearer <access_token>`

> [!WARNING]  
> **Token Expiration Handling:**
> If any API ever returns a `401 Unauthorized`, your frontend must instantly wipe the local token and force the user back to the Login Screen.

### Recommended UI Flow:
1. **Phone Input Screen:** Use a numeric keypad only (`TextInputType.phone`). Auto-prefix `+91` visually so the user doesn't have to type it.
2. **OTP Screen:** Implement a 6-box OTP input widget (e.g., `pinput` package in Flutter).
3. **Resend Timer:** Implement a 60-second countdown timer before the "Resend OTP" button becomes clickable. This prevents you from exhausting your Twilio budget!
