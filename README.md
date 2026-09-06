# ReflectAI — Journal & Reflection Assistant

A user-authenticated journaling and reflection web application powered by **Gemini 3.6 Flash** and **Cloud Firestore** with strict user-isolated storage.

---

## 🛡️ Agentic Threat Modeling Summary (5 Threat Zones)

| Threat Zone | Identified Risk | Countermeasure Implemented | Status |
| :--- | :--- | :--- | :---: |
| **1. Input Surfaces** | Malicious prompt injection, payload tampering, oversized content | Defensive payload destructuring, `express.json({ limit: '10mb' })`, schema sanitization | ✅ Enforced |
| **2. Planning & Reasoning** | System instruction bypass, jailbreaks | Sandboxed system prompts for Gemini 3.6 Flash, plain JSON output extraction without `eval` | ✅ Enforced |
| **3. Tool & Execution** | Leaking API keys to client browsers, SSRF | Server-side Gemini API proxy (`process.env.GEMINI_API_KEY`), zero hardcoded secrets | ✅ Enforced |
| **4. Memory & State** | Cross-user data leaks, unauthorized reads/writes | Strict owner-bound Firestore security rules: `match /users/{userId}/interactions/{interactionId} { allow read, write: if request.auth != null && request.auth.uid == userId; }` with zero `undefined` payloads | ✅ Enforced |
| **5. Inter-System Communication** | API quota limits, transient outages (429, 503, 500) | **Resilient Model Fallback Ladder** (`gemini-3.6-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest` ➔ `gemini-3.7-flash`) with auto-retry | ✅ Enforced |

---

## 📋 Prerequisites & Cloud Setup

### 1. Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

### 2. Configure Secret Manager for Gemini API Key
```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run compute service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy Cloud Firestore Security Rules
Deploy `firestore.rules` to enforce strict owner isolation:
```bash
firebase deploy --only firestore:rules
```

**Security Rules (`firestore.rules`):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🚀 Cloud Run Deployment

Deploy ReflectAI to Google Cloud Run with the mandatory campaign challenge label:

```bash
# Build and deploy the container to Cloud Run
gcloud run deploy reflectai-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --update-labels=dev-tutorial=cloud-run-ai-challenge
```

To update labels on an existing service:
```bash
gcloud run services update reflectai-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Test Cases

| Step | User Action | Expected System Response | Verification Point |
| :---: | :--- | :--- | :--- |
| **TC-01** | Visit landing page | Displays value proposition, security badge, and Google Sign-In button | No unauthenticated data exposed |
| **TC-02** | Click **Sign In** | Authenticates via Google Sign-In (or instant preview session) and navigates to private workspace | User avatar & email display in header |
| **TC-03** | Select Reflection Mode (e.g. *Reflect*, *Brainstorm*, *Summarize*) | Updates framework mode badge and contextual thought-starter prompt chips | Active mode highlights cleanly |
| **TC-04** | Select Mood (e.g. *Thoughtful*, *Energized*) | Appends mood context to session state | Mood emoji updates in title card |
| **TC-05** | Enter journal text or click thought-starter chip & submit | Gemini 3.6 Flash processes multi-turn dialogue, generates compassionate inquiry, and extracts insights & action items | Resilient Fallback Ladder ensures response |
| **TC-06** | Observe Save status | Automatically sanitizes payload (undefined-stripped) and saves under `/users/{uid}/interactions/{id}` | Status changes to "Saved in User Storage" |
| **TC-07** | Click **Entries** (History button) | Sidebar opens listing user's past reflections with search & mode filters | Filtered by owner ID; search queries work in real-time |
| **TC-08** | Click **Synthesize Trends** | Modal launches and calls `/api/gemini/summarize` across recent reflections | Synthesizes overarching themes and constructive growth questions |
| **TC-09** | Click **Download Markdown** on an entry card | Generates clean `.md` export of dialogue, insights, and checkboxes | File downloads locally with full dialogue history |
| **TC-10** | Click **Delete** with confirmation | Deletes interaction from Firestore and active view | Immediate real-time list update |
| **TC-11** | Click **Sign Out** | Clears session and returns to landing page | Firestore listeners cleanly detached |

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server (Unified Express + Vite on port 3000)
npm run dev

# Compile production bundle
npm run build

# Start production server
npm start
```
