# 👤 Frontend Feature Contract - Module 6: User Profiles & FPO Onboarding

This document guides frontend developers on how to handle Role-Based Access Control (RBAC) and profile setup for Farmers, Bulk Buyers, FPOs (Farmer Producer Organizations), and Logistics Partners.

## 📱 Feature Overview
AgriConnect serves multiple distinct user types on the exact same app.
Upon successful OTP login (Module 1), the API returns the user's `role`. The frontend must route them to completely different UI Dashboards based on this string.

**Valid Roles:** `farmer`, `bulk_buyer`, `fpo`, `driver`

---

## 🔌 API Specification

### 1. Update Profile (KYC / Onboarding)
**Endpoint:** `PATCH /api/v1/users/profile`
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:** If a user logs in for the very first time (`is_verified = false`), they must submit their name and location details before they can access the marketplace.

**Request Payload (Example for Farmer):**
```json
{
  "full_name": "Ramesh Kumar",
  "preferred_language": "te", // telugu for voice AI
  "farmer_profile": {
    "village": "Medchal",
    "district": "Medchal-Malkajgiri",
    "state": "Telangana",
    "pincode": "501401",
    "latitude": 17.6294,
    "longitude": 78.4828,
    "land_size_acres": 2.5
  }
}
```

**Request Payload (Example for FPO / Aggregation Center):**
```json
{
  "full_name": "Medchal Farmers Cooperative",
  "fpo_profile": {
    "registration_number": "FPO-TS-2024-991",
    "operating_districts": ["Medchal", "Hyderabad"],
    "cold_storage_capacity_mt": 50.0,
    "hub_latitude": 17.6300,
    "hub_longitude": 78.4850
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully. KYC pending admin approval."
}
```

---

## 🎨 UI/UX Guidelines & Edge Cases

> [!IMPORTANT]  
> **State Management (Role Routing):**
> Do NOT use `if/else` logic scattered throughout your UI code to hide buttons based on roles. Instead, at the root of your application router, check the user's `role` from the Redux/Provider state, and literally mount a completely different `Scaffold`/`BottomNavigationBar` component!
> - If `role == 'farmer'` -> Render `FarmerDashboard`
> - If `role == 'fpo'` -> Render `FpoHubDashboard`

### Recommended UI Flow (Driver Mode):
If the logged-in user is a `driver` (Logistics Partner), their UI should be drastically simplified. It should basically look like the Uber Driver app: a massive Google Map taking up the entire screen, with a "Start Trip" slider at the bottom, automatically firing geolocation updates (Module 4) in the background.
