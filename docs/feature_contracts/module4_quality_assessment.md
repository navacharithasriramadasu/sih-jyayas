# Frontend Feature Contract: Module 4 (Quality Assessment)

This contract defines exactly how the Mobile/Web Frontend should integrate with the NestJS Backend to process automated AI quality grading. 

> [!WARNING]
> **Do not call the AI Microservices directly.** The frontend must always communicate with the NestJS Backend, which will securely route the images to the AI and save the results in the database to prevent tampering.

## Core Flow

When a farmer wants to list produce, the flow is now split into two steps:
1. **Assess (Draft):** Upload photos to get an AI grade.
2. **List (Finalize):** Publish the produce using the AI's locked grade.

---

## API Endpoint 1: Assess Quality (Get AI Grade)

Call this endpoint immediately after the farmer selects/takes photos of their produce.

**Endpoint:** `POST /api/v1/farmer/produce/assess`

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "farmer_id": "uuid-of-logged-in-farmer",
  "images": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  ],
  "crop_type": "perishable"
}
```
*Note: `images` must be an array of Base64 strings. At least 1 image is required, max 3 recommended.*

**Success Response (201 Created):**
```json
{
  "id": "abc-123-draft-uuid",
  "farmer_id": "uuid-of-logged-in-farmer",
  "predicted_grade": "gradeA",
  "quality_score": "92.5",
  "confidence_score": "90.0",
  "status": "draft"
}
```

**Frontend Action Required:** 
- Save the returned `id` (this is the `assessment_id`).
- Display the `predicted_grade` (e.g., "AI Graded: Premium (Grade A)") to the user.

---

## API Endpoint 2: List Produce (Finalize Listing)

Call this endpoint when the farmer clicks the final "List for Sale" button. 

Instead of sending the raw images again, you simply send the `assessment_id` you received in Step 1. The backend will automatically attach the images and the locked AI grade to the final inventory listing.

**Endpoint:** `POST /api/v1/farmer/produce`

**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "farmer_id": "uuid-of-logged-in-farmer",
  "data": {
    "crop_name": "Tomatoes",
    "quantity_kg": 500,
    "base_price_per_kg": 25.50,
    "pickup_latitude": 17.3850,
    "pickup_longitude": 78.4867,
    "pickup_address": "Farm 12, AP",
    "assessment_id": "abc-123-draft-uuid" 
  }
}
```
*Note: You **do not** need to include the `images` or `quality_grade` fields in this payload. The backend enforces security by pulling them directly from the Draft DB record using the `assessment_id`.*

**Success Response (201 Created):**
```json
{
  "id": "new-inventory-uuid",
  "crop_name": "Tomatoes",
  "quality_grade": "gradeA",
  "status": "available",
  "assessment_id": "abc-123-draft-uuid"
}
```
