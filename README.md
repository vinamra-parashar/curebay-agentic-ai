# Curebay — Test-Panel Gap-Filler Agent

> **Capstone Project — Agentic AI, Hero Vired**
>
> An agentic AI system that identifies clinically relevant missing diagnostic tests in a patient's order, explains the reasoning, and adds tests **only after explicit patient confirmation**.

---

## 📋 Table of Contents

1. [Problem Statement](#-problem-statement)
2. [Objective](#-objective)
3. [Architecture](#-architecture)
4. [Technology Stack](#-technology-stack)
5. [Agent Workflow](#-agent-workflow)
6. [Mock Data](#-mock-data)
7. [AI / LLM Usage](#-ai--llm-usage)
8. [Safety & Guardrails](#-safety--guardrails)
9. [How to Run](#-how-to-run)
10. [Demo Scenarios](#-demo-scenarios)
11. [Limitations](#-limitations)

---

## 🩺 Problem Statement

Patients and clinicians often order a subset of diagnostic tests without realising that their specific health profile (age, conditions, medications) may indicate that additional tests should be run alongside the ones already ordered. Missing these tests can delay diagnosis or lead to incomplete clinical information.

**Current pain point:** There is no automated, intelligent layer that cross-references a patient's profile and medical history against their current order and surfaces clinically relevant gaps — without replacing clinical judgment.

---

## 🎯 Objective

Build an AI-powered agent that:

1. Receives a patient's diagnostic test order.
2. Retrieves the patient's profile and full medical history.
3. Runs a deterministic rule-based gap analysis to identify missing tests.
4. Uses Gemini AI to enrich recommendations with patient-friendly explanations.
5. Presents recommendations to the patient — **never adds them automatically**.
6. Adds a test to the order **only** after the patient explicitly confirms.
7. Records every agent decision in an audit log for traceability.

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│         Patient Selection → Order Selection → Analyze           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (Axios)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Node.js / Express Backend                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  agent.      │  │ gapAnalysis. │  │  testPanelAgent.js   │  │
│  │  controller  │→ │  service     │→ │  (Gemini AI layer)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌──────────────────────┐          ┌─────────────────────────┐  │
│  │ patientConfirmation  │          │   agentLogging          │  │
│  │    service           │          │   service               │  │
│  └──────────────────────┘          └─────────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────┐                                        │
│  │   orderUpdate        │                                        │
│  │   service            │                                        │
│  └──────────────────────┘                                        │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ Mongoose ODM
                                   ▼
                      ┌────────────────────────┐
                      │       MongoDB          │
                      │  patients, orders,     │
                      │  tests, medicalHistory,│
                      │  agentLogs             │
                      └────────────────────────┘
```

### Key Design Decision — Two-Layer Recommendations

| Layer | Role | Authority |
|---|---|---|
| `GapAnalysisService` | Deterministic rule engine | **Source of truth** — defines what can be recommended |
| `TestPanelAgent` (Gemini) | Patient-friendly explanation | **Enhancement only** — cannot invent or add tests |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Axios, Vanilla CSS |
| **Backend** | Node.js, Express.js |
| **AI / LLM** | Google Gemini (`gemini-3.6-flash`) via `@google/genai` |
| **Database** | MongoDB via Mongoose |
| **Process Manager** | Nodemon (dev) |
| **Environment** | dotenv |

---

## 🔄 Agent Workflow

```text
Patient selects order
        ↓
[Backend] GET patient profile
        ↓
[Backend] GET medical history
        ↓
[Backend] GET current order tests
        ↓
── DETERMINISTIC LAYER ──────────────────────────────────
        ↓
Rule-based Gap Analysis
  • Match patient conditions + order tests against rules
  • Merge duplicate recommendations → single entry with reasons[]
  • Sort: high → medium → low priority
  • Output: clean, deduplicated recommendation list
        ↓
── AI LAYER (Gemini) ────────────────────────────────────
        ↓
Send gap candidates to Gemini
  • Structured JSON prompt (no free text output)
  • Gemini writes patient-friendly explanations
  • Whitelist filter: Gemini CANNOT invent tests
  • Fallback: if Gemini fails → use rule-based output as-is
        ↓
── CONFIRMATION LAYER ───────────────────────────────────
        ↓
Create confirmation session (in-memory, TTL: 10 min)
        ↓
Send recommendations to React UI
        ↓
Patient reviews each recommendation individually
        ↓
       ┌────────────────────────────┐
       │                            │
   Patient clicks              Patient clicks
 "Add [Test Name]"     "No, Continue Without Adding"
       │                            │
       ↓                            ↓
 Confirmation dialog          Session declined
 (modal overlay)              Order unchanged
       │
       ↓
 "Confirm & Add" clicked
       │
       ↓
[Backend] Update Order (MongoDB $push)
       │
       ↓
[Backend] Log agent decision
       │
       ↓
React UI shows success state
(Current Tests updated live)
```

---

## 🗂️ Mock Data

The application ships with a seed utility (the **"Create Sample Data"** / **"Load Scenario"** buttons) that creates the following records via the REST API:

### Tests (Master Catalogue)

| Test ID | Name | Category | Price |
|---|---|---|---|
| T001 | Complete Blood Count | Hematology | ₹500 |
| T002 | Lipid Profile | Biochemistry | ₹800 |
| T003 | Thyroid Function Test | Endocrinology | ₹600 |
| T004 | Liver Function Test | Biochemistry | ₹700 |
| T005 | Kidney Function Test | Biochemistry | ₹600 |
| T006 | HbA1c | Biochemistry | ₹400 |
| T007 | Electrolyte Panel | Biochemistry | ₹350 |
| T008 | Urine Albumin | Clinical Pathology | ₹300 |

### Recommendation Rules (Built-in)

| Rule | Condition | Trigger Test | Recommends | Priority |
|---|---|---|---|---|
| R001 | Diabetes | Complete Blood Count | HbA1c | High |
| R002 | Diabetes | Lipid Profile | Kidney Function Test | High |
| R003 | Hypertension | Lipid Profile | Kidney Function Test | High |
| R004 | Hypertension | Complete Blood Count | Electrolyte Panel | Medium |
| R005 | Diabetes | Kidney Function Test | Urine Albumin | High |
| R006 | Any | Lipid Profile | Liver Function Test | Medium |
| R007 | Any | Thyroid Function Test | Complete Blood Count | Medium |
| R008 | Age ≥ 40 | Complete Blood Count | Lipid Profile | Medium |
| R009 | Diabetes | Complete Blood Count | Lipid Profile | High |
| R010 | Hypertension | Kidney Function Test | Lipid Profile | High |

> Rules R002 and R003 both recommend **Kidney Function Test** when Lipid Profile is ordered. The system **merges these into a single recommendation** with two reasons.

### Sample Patient (P001)

```json
{
  "patientId": "P001",
  "name": "John Doe",
  "age": 45,
  "gender": "Male",
  "condition": "Diabetes",
  "medicalHistory": {
    "conditions": ["Diabetes", "Hypertension"],
    "medications": ["Metformin", "Lisinopril"]
  }
}
```

---

## 🤖 AI / LLM Usage

### Model

`gemini-3.6-flash` via `@google/genai` SDK.

### Role of AI

Gemini is **not** the recommendation engine. It is an **explanation layer** that rewrites technical rule-based reasons into patient-friendly language.

### Prompt Strategy

The agent sends a structured prompt that:

1. Lists the rule-based gap candidates (test name + priority + rule reason).
2. Lists the current order (tests the patient already has).
3. Instructs Gemini to return **valid JSON only** — no markdown, no prose.
4. Provides the exact JSON schema to follow:

```json
{
  "summary": "One-sentence explanation for the patient",
  "recommendations": [
    {
      "test": "Test Name (must match input exactly)",
      "priority": "high | medium | low",
      "reason": "Patient-friendly explanation"
    }
  ]
}
```

### Whitelist Filter (Hallucination Prevention)

After Gemini responds, the backend applies a strict whitelist:

```js
const allowedTestNames = new Set(gapRecommendations.map(g => g.recommendedTest));
const filtered = aiResult.recommendations.filter(
  rec => rec.test && allowedTestNames.has(rec.test)
);
```

Any test name invented by Gemini that was not in the rule-based output is **silently discarded**.

### Fallback Behaviour

If Gemini is unavailable or returns invalid JSON:
- `aiFallback: true` is set in the response.
- The frontend shows an amber warning banner.
- Rule-based recommendations are shown unchanged — the system **never fails silently**.

---

## 🛡️ Safety & Guardrails

| Guardrail | Implementation |
|---|---|
| **No auto-add** | Tests are never added without an explicit patient click + confirmation dialog |
| **Confirmation dialog** | A modal overlay requires the patient to click "Confirm & Add" |
| **Whitelist filter** | Gemini cannot recommend tests outside the rule-defined candidate list |
| **No hallucination** | JSON-only Gemini prompt; free-text responses are rejected |
| **No diagnosis** | The system never states a diagnosis; it only surfaces test suggestions |
| **Audit log** | Every agent action (recommendation generated, confirmation initiated, test added/declined) is recorded in MongoDB |
| **Session TTL** | Confirmation sessions expire after 10 minutes |
| **Deduplication** | Multiple rules triggering the same test are merged into one recommendation |

> **Disclaimer:** This is a mock demonstration system. It does not provide medical diagnosis, clinical advice, or replace a qualified healthcare professional.

---

## 🚀 How to Run

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)
- Google Gemini API key

### 1. Clone the repository

```bash
git clone <repo-url>
cd patient-test-panel
```

### 2. Backend setup

```bash
cd backend
```

Create a `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/curebay
GEMINI_API_KEY=your_gemini_api_key_here
```

Install dependencies and start:

```bash
npm install
npm run dev        # uses nodemon — auto-reloads on file changes
```

Backend runs at: `http://localhost:5000`

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

### 4. Seed data

Once the app is running, click **"Create Sample Data"** in the UI, or select any **Demo Scenario** from the dropdown to auto-populate the database.

### API Routes (Quick Reference)

| Method | Route | Description |
|---|---|---|
| GET | `/patients` | List all patients |
| POST | `/patients` | Create a patient |
| GET | `/orders` | List all orders |
| POST | `/orders` | Create an order |
| POST | `/agent/initiate/:orderId` | Run gap analysis + start session |
| POST | `/agent/confirm/:sessionId` | Submit patient confirmation |
| GET | `/agent-logs` | View audit log |
| GET | `/gap-analysis/order/:orderId` | Raw gap analysis (no AI) |

---

## 🧪 Demo Scenarios

Select any scenario from the **Demo Scenario dropdown** in the Patient Selection section. The app will auto-populate the patient, medical history, and order — then click **Analyze Order**.

### Scenario 1 — Diabetes + CBC Ordered

| Field | Value |
|---|---|
| Patient | Alice (Demo), 45, Diabetes |
| Order contains | Complete Blood Count |
| **Expected recommendations** | HbA1c (High) + Lipid Profile (High, 2 reasons merged) |

**Why Lipid Profile has 2 reasons:** Rule R008 (age ≥ 40) AND R009 (Diabetes) both fire — they are merged into **one** recommendation with two bullets.

---

### Scenario 2 — Diabetes + Hypertension (Merged Recommendations)

| Field | Value |
|---|---|
| Patient | Bob (Demo), 50, Diabetes + Hypertension |
| Order contains | Complete Blood Count, Lipid Profile |
| **Expected recommendations** | HbA1c (High) + **Kidney Function Test (High, 2 reasons merged ✓)** + Electrolyte Panel (Medium) + Liver Function Test (Medium) |

**Key evaluation point:** Kidney Function Test is triggered by both R002 (Diabetes) and R003 (Hypertension). The system must return it **exactly once** with **two reasons**:
- *"Diabetes patients should regularly monitor kidney function..."*
- *"Hypertension patients should monitor kidney function..."*

---

### Scenario 3 — HbA1c Already Ordered → Not Recommended Again

| Field | Value |
|---|---|
| Patient | Carol (Demo), 45, Diabetes |
| Order contains | Complete Blood Count, **HbA1c** |
| **Expected recommendations** | Lipid Profile (High, 2 reasons) — **HbA1c absent ✓** |

**Key evaluation point:** HbA1c is in the order → Rule R001 fires but the already-ordered filter suppresses it. The patient is never shown a test they already have.

---

### Scenario 4 — Patient Rejects Recommendation

| Field | Value |
|---|---|
| Patient | David (Demo), 55, Hypertension |
| Order contains | Kidney Function Test |
| **Expected recommendations** | Lipid Profile (High) |
| **Action to test** | Click "No, Continue Without Adding" |
| **Expected outcome** | Order stays `[Kidney Function Test]` — unchanged ✓ |

**Key evaluation point:** The agent records the declined confirmation in the audit log. The order is never modified without consent.

---

### Scenario Summary Table

| Scenario | Patient Condition | Order | Expected Result |
|---|---|---|---|
| **S1** — Diabetes + CBC | Diabetes | CBC | HbA1c + Lipid Profile recommended |
| **S2** — Dual condition | Diabetes + Hypertension | CBC + Lipid Profile | 4 tests recommended; Kidney Function Test appears **once** with 2 reasons |
| **S3** — Already ordered | Diabetes | CBC + HbA1c | HbA1c **not** recommended again |
| **S4** — Rejection | Hypertension | Kidney Function Test | Lipid Profile recommended; rejection leaves order unchanged |

---

## ⚠️ Limitations

| Limitation | Details |
|---|---|
| **In-memory sessions** | Confirmation sessions are stored in server memory (a `Map`). They are lost on server restart and do not scale horizontally. A production system would use Redis or a database-backed session store. |
| **Static rule set** | Recommendation rules are hardcoded in `gapAnalysis.service.js`. There is no admin UI or database-driven rule management. |
| **Single test per confirmation** | Each confirmation session adds one test. Adding multiple tests requires multiple Analyze Order cycles. |
| **No authentication** | There is no login, JWT, or role-based access control. Any user can read or modify any patient record. |
| **No real medical validation** | Rules are illustrative and not reviewed by a clinical professional. This system must not be used for actual medical decisions. |
| **Gemini rate limits** | The free tier of Gemini has request-per-minute limits. Heavy demo usage may trigger rate limiting, causing the AI fallback path to activate. |
| **No order history / versioning** | Once a test is added, there is no undo or order revision history. |
| **Local MongoDB only** | The default setup assumes a local MongoDB instance. Atlas or a remote URI requires updating `MONGO_URI` in `.env`. |
