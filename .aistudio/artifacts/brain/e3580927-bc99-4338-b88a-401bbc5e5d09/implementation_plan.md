# Implementation Plan: AI-Powered E-Learning Development, Distribution & Analytics Platform

Transform the platform into a modern, streamlined, end-to-end AI learning suite spanning the complete lifecycle: **Create → Design → Review → Approve → Publish → Distribute → Learn → Track → Analyse → Improve**.

Technical cloud jargon (BigQuery, Cloud Run, SQL querying, and architecture inspector modals) is stripped from the user interface, moving all power behind a clean, intuitive experience with simple language.

---

## 1. User Intent & Clarification Outcomes

- **Dual-Experience Switcher**: A persistent top-bar role toggle switching seamlessly between **Instructional Designer / Admin** and **Learner** view modes.
- **Primary Landing**: A clean, executive **Dashboard** displaying key learning KPIs (*Courses*, *Active Learners*, *Completion Rate*, *Average Score*, *Pending Learning*) and quick-action shortcuts.
- **Distribution Model**: Dual-track publishing supporting both **Publish to Platform LMS** (instant learner enrollment) and **Download Package** (production-ready SCORM 1.2, cmi5, and xAPI packages).

---

## 2. Core Architecture & Navigation

The platform is structured into three primary engines accessed through a clean 5-item navigation for designers, plus a distraction-free learner portal:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI E-LEARNING BUILDER     [Dashboard] [Courses] [Create with AI] [Learners] [Analytics]   [Switch to Learner] [User] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### A. Main Navigation (Instructional Designer / Admin)
1. **Dashboard**: Executive summary with 6 high-level KPIs, visual completion charts, recent course activity, and prioritized AI insights.
2. **Courses**: Simple catalog with course status (*Draft*, *Approved*, *Published*), learner enrollments, completion rates, average scores, and one-click actions (*Open*, *Edit*, *Preview*, *Publish*, *Export*, *Analytics*).
3. **Create with AI**: Guided 7-step creation wizard:
   - **Step 1: Upload Content** (PDF, DOCX, PPTX, TXT, MD, SOPs, Transcripts with client & multimodal Gemini extraction).
   - **Step 2: AI Analysis** (Preserves source facts, identifies learning objectives, core concepts, processes, assessment points).
   - **Step 3: Course Blueprint** (Interactive outline: add/delete/reorder chapters, edit objectives, customize tone).
   - **Step 4: Generate Course** (AI builds interactive screens, process diagrams, comparison cards, timelines, quizzes).
   - **Step 5: Visual Review & Edit** (Full WYSIWYG editor: edit copy, change interaction types, regenerate sections, preview).
   - **Step 6: Approve** (Formal version stamping, e.g. *Version 1.0 — Approved*).
   - **Step 7: Publish & Distribute** (One-click *Publish to Platform LMS* or download *SCORM 1.2*, *cmi5*, *xAPI*).
4. **Learners & Teams**:
   - **Learner 360 Profile**: Assigned modules, completion progress, assessment scores, certificates earned, weak areas.
   - **Course Assignment Modal**: Assign modules to individual learners, teams, or departments with target due dates.
5. **Analytics & AI Insights**:
   - **Decision-Driven Performance**: Course completion %, score distributions, drop-off points, and challenging questions.
   - **AI Insights & Auto-Remediation**: Natural language diagnostic summary (e.g. *"Learners struggle with Chapter 2 eligibility rules"*) with a 1-click **"Improve with AI"** or **"Generate Remediation"** action.

### B. Learner Experience
1. **Learner Dashboard ("My Learning")**:
   - Tabs: **Assigned**, **In Progress**, **Completed**, and **Certificates**.
   - Course cards displaying progress %, estimated time, score, and prominent **"Continue Learning"** buttons.
2. **Interactive Course Player**:
   - Dedicated clean learner view for consuming chapters, interacting with accordions/timelines/comparisons, and taking quizzes.
   - Generates completion timestamps and downloadable **Certificate of Achievement** upon passing.
3. **AI Role-Play Simulation**:
   - Realistic customer/borrower simulation evaluating empathy, accuracy, and policy adherence with instant coaching feedback.

---

## 3. Component Refactoring & File Structure

### Modified & Enhanced Components:
- **`src/components/Header.tsx`**: Replace technical cloud links with simple 5-item navigation, role switcher pill (*Designer / Learner*), and quiet auth status.
- **`src/components/DashboardView.tsx`**: New clean executive dashboard with KPI tiles, trend bars, recent courses, and AI recommendation cards.
- **`src/components/CourseCatalogView.tsx`**: Course management table/cards with status badges, version numbers, assign modals, and SCORM/cmi5 export triggers.
- **`src/components/AuthoringStudio.tsx`**: Refactor into the 7-step wizard (*Upload → Analyse → Blueprint → Generate → Review/Edit → Approve → Publish*), removing all developer/debug clutter.
- **`src/components/LearnerPortalView.tsx`**: New learner portal featuring *My Learning*, course progress tracking, interactive learning player, and certificate modal.
- **`src/components/LearnerManagementView.tsx`**: Learner 360 view, enrollment management, and course assignment.
- **`src/components/AnalyticsView.tsx`**: Clean business analytics combining course performance, question difficulty, team breakdowns, and actionable AI insights.
- **`src/App.tsx`**: State coordinator managing active views, role switching, synced Firestore course/learner state, and package exports.

---

## 4. Verification & Testing Plan

1. **Compilation & Build**:
   - Run `lint_applet` and `compile_applet` to ensure zero TypeScript errors.
2. **End-to-End Workflow Validation**:
   - **Document Upload & AI Generation**: Test uploading training document, generating blueprint, editing chapters, and rendering interactive screens.
   - **Approve & Publish**: Confirm version stamping, instant publication to the internal LMS, and zip download generation for SCORM 1.2 and cmi5.
   - **Learner Experience**: Switch to Learner view, launch course, complete screens and quiz, view score and generated certificate.
   - **Analytics & Remediation**: Verify quiz results immediately update the course analytics and trigger proactive AI recommendations.
