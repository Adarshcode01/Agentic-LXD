# System Blueprint: Google Always Free LMS AI Builder & Instructional Studio

---

## 1. Executive Summary & Vision

**Google Always Free LMS AI Builder** is an end-to-end, AI-native Learning Management System (LMS) and Instructional Authoring Studio engineered to run on **Google Cloud's Always Free Tier** paired with the **Google Gemini Generative AI Suite**.

Traditional corporate training and compliance platforms suffer from three structural bottlenecks:
1. **Slow, Static Authoring:** Converting dense corporate Standard Operating Procedures (SOPs) and regulatory manuals into interactive e-learning takes weeks of manual instructional design.
2. **Passive Learning & Disconnected Telemetry:** Learners click through static slides without deliberate practice, while L&D teams lack real-time, actionable telemetry to pinpoint *where* and *why* learners fail.
3. **High Infrastructure & Licensing Costs:** Enterprise LMS platforms, LRS (Learning Record Stores), and authoring suites charge steep per-seat licensing fees.

**How This System Makes a Difference:**
This platform closes the loop between **Content Ingestion → AI Pedagogical Structuring → Interactive Delivery → Real-Time xAPI Telemetry → Automated Course Remediation**, reducing course production time from weeks to minutes while continuously improving learning outcomes based on live learner behavior.

---

## 2. Core System Architecture

```
+-----------------------------------------------------------------------------------+
|                        DUAL-ROLE FRONTEND (React 19 + Vite)                       |
|                                                                                   |
|  [Instructional Designer & Admin Studio]        [Desktop & Mobile Learner Portal] |
|  • 6-Stage AI Authoring Pipeline                • Touch-First Course Player       |
|  • 3-Pane Interactive Storyboard Canvas         • Mobile Bottom-Sheet Navigation  |
|  • Multimedia AI Studio (Lyria, Veo, Live)      • AI Role-Play Simulator          |
|  • BigQuery xAPI Analytics & AI Remediation     • Automated Certification Engine  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                     APPLICATION SERVER & API GATEWAY (Express)                    |
|                                                                                   |
|  • /api/authoring/*   (Document Extraction, Pedagogical Analysis, Screen Collab)  |
|  • /api/tutor-chat    (Structured Rubric Role-Play Evaluation)                    |
|  • /api/ingest-xapi   (IEEE 9274.1.1 xAPI Statement Validation & Streaming)       |
|  • /api/media/*       (Lyria Music, Veo Video, Image Gen, Search Grounding, TTS)  |
|  • /api/live-stream   (WebSocket Bi-Directional Spoken Coaching via Gemini Live)  |
+-------------------+-----------------------------+---------------------------------+
                    |                             |
                    v                             v
+-----------------------------------+   +-------------------------------------------+
|   GOOGLE GEMINI AI MODEL SUITE    |   |    PERSISTENCE & TELEMETRY DATA LAYER     |
|                                   |   |                                           |
| • gemini-3.8-flash (Analysis/Gen) |   | • Firebase Authentication (Google OAuth)  |
| • gemini-3.5-transcribe (STT)     |   | • Cloud Firestore (Courses, Users, Media) |
| • gemini-3.8-live (Voice Coaching)|   | • BigQuery xAPI Lake (JSON Telemetry)     |
| • gemini-3.1-flash-lite-image     |   | • Client-Side ZIP Packager (SCORM/cmi5)   |
| • veo-3.1-lite-generate-preview   |   |                                           |
| • lyria-3-clip/pro-preview        |   |                                           |
+-----------------------------------+   +-------------------------------------------+
```

---

## 3. End-to-End Workflows: How It Works

### Workflow A: The 6-Stage "Create with AI" Authoring Pipeline
1. **Stage 1 — Multimodal Document Ingestion:**
   - Designers upload corporate documents (`.pdf`, `.docx`, `.pptx`, `.md`, `.txt`, `.srt`), choose from pre-loaded enterprise SOPs, paste raw policies, or record a live voice lecture transcribed via `gemini-3.5-transcribe`.
   - Select from curated enterprise brand themes (*Google Enterprise*, *Slate Tech*, *Nordic Minimal*, *Warm Editorial*).
2. **Stage 2 — Pedagogical Content Analysis & Source Separation:**
   - `gemini-3.8-flash` extracts measurable **Learning Objectives (Bloom's Taxonomy)**, **Core Concepts**, **Sequential Processes**, and **Critical Compliance Warnings**.
   - **Strict Source Separation Guarantee:** Every concept retains its **exact verbatim quote** from the source document alongside the AI's pedagogical explanation, ensuring zero regulatory hallucination or silent policy drift.
3. **Stage 3 — Curriculum Architecture & Chapter Outline:**
   - Designers review, rename, reorder, add, or remove chapters before screen generation. Custom chapters are dynamically mapped into interactive screen templates.
4. **Stage 4 — Interactive 3-Pane Authoring Studio:**
   - **Left Pane:** Chapter and screen hierarchy with lock indicators and `[Remediation]` badges.
   - **Center Pane:** Live WYSIWYG Interactive Canvas rendering 4 distinct pedagogical widget types:
     - *Comparison Matrices* (Option A vs. Option B contrasts)
     - *3D Tactile Flip Cards* (Active recall flashcards)
     - *Sequential Process Flows* (Step-by-step auditable procedures)
     - *Branching Workplace Scenarios* (Decision dilemmas with optimal/risky consequences)
   - **Right Pane:** One-click Gemini screen transformations (*Simplify to Grade 8*, *Convert to Flip Cards*, *Convert to Decision Scenario*, *Regenerate Prose*, *Screen Lock*).
5. **Stage 5 — Instructional Quality Approval Gate:**
   - Pre-flight audit verifying screen counts, assessment readiness, and xAPI telemetry remediation checks. Designers sign off to lock the release version (e.g., `v1.0 — Sealed`).
6. **Stage 6 — Multi-Format Packaging & Instant Distribution:**
   - **Option A (Internal LMS):** 1-click publish directly to the internal Learner Portal.
   - **Option B (External Standards Export):** In-browser ZIP compilation generating standards-compliant packages for third-party LMS platforms (Moodle, Canvas, Workday, Cornerstone):
     - **SCORM 1.2 (`.zip`)** with `imsmanifest.xml` and `API` runtime wrapper.
     - **cmi5 (`.zip`)** with `cmi5.xml` Assignable Unit specification.
     - **xAPI Launch Bundle (`.zip`)** with `tincan.xml` and LRS endpoint configuration.
   - Includes an embedded **In-Browser Runtime Sandbox** to test the exact exported HTML package before distribution.

---

### Workflow B: The Closed-Loop Telemetry & AI Remediation Engine
1. **Granular xAPI Event Emission:**
   - Every learner action (launching a course, flipping a card, answering a scenario, completing a quiz, or finishing a role-play) emits an **IEEE 9274.1.1 xAPI JSON statement** (`actor`, `verb`, `object`, `result`, `context`).
2. **Real-Time BigQuery Analytics & Engagement Trends:**
   - The **Analytics View** visualizes real-time telemetry using Recharts (`AreaChart` and `BarChart`) with dynamic time-horizon filtering (*Last 1 Hour*, *Today*, *Last 7 Days*, *Last 30 Days*, *All Time*).
3. **Automated Pedagogical Insight & 1-Click Fix:**
   - The system identifies high-friction drop-off points and assessment failures (e.g., *42% failure rate on TRID 3-Day Closing Disclosure rules*).
   - Clicking **"Improve Course with AI"** automatically synthesizes a targeted branching scenario screen, injects it into the problematic chapter, and links the designer directly into the Authoring Studio to review and publish the fix.

---

### Workflow C: Smartphone-Optimized Learner Portal & AI Role-Play Tutor
1. **Mobile-First Ergonomics:**
   - Built for both desktop workstations and frontline smartphone users (`375px–430px` viewports).
   - Features a **Natural Thumb-Zone Sticky Bottom Bar** (`46px+` touch targets), a **Slide-Up Bottom Sheet Course Outline**, and a real-time linear progress bar.
2. **AI Customer Role-Play Simulator (Structured Outputs):**
   - Learners practice de-escalating agitated enterprise customers or resolving compliance dilemmas in real time.
   - Powered by `gemini-3.8-flash` with strict `responseSchema` evaluation, grading every learner response across a 4-part rubric (*Empathy*, *Clarity*, *Problem Solving*, *Professional Tone*), providing live coaching tips, and emitting the final score to the xAPI stream.
3. **Automated Verifiable Certification:**
   - Passing a course assessment (`>= 75%`) automatically issues a verifiable completion certificate with a unique verification code and print/download support.

---

## 4. Comprehensive Feature Matrix & Impact Analysis

| Feature Pillar | Key Capabilities | Real-World Organisational Impact |
| :--- | :--- | :--- |
| **AI Instructional Authoring** | Multimodal ingestion, verbatim quote preservation, 4 interactive screen widgets, 1-click AI prose & widget transformations. | Cuts course development time by **80–90%** while enforcing strict compliance accuracy. |
| **Portable Standards Packaging** | Client-side ZIP generation for **SCORM 1.2**, **cmi5**, and **xAPI**, plus an interactive HTML sandbox preview. | Eliminates vendor lock-in; courses work natively in any legacy or modern enterprise LMS. |
| **Multimodal AI Media Studio** | **Lyria** ambient soundtracks, **Veo 3** video & diagram animation, **Gemini Image** vectors, **Google Search Grounding**, and **Gemini Live** voice coaching. | Replaces expensive external media production agencies with instant, bespoke instructional assets. |
| **AI Role-Play Simulator** | Live persona simulation with real-time `responseSchema` rubric grading and instant coaching feedback. | Moves compliance training from passive reading to active behavioral rehearsal under realistic pressure. |
| **BigQuery xAPI Telemetry** | Real-time JSON statement ingestion, verb distribution charts, chapter drop-off indices, and closed-loop AI course remediation. | Transforms L&D from a "check-the-box" cost center into a data-driven performance optimization engine. |
| **Mobile-First Learner UX** | Thumb-zone navigation, slide-up outline drawer, tactile flip cards, and responsive assessment controls. | Enables on-the-go microlearning for field staff, retail associates, and remote teams on smartphones. |

---

## 5. Security, Governance & Cloud Infrastructure

- **Authentication & Access Control:**
  - Seamless **Guest Mode** for immediate frictionless exploration, paired with **Firebase Google OAuth** (`signInWithPopup`) for persistent cloud workspaces.
  - Hardened **`firestore.rules`** enforcing strict document ownership (`request.auth.uid == resource.data.ownerId`) across `/users/{userId}`, `/courses/{courseId}`, and `/media_assets/{assetId}`.
- **API Key Hygiene:**
  - Zero client-side API key exposure. All `@google/genai` SDK invocations execute exclusively on the Express backend (`/api/*`).
- **Always-Free Tier Cost Efficiency:**
  - Designed to operate within Google Cloud's Always Free usage envelopes (Cloud Run / Node server, Firestore document quotas, BigQuery sandbox/free tier, and `gemini-3.8-flash` high-efficiency inference).
