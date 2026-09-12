# 📱 Flutter Voice Integration & Edge AI Architecture

This document serves as the official frontend integration guide for your Flutter developers. It outlines the architecture for the **Two Voice Assistants** used in the application.

---

## 🏗️ The Dual-Assistant Architecture

Your Flutter application has two distinct Voice Assistant UI components:

1. **The Outer Assistant (Registration)**: Used immediately after OTP verification. It asks the farmer for their name and completes their profile.
2. **The Inner Assistant (Core Tasks)**: Used on the Main Dashboard. It handles agricultural tasks like selling produce and checking demand.

Both assistants communicate with the **same** Python AI Edge Engine (`/api/v1/voice/chat`), but they serve different conversational UX flows.

---

## 🎙️ 1. The Outer Assistant (Voice Registration)

This assistant is used on the "Voice Agent Registration" screen. The farmer has just verified their OTP (so the Flutter app now has their JWT token), but their `full_name` in the database is "New User".

### UX Flow:
1. **Screen Load**: The farmer navigates to the Registration screen.
2. **Local Audio**: The Flutter app *instantly* plays a local MP3 asset: *"Namaskaram! Mee poorthi peru emiti?"* (Hello! What is your full name?).
3. **Listen**: Flutter starts recording the microphone.
4. **Farmer Speaks**: *"Naa peru Ramesh Reddy"* (My name is Ramesh Reddy).
5. **API Call**: Flutter sends the audio to the AI Engine.
6. **Magic**: The AI Engine extracts "Ramesh Reddy", makes a secure `PATCH` request to the NestJS backend to update the profile, and returns an MP3 saying *"Thank you Ramesh, your registration is complete."*

### Flutter Implementation:
```dart
// The Registration API Call
var request = http.MultipartRequest('POST', Uri.parse('https://agriconnect-voice-ai.onrender.com/api/v1/voice/chat'));
// MUST include the JWT from the OTP login!
request.headers.addAll({'Authorization': 'Bearer $jwtToken'});
request.files.add(await http.MultipartFile.fromPath('audio', audioFilePath));
```

---

## 🌾 2. The Inner Assistant (Core Tasks)

This assistant lives on the main dashboard (e.g., a floating microphone button) and handles complex multi-turn agricultural tasks.

### Dialogue State Tracking (Multi-Turn memory)
Your Flutter developers **do not** need to manage conversation state. The Python AI remembers everything internally.
- **Turn 1 (Farmer)**: *"I want to sell tomatoes"* -> Flutter sends Audio.
- **Turn 1 (AI)**: *"How many kilos?"* -> Flutter plays MP3.
- **Turn 2 (Farmer)**: *"50"* -> Flutter sends Audio.
- **Turn 2 (AI)**: AI remembers the crop is tomato, saves 50kg to PostgreSQL, and replies *"Successfully registered your tomatoes."*

### Flutter Implementation:
The API call is exactly the same as the Outer Assistant! The AI Engine automatically routes the intent based on what the farmer says.
```dart
// The Task API Call (Identical structure, different screen)
var request = http.MultipartRequest('POST', Uri.parse('https://agriconnect-voice-ai.onrender.com/api/v1/voice/chat'));
request.headers.addAll({'Authorization': 'Bearer $jwtToken'});
request.files.add(await http.MultipartFile.fromPath('audio', audioFilePath));
```

---

## ⚠️ Important Note on Unauthenticated Login

Currently, our AI Engine strictly requires the **JWT Token** (`Authorization: Bearer <token>`) to process *any* voice commands to protect your database from hackers.

If you want the Outer Assistant to also handle the **OTP Login** (e.g., Farmer says *"My phone number is 9876543210"* before they have a JWT token), the Flutter app will receive a `401 Unauthorized` error. 

If you need a Voice-driven OTP Login flow, you must notify the Backend Team to create a specific unauthenticated `/api/v1/voice/public` endpoint on the Python server!
