# Google Always Free LMS AI Builder & Instructional Studio

**Cloud AI Builder Cup Submission**  
*An AI-Native E-Learning Authoring Studio, Portable SCORM/cmi5/xAPI Packager, Real-Time BigQuery Telemetry Lake, and Closed-Loop Course Remediation Engine built on Google Cloud's Always Free Tier & Gemini AI Suite.*

---

## Live Prototype Links

- **Shared / Evaluation App URL:** `https://ais-pre-d7h7pcvklqo3swck7uy5zv-788095269972.asia-southeast1.run.app`
- **Development App URL:** `https://ais-dev-d7h7pcvklqo3swck7uy5zv-788095269972.asia-southeast1.run.app`

---

## What We Built (Overview)

Corporate training and compliance teams spend weeks manually converting Standard Operating Procedures (SOPs) and policy PDFs into static slide decks, while learners disengage and L&D leaders lack actionable telemetry to fix failing modules.

**Google Always Free LMS AI Builder** solves this by uniting **four capabilities in a single zero-cost cloud architecture**:
1. **6-Stage "Create with AI" Authoring Pipeline:** Ingests PDFs, Word docs, slide decks, text, or live spoken lectures (`gemini-3.5-transcribe`), extracts Bloom's Taxonomy objectives and **verbatim source quotes** (`gemini-3.8-flash`) with zero policy hallucination, and builds interactive multi-chapter modules (*3D Flip Cards*, *Branching Scenarios*, *Process Flows*, *Comparison Matrices*).
2. **Portable Standards Packaging (Zero Vendor Lock-In):** Compiles downloadable **SCORM 1.2 (`.zip`)**, **cmi5 (`.zip`)**, and **xAPI (`.zip`)** packages directly in the browser via `JSZip`, complete with an embedded runtime sandbox.
3. **Smartphone-Optimized Learner Portal & AI Role-Play Simulator:** Features thumb-zone mobile navigation (`46px+` hitboxes), a slide-up course outline drawer, automated verifiable certificates, and a live **AI Customer Role-Play Tutor** that grades learner empathy and compliance using Gemini `responseSchema`.
4. **BigQuery xAPI Telemetry & 1-Click AI Remediation:** Captures IEEE 9274.1.1 xAPI JSON statements, visualizes engagement trends in Recharts across 5 time horizons, detects high-failure drop-off chapters, and auto-injects targeted remedial scenarios in one click.

---

## System Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Recharts, Lucide Icons, JSZip (Client-side SCORM/cmi5 compiler)
- **Backend:** Node.js, Express, WebSocket (`ws`) for bi-directional 16kHz PCM audio streaming
- **Google Gemini AI Models (`@google/genai` SDK):**
  - `gemini-3.8-flash`: Pedagogical content analysis, structured JSON rubric evaluation, screen transformations, and search grounding (`googleSearch`)
  - `gemini-3.5-transcribe`: Voice lecture & trainee speech-to-text transcription
  - `gemini-3.8-live`: Real-time bi-directional spoken role-play coaching
  - `gemini-3.1-flash-lite-image`: Isometric instructional vector graphics generation
  - `veo-3.1-lite-generate-preview`: Scenario video & diagram animation
  - `lyria-3-clip-preview` / `lyria-3-pro-preview`: Ambient focus soundtracks
- **Database & Auth:** Firebase Authentication (Google OAuth + Guest Mode) & Cloud Firestore (`courses`, `users`, `media_assets`) + BigQuery xAPI JSON Lake

---

## Local Development & Deployment

### Prerequisites
- Node.js 20+
- A Google Gemini API Key (`GEMINI_API_KEY`)

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# 3. Start full-stack development server (Port 3000)
npm run dev

# 4. Production build & start
npm run build
npm start
```

---

## Repository Structure

```
├── server.ts                         # Express API gateway, Gemini SDK routes, xAPI lake & Live WS
├── src/
│   ├── App.tsx                       # Dual-role state orchestrator (Instructional Designer vs Learner)
│   ├── components/
│   │   ├── AuthoringStudio.tsx       # 6-Stage AI Authoring Pipeline & 3-Pane Interactive Studio
│   │   ├── LearnerPortalView.tsx     # Desktop & Smartphone-Optimized Course Player & Certificates
│   │   ├── RolePlayTutorView.tsx     # Structured-Output AI Customer Role-Play Simulator
│   │   ├── AnalyticsView.tsx         # Recharts xAPI Telemetry Trends & 1-Click AI Remediation
│   │   ├── MultimediaStudioView.tsx  # Lyria Music, Veo Video, Image Gen, Live Voice & Search Grounding
│   │   ├── CoursesView.tsx           # Course Catalog & Management
│   │   ├── LearnersView.tsx          # Cohort Roster & Progress Tracking
│   │   └── DashboardView.tsx         # Executive L&D KPI Overview
│   ├── utils/
│   │   └── scormPackager.ts          # Client-side SCORM 1.2, cmi5 & xAPI ZIP generator
│   └── lib/
│       └── firebase.ts               # Firebase Auth & Cloud Firestore persistence layer
├── firestore.rules                   # Hardened owner-based Firestore security rules
├── SYSTEM_BLUEPRINT.md               # Full architectural & pedagogical system blueprint
└── PERFORMANCE_BENCHMARK_REPORT.md   # Empirical build, latency, and Always-Free quota benchmarks
```
