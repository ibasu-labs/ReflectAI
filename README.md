# ReflectAI

> **"Your private AI thinking space that learns how your thinking evolves."**

ReflectAI is a secure, authenticated, AI-powered personal reflection platform built as a submission for the **Google Cloud Run AI Challenge**. It pairs high-empathy multi-turn reflective inquiry with durable personal memory, location context via Google Maps Platform, longitudinal shift analysis ("What Changed?"), and grounded semantic inquiry ("Ask My Journal") — designed strictly for authenticated user data isolation with zero cross-user leakage.

---

## 📑 Table of Contents

1. [Architecture & Technology Stack](#-architecture--technology-stack)
2. [Comprehensive Feature Catalog](#-comprehensive-feature-catalog)
   - [1. Workspace & Multi-Perspective Reflective Modes](#1-workspace--multi-perspective-reflective-modes)
   - [2. Google Maps Platform Spatial Grounding](#2-google-maps-platform-spatial-grounding)
   - [3. Two-Stage Autonomous Personal Memory Engine](#3-two-stage-autonomous-personal-memory-engine)
   - [4. Personal Memories Management (CRUD)](#4-personal-memories-management-crud)
   - [5. "Ask My Journal" Grounded Semantic Q&A](#5-ask-my-journal-grounded-semantic-qa)
   - [6. "What Changed?" Longitudinal Shift Analysis](#6-what-changed-longitudinal-shift-analysis)
   - [7. Periodic Reflection Synthesizer](#7-periodic-reflection-synthesizer)
   - [8. In-App Security Center & Diagnostic Probes](#8-in-app-security-center--diagnostic-probes)
3. [End-to-End Data Flows & Sequence Diagrams](#-end-to-end-data-flows--sequence-diagrams)
4. [Backend API Reference](#-backend-api-reference)
5. [Firestore Database Schema & Path Isolation](#-firestore-database-schema--path-isolation)
6. [Cloud Firestore Security Rules](#-cloud-firestore-security-rules)
7. [Agentic Threat Modeling Summary (The 5 Threat Zones)](#-agentic-threat-modeling-summary-the-5-threat-zones)
8. [Automated Security Test Suite (SEC-01 to SEC-18)](#-automated-security-test-suite-sec-01-to-sec-18)
9. [Google Cloud Secret Manager Setup](#-google-cloud-secret-manager-setup)
10. [Google Cloud Run Deployment Guide](#-google-cloud-run-deployment-guide)
11. [Running Tests Locally](#-running-tests-locally)
12. [Troubleshooting & Resilience Matrix](#-troubleshooting--resilience-matrix)

---

## 🌟 Architecture & Technology Stack

```
                     ┌────────────────────────────────────────────────────────┐
                     │              Web Browser Client (SPA)                  │
                     │  React 18 + Tailwind CSS + Lucide Icons + Vite Bundler  │
                     └───────────────┬────────────────────────┬───────────────┘
                                     │                        │
         Firebase Auth ID Token (JWT)│                        │ Direct Real-Time SDK
                                     ▼                        ▼
┌──────────────────────────────────────────────┐    ┌───────────────────────────────────┐
│           Google Cloud Run Container         │    │       Cloud Firestore DB          │
│  Node.js + Express Server (Port 3000)        │    │  (Owner-Bound Security Rules)     │
│  - Firebase Admin SDK (Token Verification)   │    │  - /users/{uid}/interactions      │
│  - Resilient Model Fallback Ladder           │    │  - /users/{uid}/memories          │
│  - Indirect Prompt Injection Defense (XML)   │    └───────────────────────────────────┘
│  - Defensive Payload Ingestion & Sanitizer   │
└──────────────────────┬───────────────────────┘
                       │
       Internal Secret │ process.env.GEMINI_API_KEY
                       ▼
┌──────────────────────────────────────────────┐
│       Google Cloud Secret Manager            │
│  - GEMINI_API_KEY (Auto-replication)         │
└──────────────────────────────────────────────┘
                       │
          Secure HTTPS │ Models: gemini-3.6-flash ➔ gemini-3.1-flash-lite ➔ gemini-flash-latest ➔ gemini-3.7-flash
                       ▼
┌──────────────────────────────────────────────┐
│       Google Gemini Models API               │
│  (@google/genai TypeScript SDK)              │
└──────────────────────────────────────────────┘
```

| Layer | Component / Service | Purpose |
| :--- | :--- | :--- |
| **Authentication** | **Firebase Authentication** | Single-user identity verification via Google Sign-In with automatic fallback for popup-blocked or restricted iframe contexts, plus a zero-credential Guest Demo. |
| **Database** | **Cloud Firestore** | Scoped, owner-isolated persistence under `/users/{userId}/interactions` and `/users/{userId}/memories`. |
| **AI Reasoning** | **Gemini 3.6 Flash** (`@google/genai`) | Multi-turn compassionate reflection, longitudinal analysis, memory extraction, and semantic search via an automated 4-tier model fallback ladder. |
| **Security & Secrets** | **Google Cloud Secret Manager** | Secure zero-hardcoding hygiene for `GEMINI_API_KEY` and private service credentials. |
| **Compute & Runtime** | **Google Cloud Run** | Fully managed serverless container running unified Node.js + Express backend and Vite React frontend on port 3000. |
| **Spatial Grounding** | **Google Maps Platform** | Location-aware journal reflections using `@vis.gl/react-google-maps`, Google Places API, and defensive `MapErrorBoundary` fallbacks. |

---

## 🚀 Comprehensive Feature Catalog

### 1. Workspace & Multi-Perspective Reflective Modes

The core journal writing interface allows users to reflect either in freewrite mode or through guided multi-turn dialogue with Gemini.

* **5 Reflective Modes**:
  1. **Reflect (Default)**: Deep, gentle inquiry. Validates emotions, poses 1–2 poignant questions to provoke deeper self-awareness, and highlights recurring cognitive themes.
  2. **Summarize**: Clear, high-level synthesis. Generates an executive 2–3 sentence overview, bullet points of key lessons, and high-impact takeaways.
  3. **Brainstorm**: Generates creative options, alternative perspectives, and lateral thinking angles for personal challenges or decisions.
  4. **Action Plan**: Converts raw reflections into concrete, prioritized SMART action steps with accountability milestones.
  5. **Gratitude**: Focuses on positive cognitive reframing, savors meaningful moments, and reinforces mindful appreciation.
* **Dynamic Follow-Up Suggestions**: Gemini generates 2–3 contextual prompts to encourage deeper exploration with a single click.
* **Emotional State Tracking**: Users tag reflections with their current mood (*energized*, *calm*, *thoughtful*, *challenging*, *grateful*), which feeds directly into the AI's contextual empathy.
* **Auto-Save with Persistence Integrity**: Real-time Firestore synchronization with visual status indicators (`saving`, `saved`, `error`). The user's input buffer is never cleared until Firestore confirms document commit.

### 2. Google Maps Platform Spatial Grounding

Journal entries can be anchored to physical places, providing spatial context for memory recall and reflective grounding.

* **Places Autocomplete & Search**: Users search for landmarks, cities, cafes, or parks. Coordinates (latitude/longitude), formatted address, and display name are captured.
* **Defensive Map Rendering (`MapErrorBoundary`)**:
  - Interactive map powered by `@vis.gl/react-google-maps` with a custom DOM pin marker that avoids React 19 portal incompatibilities.
  - If the Google Maps API key is unconfigured, rate-limited, or blocked by iframe security policies, the component automatically falls back to an interactive card displaying coordinates, address, and a direct Google Maps link (`https://www.google.com/maps/search/?api=1&query=...`).
* **Location Prompt Injection Defense**: Location display names are sanitized (stripping angle brackets and length-capped to 150 characters) and encapsulated in `<untrusted_journal_location>` XML tags to prevent malicious place names from injecting commands into the AI model.

### 3. Two-Stage Autonomous Personal Memory Engine

Gemini Vault extracts enduring personal memories from reflections without human clutter, maintaining strict privacy and data hygiene.

* **Two-Stage Extraction Pipeline**:
  - **Stage 1 (Server-Side Extraction & Validation)**: Cloud Run endpoint `/api/memories/extract` uses Gemini 3.6 Flash to analyze reflections. It filters out transient daily logs, extracting at most ONE enduring memory.
  - **Stage 2 (Verified Client-Side Persistence)**: Only after Stage 1 successfully returns a valid, schema-conforming memory object does the client persist it to `/users/{userId}/memories/{memoryId}`. If extraction fails, no dirty state or corrupt document is written.
* **7 Memory Categories**:
  - `core_value`: Fundamental beliefs, ethics, and guiding principles.
  - `goal`: Aspirational targets, long-term visions, or milestones.
  - `habit`: Daily routines, mindfulness practices, and recurring behaviors.
  - `preference`: Work styles, environmental preferences, and personal likes/dislikes.
  - `relationship`: Key dynamics with family, friends, mentors, or colleagues.
  - `milestone`: Major life events, achievements, and career transitions.
  - `insight`: Psychological self-discoveries and cognitive breakthroughs.
* **Strict Provenance & Confidence**:
  - Every memory explicitly tags `provenance` as either `explicitly_stated` (the user directly declared it) or `ai_inferred` (synthesized from context).
  - A numerical confidence score (`0.0` to `1.0`) is stored alongside the source entry ID and timestamp.
* **Input Bounds**: Memory text is strictly capped at 1,000 characters to prevent buffer and token exhaustion.

### 4. Personal Memories Management (CRUD)

Users maintain complete, sovereign control over their memories in the dedicated **Memories** dashboard.

* **Browse & Search**: Filter memories by category or search by keywords.
* **Categorical Filtering**: Quick filters for Core Values, Goals, Habits, Insights, etc.
* **Inline Editing**: Edit memory text directly in the UI. Updates trigger an optimistic local update and a sanitized Firestore commit.
* **Permanent Deletion (Right to Erasure)**: Users can permanently purge any memory from Firestore with immediate query invalidation.

### 5. "Ask My Journal" Grounded Semantic Q&A

Users can ask open-ended questions about their historical reflections and memories with strict hallucination controls.

* **Strict Factuality Guardrails**:
  - **Explicit Facts**: Bulleted list of statements directly quoted or declared by the user.
  - **AI Interpretations**: Clearly separated inferences and psychological observations.
  - **Direct Citations**: Clickable cards referencing the source journal entry or memory ID with verbatim excerpts.
* **Fail-Closed Insufficient Evidence**:
  - If the user asks about a topic not mentioned in their journal (e.g., *"What did I say about scuba diving in Hawaii?"*), the system returns `hasSufficientEvidence: false` and explicitly reports: *"There is insufficient evidence in your journal reflections or personal memories regarding this topic."*
* **Context Minimization**: Only the user's top relevant journal snippets and active memories are supplied to the prompt—never entire unfiltered histories.

### 6. "What Changed?" Longitudinal Shift Analysis

"What Changed?" compares earlier journal entries against recent entries to identify how the user's mindset, priorities, and habits have evolved.

* **6 Change Dimensions Analyzed**:
  - `goals`: Evolving ambitions and targets.
  - `priorities`: Shifts in time, attention, and daily focus.
  - `habits`: Established, modified, or retired routines.
  - `values`: Deepening or re-ordered philosophical beliefs.
  - `decisions`: Key forks in the road and rationale changes.
  - `themes`: Shifting psychological or creative topics.
* **Side-by-Side Evidence Citations**: Every identified shift presents earlier quote evidence alongside recent quote evidence with dates and entry titles.
* **Continuity Anchors**: Identifies 1–3 core values or anchors that have remained steady throughout the entire journaling timeline.
* **Growth Reflection Questions**: Suggests 2 introspective questions tailored to the user's observed trajectory.
* **Non-Diagnostic & Non-Medical**: Strict instructions prevent clinical or psychiatric diagnoses, maintaining a supportive coaching framework.

### 7. Periodic Reflection Synthesizer

Available via the **Synthesize Reflections** button in the Workspace:
* Compiles the last 10 journal entries into a structured thematic overview.
* Identifies dominant recurring patterns, emotional trajectories, and productivity trends.
* Recommends constructive focus areas for upcoming reflections.

### 8. In-App Security Center & Diagnostic Probes

A dedicated visual control center demonstrating the application's production security posture.

* **5 Threat Zones Matrix**: Live documentation mapping potential threats to active countermeasures.
* **Automated SEC-01 to SEC-18 Suite**: Runs 18 automated security and architectural assertions against the backend (`POST /api/security/run-tests`).
* **Live System Diagnostic Probes**: Tests Firestore write latency, Firebase ID token validity, and Gemini model fallback readiness in real time.

---

## 🔄 End-to-End Data Flows & Sequence Diagrams

### Flow 1: Journal Writing & Auto-Save
```
User Types in Workspace
         │
         ▼
Debounced Input Handler (500ms)
         │
         ▼
Sanitizer strips undefined fields
         │
         ▼
Client writes to /users/{uid}/interactions/{id}
         │
         ├───▶ [Success] UI displays "Saved" badge (Persisted)
         └───▶ [Failure] UI retains input buffer, displays "Retry Save"
```

### Flow 2: Two-Stage Personal Memory Extraction
```
User clicks "Extract Memory"
         │
         ▼
Client sends POST /api/memories/extract with Bearer <ID_TOKEN>
         │
         ▼
Server verifies Firebase ID token with Admin SDK (Derives UID)
         │
         ▼
Server wraps reflection in <untrusted_journal_content> XML
         │
         ▼
Server invokes Gemini 3.6 Flash via Resilient Fallback Ladder
         │
         ▼
Gemini returns structured JSON: { found: true, text: "...", category: "goal", confidence: 0.95 }
         │
         ▼ [Stage 1 Complete: Validated]
Server responds with memory document
         │
         ▼ [Stage 2 Begins: Verified Client Persistence]
Client validates memory schema & length (<= 1000 chars)
         │
         ▼
Client commits to /users/{uid}/memories/{memoryId} in Cloud Firestore
         │
         ▼
UI displays confirmation toast and adds memory to state
```

### Flow 3: "Ask My Journal" Semantic Query
```
User submits question (e.g. "What have I learned about managing stress?")
         │
         ▼
Client sends POST /api/journal/ask with Bearer <ID_TOKEN>
         │
         ▼
Server verifies token & fetches user-scoped interactions and memories (/users/{uid}/**)
         │
         ▼
Server extracts relevant snippets via keyword scoring & context minimization
         │
         ▼
Server constructs grounded prompt with strict XML encapsulation
         │
         ▼
Gemini synthesizes answer:
- Explicit Facts (direct quotes)
- Inferred Interpretations (differentiated)
- Citations (entry IDs, excerpts)
- Or: "Insufficient Evidence" if topic absent
         │
         ▼
Client renders formatted answer with clickable source citations
```

---

## 📡 Backend API Reference

All backend endpoints run inside the Cloud Run container (`server.ts`) on port 3000.

### 1. `POST /api/gemini/converse`
Generates a multi-turn reflective response.
* **Headers**: `Content-Type: application/json`, `Authorization: Bearer <ID_TOKEN>` (Optional in guest mode)
* **Request Body**:
  ```json
  {
    "mode": "reflect",
    "messages": [
      { "role": "user", "content": "I am feeling overwhelmed by project deadlines." }
    ],
    "userPrompt": "How can I regain focus?",
    "title": "Deadline Stress",
    "userContext": { "mood": "challenging" },
    "location": {
      "displayName": "Central Park",
      "address": "New York, NY",
      "latitude": 40.785091,
      "longitude": -73.968285
    }
  }
  ```
* **Response Body**:
  ```json
  {
    "reply": "Reflective text formatted in Markdown...",
    "suggestedTitle": "Navigating Deadline Overwhelm",
    "keyInsights": ["Recognizing cognitive overload", "Need for boundary setting"],
    "actionItems": ["Block 2 hours of distraction-free time tomorrow morning"],
    "modelUsed": "gemini-3.6-flash"
  }
  ```

### 2. `POST /api/memories/extract`
Extracts a durable personal memory from a journal reflection.
* **Headers**: `Content-Type: application/json`, `Authorization: Bearer <FIREBASE_ID_TOKEN>` (Required)
* **Request Body**:
  ```json
  {
    "entryId": "entry_123",
    "content": "I decided today that reading deeply for 30 minutes each morning is non-negotiable for my mental clarity."
  }
  ```
* **Response Body**:
  ```json
  {
    "found": true,
    "memory": {
      "id": "mem_1725619200000_abc12",
      "text": "Committed to reading deeply for 30 minutes every morning before digital screens.",
      "category": "habit",
      "confidence": 0.95,
      "provenance": "explicitly_stated",
      "sourceRef": {
        "entryId": "entry_123",
        "origin": "journal_entry"
      },
      "createdAt": "2026-09-06T15:00:00.000Z",
      "updatedAt": "2026-09-06T15:00:00.000Z"
    },
    "modelUsed": "gemini-3.6-flash"
  }
  ```

### 3. `POST /api/journal/ask`
Answers natural language questions grounded strictly in the user's historical entries and memories.
* **Headers**: `Content-Type: application/json`, `Authorization: Bearer <FIREBASE_ID_TOKEN>` (Required)
* **Request Body**:
  ```json
  {
    "question": "What goals have I set regarding my marathon training?",
    "cachedEntries": [ /* Optional client cache for low-latency retrieval */ ],
    "cachedMemories": [ /* Optional client cache */ ]
  }
  ```
* **Response Body**:
  ```json
  {
    "answer": "You committed to running the Berlin Marathon this autumn, training 4 days a week.",
    "hasSufficientEvidence": true,
    "explicitFacts": [
      "Committed to running the Berlin Marathon this autumn",
      "Training 4 days a week with focus on recovery"
    ],
    "interpretations": [
      "Prioritizing consistent endurance over aggressive speed targets"
    ],
    "citations": [
      {
        "type": "journal_entry",
        "id": "entry_101",
        "titleOrCategory": "Marathon Preparations",
        "excerpt": "Committed to running the Berlin Marathon this autumn. Running 4 days a week."
      }
    ],
    "modelUsed": "gemini-3.6-flash"
  }
  ```

### 4. `POST /api/journal/what-changed`
Analyzes longitudinal cognitive, behavioral, and priority shifts over time.
* **Headers**: `Content-Type: application/json`, `Authorization: Bearer <FIREBASE_ID_TOKEN>` (Required)
* **Request Body**:
  ```json
  {
    "cachedEntries": [ /* Client journal records */ ],
    "cachedMemories": [ /* Client memory records */ ]
  }
  ```
* **Response Body**:
  ```json
  {
    "overview": "Over the past several months, your focus has evolved from reactive firefighting to structured intentional deep work.",
    "timeRange": {
      "earliestDate": "2026-06-01T10:00:00.000Z",
      "latestDate": "2026-09-05T18:30:00.000Z",
      "totalEntriesAnalyzed": 14
    },
    "changes": [
      {
        "category": "habits",
        "title": "Transition to Morning Deep Work",
        "observedChange": "Shifted from checking email immediately upon waking to protecting the first 90 minutes of the morning for deep creative focus.",
        "earlierEvidence": {
          "date": "2026-06-05",
          "quote": "I find myself checking notifications before getting out of bed and feeling scattered.",
          "sourceId": "entry_01",
          "sourceTitle": "Morning Routine Reflections"
        },
        "recentEvidence": {
          "date": "2026-09-02",
          "quote": "Protected 90 minutes of uninterrupted writing before opening my inbox. Tremendous sense of flow.",
          "sourceId": "entry_14",
          "sourceTitle": "Deep Work Flow"
        },
        "confidence": 0.92
      }
    ],
    "continuity": [
      "A steadfast commitment to physical health and daily running as an emotional grounding practice."
    ],
    "growthQuestions": [
      "What new boundaries might you need to establish as your deep work commitments expand?"
    ],
    "modelUsed": "gemini-3.6-flash"
  }
  ```

### 5. `POST /api/security/run-tests`
Executes the SEC-01 through SEC-18 automated test suite.
* **Headers**: `Content-Type: application/json`
* **Response Body**:
  ```json
  {
    "timestamp": "2026-09-06T15:30:00.000Z",
    "totalTests": 18,
    "passedCount": 18,
    "failedCount": 0,
    "authenticatedUserPrefix": "user_1***",
    "tests": [
      {
        "code": "SEC-01",
        "title": "Unauthenticated Journal Access Rejection",
        "category": "auth",
        "expectedOutcome": "HTTP 401 Unauthorized",
        "status": "passed",
        "resultDetails": "Server-side verifyFirebaseAuth rejects missing Bearer headers."
      }
      /* ... SEC-02 through SEC-18 ... */
    ]
  }
  ```

### 6. `GET /api/health`
Container health check endpoint for Cloud Run traffic ingress routing.
* **Response**: `{ "status": "ok" }`

---

## 🗄️ Firestore Database Schema & Path Isolation

All user-generated records reside under user-scoped subcollections. Cross-user access is impossible under the security rules.

### Path 1: `/users/{userId}` (User Root Profile)
```typescript
interface UserProfileDocument {
  uid: string;                 // Matches request.auth.uid
  email: string | null;        // Authenticated email address
  displayName: string | null;  // User display name
  photoURL: string | null;     // Avatar URL
  isAnonymous?: boolean;       // True if using Guest Demo
  createdAt: string;           // ISO 8601 string
  lastActiveAt: string;        // ISO 8601 string
}
```

### Path 2: `/users/{userId}/interactions/{interactionId}` (Journal Reflections)
```typescript
interface JournalInteractionDocument {
  id: string;                  // Unique interaction UUID
  userId: string;              // Owner UID (request.auth.uid)
  title: string;               // Reflection title
  category?: string;           // Optional user category
  tags: string[];              // User tags (e.g. ["focus", "work"])
  mode: 'reflect' | 'summarize' | 'brainstorm' | 'action_plan' | 'gratitude';
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  summary?: string;            // AI-generated summary
  keyInsights?: string[];      // AI-extracted takeaways
  actionItems?: string[];      // AI-extracted action steps
  location?: {                 // Grounded spatial metadata
    placeId?: string;
    displayName: string;
    address?: string;
    latitude: number;
    longitude: number;
  };
  mood?: 'energized' | 'calm' | 'thoughtful' | 'challenging' | 'grateful';
  createdAt: string;           // ISO 8601 string
  updatedAt: string;           // ISO 8601 string
}
```

### Path 3: `/users/{userId}/memories/{memoryId}` (Personal Memories)
```typescript
interface UserMemoryDocument {
  id: string;                  // Unique memory UUID (mem_<timestamp>_<rand>)
  text: string;                // Memory content (<= 1000 characters)
  category: 'core_value' | 'goal' | 'habit' | 'preference' | 'relationship' | 'milestone' | 'insight';
  sourceRef: {
    entryId?: string;          // Source journal interaction ID
    origin: 'journal_entry' | 'direct_input';
  };
  confidence: number;          // 0.0 to 1.0
  provenance: 'explicitly_stated' | 'ai_inferred';
  createdAt: string;           // ISO 8601 string
  updatedAt: string;           // ISO 8601 string
}
```

---

## 🔒 Cloud Firestore Security Rules

Deploy the following production rules via Firebase CLI. They implement zero-trust path isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User root profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Journal Interactions subcollection
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Personal Memories subcollection
    match /users/{userId}/memories/{memoryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Default deny for all other collections and collection groups
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy command:
```bash
firebase deploy --only firestore:rules
```

---

## 🛡️ Agentic Threat Modeling Summary (The 5 Threat Zones)

In strict accordance with the challenge's Production Directives, Gemini Vault implements comprehensive scenario-driven threat mitigations:

| Threat Zone | Scope & Attack Vectors | Active Countermeasure & Architectural Boundary | Compliance Status |
| :--- | :--- | :--- | :---: |
| **1. Input Surfaces** | Untrusted user prompts, journal reflections, location payloads, candidate memories, search queries | Defensive payload parsing, 1,000-character caps for memories, strict XML boundaries (`<untrusted_journal_content>`), and input sanitization stripping `undefined` attributes. | ✅ Enforced |
| **2. Planning & Reasoning** | System instruction bypass, jailbreaks, prompt injection (OWASP LLM01) | Invariant system instructions mandating that user reflections and memories are treated strictly as private data, never executable instructions. Plain JSON extraction without `eval`. | ✅ Enforced |
| **3. Tool & Execution** | SSRF, privilege escalation, browser-side credential leakage | Gemini API invoked strictly on Cloud Run (`server.ts`). Zero API keys or service account tokens exposed to browser bundles. Error abstraction prevents stack trace leakage. | ✅ Enforced |
| **4. Memory & State** | Cross-user data leakage (OWASP A01), client-forged UIDs, unauthenticated queries | Server-side UID derivation from cryptographically verified Firebase ID tokens (`request.auth.uid`). Owner-bound Firestore Security Rules (`/users/{userId}/**`). Zero `collectionGroup` grants. | ✅ Enforced |
| **5. Inter-System Communication** | Quota exhaustion (429), transient service errors (503), token interception | Resilient Model Fallback Ladder (`gemini-3.6-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest` ➔ `gemini-3.7-flash`). Sensitive reflection content redacted in stdout logs. | ✅ Enforced |

---

## 🧪 Automated Security Test Suite (SEC-01 to SEC-18)

| Code | Test Name | Target Principle | Verification Strategy |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Unauthenticated Journal Rejection | Authentication Boundary | Verifies requests without a valid Bearer token receive HTTP 401. |
| **SEC-02** | Unauthenticated Memory Rejection | Extraction Boundary | Confirms unauthenticated callers cannot invoke `/api/memories/extract`. |
| **SEC-03** | Cross-User Journal Data Isolation | Broken Access Control (A01) | Enforces `/users/{userId}/interactions` is restricted to `request.auth.uid == userId`. |
| **SEC-04** | Cross-User Memory Isolation | Cross-Tenant Privacy | Verifies User A cannot query `/users/{userB}/memories`. |
| **SEC-05** | Server-Derived Identity | Zero-Trust Client Identity | Verifies server rejects client-supplied userIds; derives UID strictly from token. |
| **SEC-06** | Collection-Group Query Prevention | Global Query Hardening | Confirms no permissive collectionGroup rules exist across the database. |
| **SEC-07** | Prompt Injection Containment | OWASP LLM01 Defense | Wraps inputs in `<untrusted_journal_content>` with strict data directives. |
| **SEC-08** | Memory Schema Conformance | Schema Enforcement | Rejects candidate memories that do not conform to JSON schema or exceed 1,000 chars. |
| **SEC-09** | Ask My Journal Scoping | Retrieval Isolation | Confirms Ask My Journal only accesses documents scoped to `verifiedUid`. |
| **SEC-10** | Longitudinal Scoping Integrity | Temporal Analysis Isolation | Verifies "What Changed?" analysis compares only verified user records. |
| **SEC-11** | Atomic Transaction Integrity | Zero Dirty State | Ensures failure during AI generation aborts Firestore write before invalid state is saved. |
| **SEC-12** | Right to Erasure / Purge | User Data Rights | Confirms deleted memories are permanently removed from Firestore and subsequent queries. |
| **SEC-13** | Token Tamper Detection | Cryptographic Auth | Ensures tampered or expired JWT tokens fail closed with HTTP 401. |
| **SEC-14** | Secret Hygiene & Zero Exposure | Information Disclosure | Confirms `GEMINI_API_KEY` is never exposed in client bundles or network traffic. |
| **SEC-15** | Location Data UID-Bound Storage | Spatial Privacy | Confirms coordinates and place data are stored strictly within the user's private entry doc. |
| **SEC-16** | Location Prompt Injection Defense | Geographic Context Defense | Sanitizes location metadata and wraps in `<untrusted_journal_location>` XML tags. |
| **SEC-17** | Payload DOS Protection | Input Bounds | Express limits payloads to 10MB; strings are bounded to prevent memory exhaustion. |
| **SEC-18** | Strict Firestore Write Authorization | Rule Write Verbs | Verifies client attempts to mutate other users' docs are blocked with PERMISSION_DENIED. |

---

## 🔑 Google Cloud Secret Manager Setup

Securely configure secrets so that private credentials are never hardcoded:

```bash
# 1. Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# 2. Create and populate GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the Cloud Run compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚢 Google Cloud Run Deployment Guide

Deploy Gemini Vault to Cloud Run with the mandatory campaign challenge label:

```bash
# 1. Build and deploy container from workspace root
gcloud run deploy gemini-vault \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="VITE_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID,VITE_GOOGLE_MAPS_API_KEY=YOUR_MAPS_KEY" \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

To update labels on an already deployed Cloud Run service:
```bash
gcloud run services update gemini-vault \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🔬 Running Tests Locally

The workspace includes independent verification test harnesses:

### 1. Two-Stage Personal Memory Extraction Test Suite
Tests Stage 1 AI extraction, Stage 2 Firestore persistence, quota exhaustion handling, invalid model output rejection, and retryable failure states:
```bash
npx tsx tests/test-extract-memory-flow.ts
```
Expected output:
```
--- Starting Two-Stage Memory Extraction Test Suite ---
[Test 1] Successful Gemini extraction -> Firestore save: PASSED
[Test 2] Gemini quota failure -> no Firestore memory created: PASSED
[Test 3] Gemini authentication failure -> no Firestore memory created: PASSED
[Test 4] Invalid Gemini response -> no Firestore memory created: PASSED
[Test 5] Successful extraction followed by Firestore failure -> clear retryable error: PASSED
Results: 5/5 tests passed.
```

### 2. "Ask My Journal" Security & Grounding Test Suite
Tests authentication boundaries, cross-user isolation, grounded evidence verification, citation formatting, and "Insufficient Evidence" handling:
```bash
npx tsx tests/test-ask-my-journal.ts
```
Expected output:
```
Results: 10/10 tests passed.
```

### 3. Build & Linter Check
```bash
npm run lint
npm run build
```

---

## 🛠️ Troubleshooting & Resilience Matrix

| Symptom / Error | Root Cause | Built-in Resolution / Recovery Strategy |
| :--- | :--- | :--- |
| **`auth/popup-blocked` or `auth/unauthorized-domain`** | Browser popup blocker or running inside an unlisted iframe domain | The app intercepts the Firebase Auth error and immediately displays a one-click **"Explore as Guest"** option with full functionality, plus domain whitelist instructions. |
| **HTTP 429 / `RESOURCE_EXHAUSTED`** | Gemini API free quota reached | The **Resilient Fallback Ladder** cascades to `gemini-3.1-flash-lite`, `gemini-flash-latest`, and `gemini-3.7-flash`. If all models are exhausted, the user's reflection remains safely preserved with an explicit quota toast. |
| **Google Maps script error / restricted iframe** | Maps API key missing, quota reached, or blocked by browser CSP | Handled gracefully by `MapErrorBoundary`. Replaces the map canvas with a fallback geographic visualizer displaying coordinates, address, and an "Open in Google Maps" external link. |
| **Missing environment variables** | Container launched without Secret Manager binding | Server throws a clean startup error (`GEMINI_API_KEY environment variable is not configured`) and provides actionable instructions instead of silently returning mock data. |
| **Firestore write rejection** | Network offline or permission error | The UI retains the reflection text in the input buffer, flags the entry with a red error badge, and displays a prominent **"Retry Save"** button. |
