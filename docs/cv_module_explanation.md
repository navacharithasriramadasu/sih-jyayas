# Computer Vision (CV) Module Architecture

This document details the exact methodology, architecture, and workflow used to build the Agricultural Produce Grading engine for the AgriConnect platform.

## 1. Dataset & Preprocessing

**Source:** The model was trained using a custom aggregation built on top of the Kaggle `fruits-fresh-and-rotten-for-classification` dataset, which contains tens of thousands of images of varying fruit and vegetable quality.

**Proxy Restructuring:**
Because real-world agricultural grading requires more granularity than binary "Fresh/Rotten", we programmatically restructured the dataset into three standard tiers:
- **Grade A (Premium):** Mapped directly from the highest confidence "Fresh" samples.
- **Grade C (Rejected/Processing):** Mapped directly from the "Rotten" or highly degraded samples.
- **Grade B (Standard):** Generated via data augmentation proxy techniques (mixing features or applying specific degradation filters) to train the model to recognize intermediate quality levels.

## 2. Model Architecture & Training Method

**Architecture:** A lightweight Convolutional Neural Network (CNN) built in PyTorch. The architecture was specifically chosen to balance inference speed with accuracy, ensuring it can run efficiently in a serverless/free-tier cloud environment without triggering Out-Of-Memory (OOM) errors.

**Training Environment:** 
- Trained on Google Colab utilizing Nvidia T4 GPUs.
- **Loss Function:** Cross-Entropy Loss (standard for multi-class classification).
- **Optimizer:** Adam Optimizer for adaptive learning rate adjustment.

**Performance Metrics:**
After a fast 5-epoch training loop to validate the architecture, the model achieved:
- **Final Accuracy:** `67.11%` (Highly acceptable for a prototype/MVP trained on proxy data in 5 epochs).
- **Final Loss:** `0.5095`
- **Output:** The trained weights were exported as `cv_grading_weights.pth`.

## 3. End-to-End Workflow

The workflow is designed to prevent large Base64 image payloads from clogging the AI microservice memory.

1. **Image Capture:** The farmer takes 1-3 photos of the produce batch using the mobile app.
2. **Draft Submission:** The frontend sends a `POST` request to the NestJS Backend (`/api/v1/farmer/produce/assess`) containing the Base64 image strings.
3. **Storage & Routing:** 
   - The NestJS backend creates a `QualityAssessmentDraft` record in the Neon PostgreSQL database.
   - It routes the image payload over the internal network to the separate Python CV Microservice (`agriconnect-cv-ai`).
4. **Inference:** The FastAPI Python server runs the PyTorch model against the images, calculating the predicted Grade (A/B/C) and a defect percentage.
5. **Result Lockdown:** The backend updates the Draft in the Neon database with the AI's trusted grade and returns the Draft ID to the frontend.
6. **Final Listing:** When the farmer confirms the listing, the frontend sends the Draft ID. The backend locks the draft into the final `ProduceInventory` table, preventing the farmer from manually tampering with the AI's grade.

## 4. Infrastructure & Cost Optimization

To survive on Render's Free Tier (512MB RAM limit), the AI architecture was intentionally fractured:
- **Monolith Split:** The original `main.py` was split into `cv_app.py` and `voice_app.py`.
- **Dependency Pinning:** Specific versions of NumPy (`<2.0.0`) and PyTorch were pinned to prevent library compilation crashes during cloud deployment.
- **Microservice Networking:** The NestJS API connects to the AI services securely via Environment Variables (`CV_AI_SERVICE_URL`), keeping the heavy AI processing completely decoupled from the main database connections.
