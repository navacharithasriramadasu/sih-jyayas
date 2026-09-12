# 🎙️ Frontend Feature Contract - Module 3: AI Voice Assistant

This document is the **Feature Contract** between the Backend and Frontend for the AI Voice Integration.

## 📱 Feature Overview
To bypass the literacy barrier for rural Indian farmers, AgriConnect features an AI Voice Assistant. Farmers can press a single microphone button to speak their intents (e.g., "I want to sell tomatoes" or "What is the demand for onions?"). The AI processes this, interacts with the backend database, and speaks the response back to them.

**Architecture Note:** This endpoint is hosted on a separate Python Microservice (Port `8001`), NOT the main NestJS server (Port `3000`).

---

## 🔌 API Specification

### 1. Send Audio to AI (Chat)
**Endpoint:** `POST https://agriconnect-voice-ai.onrender.com/api/v1/voice/chat?lang=en`
*(Set `lang=hi` for Hindi, `lang=te` for Telugu, `lang=mr` for Marathi, `lang=gu` for Gujarati)*
**Headers:** `Authorization: Bearer <TOKEN>`

**What it does:** The Python AI dynamically loads the requested regional acoustic model into RAM. It receives the mobile audio file, converts it to `16kHz WAV`, runs Vosk STT (Speech-to-Text) in the native language, translates the intent to English for the Marketplace Engine, and generates a TTS (Text-to-Speech) `.mp3` file back in the native language!

**Request Payload:**
You must send this as `multipart/form-data`.
- **Key:** `audio`
- **Value:** *The recorded audio file from the device.*

**Success Response (200 OK):**
The response is NOT a JSON object. It is a direct **Audio File Stream** (`audio/mpeg`).

**Frontend State Management:**
- 🟢 **Success:** The HTTP client receives raw audio bytes. You must feed these bytes directly into an Audio Player package (e.g., `audioplayers` in Flutter) to instantly play the AI's response aloud to the farmer!
- ⏳ **Loading:** While the HTTP request is pending (usually takes 1-2 seconds), show a cool glowing animation around the microphone button to indicate the AI is "Thinking..."

---

## 📊 Market Insights (Demand Graphs)
If you are building the Dashboard UI for the farmers/buyers and want to show them visual graphs, use this NestJS endpoint:

**Endpoint:** `GET https://agriconnect-api-fiz5.onrender.com/api/v1/market-insights/historical-demand?crop=tomato`
*(No auth required for MVP)*

**Success Response:**
```json
{
  "success": true,
  "crop": "tomato",
  "data": {
    "search_volume": [
      { "created_at": "2026-09-12T...", "required_quantity_kg": "450.5" },
      ...
    ],
    "historical_prices": [
      { "recorded_at": "2026-09-12T...", "modal_price": "28.5" },
      ...
    ]
  }
}
```

---

## 🎨 UI/UX Guidelines & Edge Cases

> [!WARNING]  
> **Audio Recording Format:**
> For the fastest processing, try to configure your mobile audio recorder package to record in `.m4a` or `.wav` format. The Python server can handle conversions automatically via `ffmpeg`, but native `.wav` is slightly faster!

### Recommended UI Flow:
1. **Push-to-Talk:** Implement a large, pulsing Microphone button in the center of the app. The user holds it down to record, and releases it to send.
2. **Audio Playback:** As soon as the API returns the 200 OK audio stream, auto-play it at maximum volume so the farmer can hear it clearly.
