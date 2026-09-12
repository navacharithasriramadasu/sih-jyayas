# 🎙️ AgriConnect: Voice AI Architecture & Production Costing

This document outlines the technical architecture of the AgriConnect Multilingual Voice AI, our memory-management strategies for the hackathon MVP, and a highly scalable, cost-effective production deployment strategy for AWS.

---

## 🏗️ 1. Voice Model Architecture (The Hackathon MVP)

To solve the literacy barrier for Indian farmers, we built a **Translation-Bridged Edge AI**.

### Languages Supported
Our system currently supports 5 major Indian languages natively out of the box:
- **English** (`en`)
- **Hindi** (`hi`)
- **Telugu** (`te`)
- **Marathi** (`mr`)
- **Gujarati** (`gu`)

### The "Translation Bridge" Technique
Training individual Machine Learning Intent Classifiers for 22 different languages requires massive datasets and compute power. Instead, we engineered a **Translation Bridge**:
1. The farmer speaks Hindi.
2. Our **Vosk C++ Engine** (running locally, offline) transcribes the Hindi audio into Hindi text.
3. We use a lightweight translation bridge to convert the Hindi text into English.
4. Our highly-accurate **TF-IDF + Support Vector Classifier (SVC)**, which is trained on English *Kisan Call Center* datasets, processes the English text to determine the farmer's intent (e.g., "sell produce").
5. The English response is translated back to Hindi, and spoken aloud using Text-to-Speech (TTS).

---

## 🧠 2. Memory Management: The "Dynamic Swapper"
For the hackathon, we deployed our backend on a **Free Tier Cloud Server** which limits our RAM to **512MB**. 

**The Problem:** Each regional Vosk acoustic model requires ~50MB of RAM. Loading all 5 supported languages simultaneously would require 250MB+, causing an Out-Of-Memory (OOM) server crash. 
**The Solution:** We engineered a **Dynamic Model Swapper**.
- The server stores all 5 language models safely on the Disk (using negligible storage space).
- When a Telugu request comes in via `?lang=te`, the Python server dynamically loads *only* the Telugu model into RAM.
- If the next request is Hindi (`?lang=hi`), the server executes `del active_model` and invokes Python's Garbage Collector (`gc.collect()`) to instantly wipe the Telugu model from RAM before loading the Hindi model.
- **Result:** We achieved infinite language scalability on a tiny 512MB RAM server without crashing.

---

## ☁️ 3. Production Architecture (AWS Scaling)
The "Dynamic Swapper" is perfect for a hackathon MVP, but swapping models takes ~1 second. In production, with thousands of farmers calling simultaneously, we need zero-latency concurrency. 

If we take this to **AWS (Amazon Web Services)**, we will migrate from a Monolithic server to **Serverless Functions (FaaS)**.

### The AWS Serverless Pipeline:
1. **AWS API Gateway:** Routes incoming voice traffic.
2. **AWS Lambda (Python):** Instead of one server, we deploy 22 completely isolated AWS Lambda functions (e.g., `lambda-voice-hi`, `lambda-voice-te`). 
3. **Execution:** Each Lambda function has exactly *one* language model pre-loaded in memory. When a Telugu farmer speaks, ONLY the Telugu Lambda spins up. 
4. **Infinite Scaling:** If 10,000 farmers speak Hindi at the exact same second, AWS instantly spins up 10,000 isolated Hindi Lambdas. The server literally cannot crash.

---

## 💰 4. Projected Production Monthly Costs
*How much does it cost to run AgriConnect for 10,000 monthly active users?*

AgriConnect was designed with **Profitable Unit Economics** in mind. By avoiding expensive enterprise APIs (like Google Maps and OpenAI) and relying on Open-Source (Vosk, OSRM), our operating costs are incredibly low.

| Service | Technology Used | Estimated Cost / Month | Justification & Strategy |
|---------|-----------------|------------------------|--------------------------|
| **Core Database** | PostgreSQL (Neon / AWS RDS) | **$15 - $30** | Storing structured text (Produce, Profiles) is incredibly cheap. Neon's serverless DB scales to zero when not used. |
| **REST APIs (NestJS)** | AWS EC2 (t3.small) / App Runner | **$20 - $40** | Handles OTPs, matching logic, and DB read/writes. Highly efficient TypeScript execution. |
| **Voice AI Compute** | AWS Lambda | **$10 - $20** | AWS Lambda charges $0.000016 per GB-second. Processing a 3-second voice note costs fractions of a penny. |
| **Logistics & Routing** | Self-Hosted OSRM (Docker) | **$0 (Included in EC2)** | Bypassing Google Maps API ($5 per 1,000 routes) saves the startup thousands of dollars a month. OSRM runs natively on our existing NestJS server. |
| **SMS Notifications** | Twilio OTP System | **$30 - $50** | Twilio charges ~$0.005 per SMS. This is our highest variable cost, mitigated by caching user sessions. |
| **Total Estimated Cost** | | **$75 - $140 / month** | *Massively scalable to 10k+ users with high profit margins.* |
