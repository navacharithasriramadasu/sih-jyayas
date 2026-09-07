# AgriConnect — Development Phases Plan
### Features + Techniques + Real-Time Architecture, Aligned to the Finalized Stack

This builds directly on `AgriConnect_TechStack_Final.md` — every phase below uses that exact stack (Expo/React Native, Express/TypeScript, Supabase/Postgres, FastAPI AI microservice). Nothing here introduces a new tool; it only sequences the build.

It also carries forward the **Backend vs AI/ML classification** from `AgriConnect_Backend_vs_AIML_Plan.md`, so each feature below is tagged with its honesty bucket:

| Bucket | Meaning |
|---|---|
| **A — Backend/Business Logic** | Plain code, no learning, no prediction |
| **B — Classical Algorithm/Optimization** | Deterministic algorithm, legitimate CS, but **not ML** |
| **C — Machine Learning/AI** | A model trained on data, producing a prediction with a confidence score |

Every AI-labeled feature includes its judge-defense answer — the honest response to *"what's actually AI here?"*

---

## Phase 0 — Foundations (Set Up Once, Never Touched Again)

| Task | Tool |
|---|---|
| Monorepo setup (`app/`, `backend/`, `ai-service/`) | Turborepo or simple npm workspaces |
| Database schema design | Supabase Postgres — tables: `farmers`, `fpos`, `buyers`, `listings`, `requirements`, `orders`, `payments`, `routes` |
| Auth setup | Supabase Auth — phone OTP for farmers, email/phone for buyers |
| App scaffold | Expo + Expo Router + NativeWind |
| AI service scaffold | FastAPI, empty endpoints stubbed | 
| CI/CD | GitHub Actions → auto-deploy backend + AI service to Render/Railway on push |
| Real-time channel setup | Supabase Realtime enabled on `listings`, `orders`, `routes` tables |

**Why this phase matters:** every later phase only adds features into this fixed skeleton — nothing structural changes after this point, which is the whole point of locking the stack first.

---

## Phase 1 — Core Platform (MVP Backbone)

| Feature | Bucket | Built with | Real-time behavior |
|---|---|---|---|
| Farmer/buyer/FPO registration | A | Supabase Auth (phone OTP) | — |
| Produce listing (crop, qty, location, images) | A | Expo form → Express API → Supabase Postgres + Storage | New listing broadcasts instantly to buyer browse screens via Supabase Realtime — no manual refresh |
| Buyer requirement submission | A | Same pattern | — |
| Basic rule-based matching | **B** | Express backend — weighted scoring (location + quantity + crop match) | Match results update live as new listings arrive |

**Judge-defense (matching):** *"This is a transparent weighted-scoring algorithm, not a black-box model — explainability matters more than opacity for a farmer-facing tool, so we're upfront that this is Bucket B, not ML."*

**Milestone:** a farmer can list produce, a buyer can post a requirement, and the two can find each other — fully live, no AI yet. This is your safety-net demo if anything later breaks.

---

## Phase 2 — AI Intelligence (Flagship Differentiator)

| Feature | Bucket | Built with | Real-time behavior |
|---|---|---|---|
| Demand forecasting | **C** | FastAPI + LightGBM, trained on public Agmarknet data | Forecast recalculated on a scheduled job (e.g., daily cron); farmers get a live notification via Supabase Realtime when a new opportunity appears for their crop |
| Price recommendation | **C** | FastAPI + LightGBM regression, same feature set | Computed synchronously the moment a farmer creates a listing — shown instantly with a confidence score |
| Matching score (upgraded from Phase 1) | B (unchanged) | Express calls FastAPI's scoring endpoint; result merged into the existing rule-based match | Live-updates same as Phase 1, now with a ranked score attached |

**Judge-defense (forecasting & pricing):** *"Both are genuine trained ML — LightGBM models trained on public Agmarknet data. Accuracy is reported as forecast error (MAPE/RMSE), not an invented percentage, and every recommendation ships with a confidence score, never a guarantee."*

**Trend alignment:** LightGBM is the current industry-standard choice for structured/tabular forecasting problems at this scale — fast, explainable (feature importances double as your "why this price" answer), and CPU-only, so it deploys anywhere without GPU cost.

**Milestone:** a farmer sees "predicted demand: high, recommended price: ₹X (72% confidence)" the moment they open the app — this is your single most important demo moment.

---

## Phase 3 — Quality & Logistics

| Feature | Bucket | Built with | Real-time behavior |
|---|---|---|---|
| AI-assisted quality assessment | **C** | FastAPI + fine-tuned MobileNetV3-Small (also exportable to TFLite for on-device offline preview in the Expo app) | Result returned within seconds of photo upload; low-confidence results auto-flagged for manual review |
| FPO aggregation | **B** | Express backend — greedy/bin-packing logic pooling farmer lots against a target order size | Aggregation progress bar updates live as each farmer's contribution is added (Supabase Realtime on `orders`) |
| Route optimization | **B** | FastAPI + Google OR-Tools (VRP solver) | Logistics partner's app receives the optimized route the moment it's generated, via Realtime subscription on `routes` |

**Judge-defense (quality):** *"This is genuine ML — an image classification model. We never present it as an absolute pass/fail; low-confidence results get flagged for manual review instead."*

**Judge-defense (aggregation & routing):** *"Both are classical algorithms — bin-packing for aggregation, OR-Tools' VRP solver for routing — not machine learning. Routing in particular is operations research, and we say so rather than overclaiming 'AI routing' as a black box."*

**Trend alignment:** exporting the quality model to TensorFlow Lite for on-device inference is directly relevant to rural deployment — the farmer's phone can still give a preliminary quality read even with no signal, syncing the final server-confirmed result once connectivity returns.

**Milestone:** full order lifecycle — list → forecast/price → match → aggregate → quality-check → route → deliver — working end-to-end live.

---

## Phase 4 — Advanced Accessibility

| Feature | Bucket | Built with | Real-time behavior |
|---|---|---|---|
| Voice-first entry (local language) | A + C (hybrid) | Expo Speech (on-device STT, free, offline-capable) → small trained intent classifier in FastAPI | Parsed listing appears instantly in the farmer's draft screen for confirmation |
| Offline-first resilience | A | Expo's local storage (SQLite/AsyncStorage) queues actions when offline | Queued actions auto-sync and broadcast via Realtime the moment connectivity returns |
| Simplified/local-language UI mode | A | NativeWind theming + i18n | — |

**Judge-defense (voice):** *"Speech-to-text is off-the-shelf and free — our actual AI contribution is the small trained intent classifier that extracts structured data (crop, quantity, action) from unstructured local-language speech. We keep it deliberately small rather than calling a heavy multilingual LLM, to keep latency and hosting cost near zero."*

**Milestone:** a farmer with patchy rural connectivity can still speak a listing, get a quality preview, and have everything sync automatically once back online — this is the strongest "real-world usage" answer you can give a judge.

---

## Cross-Cutting: Why Everything Is "Real-Time" Without a Custom WebSocket Server

Supabase Realtime works directly off Postgres's own replication stream — any INSERT/UPDATE on `listings`, `orders`, or `routes` broadcasts to subscribed clients automatically. This means:

- No separate Socket.io/WebSocket server to build, host, or debug
- One less moving part to deploy — fewer things that can break during a live demo
- Directly aligned with "current generation, lightweight" principle from the tech stack doc

**Judge-defense answer:** *"Real-time updates come from Supabase's built-in Realtime engine, which streams directly off Postgres changes — we didn't build a custom WebSocket layer because it would just be reinventing something that's already solved, reliable, and free at our scale."*

---

## Suggested Build Order for Hackathon Submission Window

| Priority | Phase | Why |
|---|---|---|
| 1 (must-have) | Phase 1 | Nothing else works without this |
| 2 (must-have) | Phase 2 | This is your actual differentiator — don't skip or shortcut it |
| 3 (strong add) | Phase 3 (route optimization + aggregation) | Completes the "end-to-end loop" story for your demo |
| 4 (nice-to-have) | Phase 3 (quality CV) + Phase 4 (voice) | Impressive if time allows, but the core story survives without them — build only if Phases 1–2 are rock solid first |

**Rule of thumb:** a fully working Phase 1 + Phase 2 loop beats a half-working Phase 1–4. Judges reward a complete, reliable narrow demo far more than a broad, fragile one.
