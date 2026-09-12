# 🚀 AgriConnect: Master Technical Pitch Document

*This document contains everything you need to defend your architecture, explain your Machine Learning pipeline, and discuss your dataset usage in front of the Hackathon Judges.*

---

## 📊 1. Real-World Data Training (The KCC Dataset)
To ensure our AI actually understands how Indian farmers speak, we didn't use generic chatbots. We trained our custom Machine Learning pipeline using the **Kisan Call Center (KCC) Dataset** provided by the Government of India via Kaggle.

### The Fields We Used:
- `QueryText`: The actual question asked by the farmer (e.g., *"What is the market rate for onions in Pune?"*).
- `Category`: The classification of the question (e.g., *Market Information*, *Crop Protection*).
- `Sector`: The agricultural sector (e.g., *Horticulture*).

### How We Used It For Voice AI:
We took thousands of these real `QueryText` inputs and mapped them to specific actionable **Intents** in our system (like `sell_produce`, `check_price`, and `check_demand`). 
We then built a custom Natural Language Processing (NLP) pipeline using a **TF-IDF Vectorizer** (to convert the words into numbers) and a **Support Vector Machine (SVC)** to classify the intent. Now, when a farmer speaks into our app, the AI instantly recognizes the mathematical pattern of their sentence based on historical KCC data!

---

## 📈 2. Future Scope: Real-Time Market Price & Demand Forecasting
The judges want to know how we handle real-time economic data. Here is our exact plan for Market Price and Demand:

### How We Will Input Market Price:
Instead of manually typing prices, we plan to integrate our NestJS Backend with **Government APIs like Agmarknet or e-NAM**. 
- The backend will run a daily cron job to pull the latest Mandi prices for all major crops and cache them in our PostgreSQL database.
- When a farmer asks the Voice AI, *"What is the price of wheat today?"*, the AI makes a fast `GET` request to our NestJS cache and speaks the real-time government rate back to the farmer.

### How We Will Calculate Demand:
We will use **Internal Platform Analytics**. If 50 Bulk Buyers in Hyderabad search for "Tomato" on our app today, our NestJS Matching Engine records that search volume. When a farmer asks the Voice AI, *"What crop has high demand?"*, the AI queries the NestJS engine, identifies the spike in buyer searches, and replies, *"Tomatoes are in very high demand in Hyderabad today!"*

---

## 🏗️ 3. Decoupled Microservice Architecture
**Technique Used:** Service-Oriented Architecture (SOA) via REST.
**Functionality:**
- **NestJS (Core):** Handles the marketplace, OTP authentication, and PostgreSQL database.
- **Python (AI Brain):** A lightweight FastAPI server that acts autonomously. It intercepts the voice, determines the intent, extracts the crop name, and safely delegates the database update to NestJS via HTTP POST.

---

## ⚠️ 4. Technical Challenges & Engineering Solutions

### Challenge 1: Data Training Memory Crashes
**The Problem:** The raw KCC dataset was multiple gigabytes. When we tried to load it into Pandas to train our AI, it consumed over 16GB of RAM, instantly crashing our Google Colab and local environments.
**The Solution:** We implemented **Data Chunking**. We wrote a script to process exactly 100,000 rows at a time, extract the text, and then aggressively run Python's Garbage Collector (`gc.collect()`) to wipe the RAM before loading the next chunk.

### Challenge 2: Building & Deploying the AI (OOM Errors)
**The Problem:** We originally built the Voice AI using OpenAI's Whisper model. However, Whisper uses the PyTorch Deep Learning framework. When we deployed it to Render's Free Tier (512MB RAM limit), simply turning the server on caused an Out-Of-Memory (OOM) crash because PyTorch requires 700MB+ just to boot.
**The Solution:** We pivoted to a true **Edge AI** architecture. We ripped out Whisper and implemented **Vosk**, a C++ based speech toolkit. Vosk's acoustic models are only 40MB. Our entire Voice AI now runs flawlessly offline on a tiny 512MB server.

### Challenge 3: Seamless Frontend Audio Formatting
**The Problem:** Vosk strictly requires audio inputs to be formatted as `16kHz, Mono, WAV`. However, Flutter mobile apps natively record in `.m4a` or `.aac`. 
**The Solution:** We implemented `pydub` and `ffmpeg` directly in the Python AI server. When the Flutter app sends compressed mobile audio, our server intercepts it, instantly converts it to the required 16kHz format in-memory, feeds it to the AI, and deletes the temp file. The frontend team doesn't have to worry about audio codecs at all!
