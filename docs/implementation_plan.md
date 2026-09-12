# Goal: Implement Multilingual Voice AI (Hindi & Telugu)

The user wants the Voice AI to support English, Hindi, and Telugu for the final hackathon demo without crashing the 512MB RAM Free Tier cloud server.

## User Review Required
> [!IMPORTANT]
> **Translation Pipeline Strategy**
> Since our NLP Intent Classifier is trained exclusively on English data, we will implement a Real-Time Translation Pipeline. 
> 
> **The Flow:**
> 1. Farmer speaks Hindi/Telugu.
> 2. Vosk (Edge STT) transcribes it to Hindi/Telugu text.
> 3. We use `googletrans` to translate the text to English.
> 4. Our English NLP engine processes it and generates an English response.
> 5. We translate the response back to Hindi/Telugu.
> 6. We generate the Audio (TTS) in the farmer's native language.
> 
> **Are you okay with using `googletrans` to bridge the language gap for the NLP engine?**

## Open Questions
- Should we accept the language choice (`lang=hi`, `lang=te`, `lang=en`) from the frontend as a simple Form/Query parameter, or should we fetch it from the database User Profile? *(A query parameter is much faster for a hackathon demo!)*

## Proposed Changes

### AI Service (Python)

#### [MODIFY] `ai-service/main.py`
- Modify `POST /api/v1/voice/chat` to accept a `lang` parameter (default `en`).
- Implement **Dynamic Model Loading**: Instead of loading the Vosk model globally on boot, load `model_en`, `model_hi`, or `model_te` inside the request based on `lang`, and immediately delete it from RAM (`del model`) after transcription to prevent OOM server crashes.

#### [NEW] `ai-service/download_models.py`
- Write a quick script to download the official Vosk Acoustic Models for English, Hindi, and Telugu (`vosk-model-hi-0.22`, `vosk-model-te-0.17`) and extract them into the backend folder.

#### [MODIFY] `ai-service/requirements.txt`
- Add `googletrans==4.0.0-rc1` for the translation bridge.

#### [MODIFY] `ai-service/nlp_engine.py` & `ai-service/tts.py`
- Wrap the input and output text in the translation layer.
- Ensure the TTS engine uses the correct language code for pronunciation.

## Verification Plan
1. Download the models locally.
2. Send a mocked Hindi audio file via `cURL` with `?lang=hi`.
3. Verify that the server returns a Hindi MP3 audio response without exceeding local memory limits.
