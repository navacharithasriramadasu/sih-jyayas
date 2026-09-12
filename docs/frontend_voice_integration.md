# 📱 Comprehensive React Native Voice AI Integration Guide

This guide is designed for the Frontend Developer to understand exactly how the Voice AI Microservice works, the API contracts, and the exact code required to implement it in the React Native / Expo application.

---

## 🧠 1. Architectural Overview & Functionality
You are not just dealing with a simple "chatbot". The Python FastAPI backend acts as an autonomous agent on behalf of the farmer.

**What the AI does when you send it audio:**
1. **Authentication**: It decrypts the provided JWT to identify the exact farmer.
2. **Transcription**: It uses OpenAI's Whisper model (hosted locally) to instantly transcribe the audio, auto-detecting Hindi, Telugu, or English.
3. **Intent Engine**: It runs our custom Machine Learning model (trained on the Kisan Call Center Dataset) to figure out if the farmer wants to:
   - `sell_produce` (e.g., "I want to sell 100 kg of tomato")
   - `check_demand` (e.g., "Who is buying onions?")
4. **Autonomous Backend Execution**: The Python AI acts like the frontend. It makes actual `POST` and `GET` HTTP requests directly to the core NestJS backend (e.g., creating a new `ProduceInventory` record).
5. **Dynamic Voice Generation**: The AI generates a text response based on the NestJS API result (e.g., "Great, I registered your produce!"), converts it to an MP3 using Text-To-Speech, and returns the binary audio file to you.

---

## 🔌 2. The API Contract

### **Endpoint:** `POST /api/v1/voice/chat`
This is the single endpoint you will use on the Python server.

### **Headers Required:**
| Header | Value | Description |
|---|---|---|
| `Authorization` | `Bearer <JWT_TOKEN>` | The JWT token received when the farmer logged in via OTP on the NestJS backend. The AI needs this to authenticate with NestJS! |
| `Content-Type` | `multipart/form-data` | Because you are uploading a binary audio file. |

### **Request Body (form-data):**
| Key | Type | Description |
|---|---|---|
| `audio` | File | The `.wav` or `.m4a` audio file recorded from the phone's microphone. |

### **Response (200 OK):**
The API does **NOT** return JSON. It returns the raw binary bytes of an `.mp3` audio file (MIME type: `audio/mpeg`). You simply need to download it to the device and play it using `expo-av`.

---

## 💻 3. React Native / Expo Implementation

### Step A: Install Dependencies
```bash
npx expo install expo-av expo-file-system
```

### Step B: The Audio Recording Hook
This React Hook handles gaining microphone permissions and creating the audio file.

```javascript
import { useState } from 'react';
import { Audio } from 'expo-av';

export const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(null);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return null;
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    return recording.getURI(); // Returns the local file path to the audio
  };

  return { isRecording: !!recording, startRecording, stopRecording };
};
```

### Step C: The API Call & Playback Function
When the user stops talking, you take the URI generated above and upload it. Because the API returns an audio file directly, we use `FileSystem.downloadAsync` so Expo saves the MP3 straight to the phone's disk!

```javascript
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// Replace with the actual deployed URL of the Python FastAPI server
const AI_API_URL = 'https://agriconnect-voice-ai.onrender.com/api/v1/voice/chat';

export const processFarmerVoice = async (audioUri, farmerJwtToken) => {
  try {
    // 1. Define where the AI's response will be temporarily saved on the phone
    const responseAudioPath = FileSystem.documentDirectory + 'ai_response.mp3';

    // 2. We use FileSystem.uploadAsync. Even though it's an "upload", 
    // we capture the raw response. (Alternatively, you can use Axios for this).
    const uploadResult = await FileSystem.uploadAsync(AI_API_URL, audioUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'audio',
      mimeType: 'audio/m4a',
      headers: {
        Authorization: `Bearer ${farmerJwtToken}`,
      }
    });

    if (uploadResult.status === 200) {
      // Note: Expo's uploadAsync sometimes returns the binary as a string which corrupts it.
      // If the audio doesn't play, you must use `FileSystem.downloadAsync` 
      // or `axios` with `responseType: 'arraybuffer'`.
      
      // Assuming you have the valid file saved, play it:
      const { sound } = await Audio.Sound.createAsync({ uri: responseAudioPath });
      await sound.playAsync();
    } else {
      console.error("AI Engine Error:", uploadResult.body);
    }

  } catch (error) {
    console.error('Network failure connecting to AI Server:', error);
  }
};
```
