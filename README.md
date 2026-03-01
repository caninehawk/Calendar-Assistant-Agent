# Calendar Voice Agent

A voice-powered AI assistant for Google Calendar. Sign in with Google, hit a button, and just talk — schedule meetings, check your day, or delete events, all hands-free.

Built with [LiveKit Agents](https://docs.livekit.io/agents/) (Python backend) and [Next.js](https://nextjs.org/) (frontend).

---

## How it works

1. User signs in with Google (frontend requests calendar access)
2. Frontend connects to a LiveKit room and sends the Google access token to the agent via a data channel
3. The Python agent picks up the token, builds a Google Calendar service, and starts a voice session
4. User speaks — the agent listens, thinks, and responds using speech, reading and writing to Google Calendar

```
Browser  →  Next.js frontend  →  LiveKit Cloud  →  Python agent  →  Google Calendar API
```

---

## Architecture

```mermaid
flowchart LR
    User(["👤 User\n(Browser / Phone)"])

    subgraph LiveKit["LiveKit Cloud"]
        Router(("SFU / Media\nRouter"))
        Dispatch["Agent Dispatch"]
    end

    subgraph Agent["Python Agent (livekit-agents)"]
        direction TB
        
        subgraph Input["1. Hearing & Processing"]
            direction TB
            NC["Noise Cancellation\n(BVC)"]
            VAD["VAD\n(Silero)"]
            TurnDet["Turn Detection\n(MultilingualModel)"]
            STT["Speech-to-Text\n(AssemblyAI / Deepgram)"]
        end

        subgraph Core["2. Thinking & Intent"]
            direction TB
            LLM["Large Language Model\n(GPT-4o-mini / Gemini)"]
            Tools["Calendar Tools\n(calendar_tools.py)"]
        end

        subgraph Output["3. Speaking"]
            TTS["Text-to-Speech\n(ElevenLabs Turbo v2.5)"]
        end

        %% Internal pipeline connections
        NC -->|"Clean audio"| VAD
        VAD -->|"Speech detected"| TurnDet
        TurnDet -->|"End of speech"| STT
        STT -->|"Transcript"| LLM
        LLM <-->|"Analyzes intent,\ncalls tool if needed"| Tools
        LLM -->|"Text response"| TTS
    end

    Google[("Google\nCalendar API")]

    %% External connections
    User <-->|"1. Auth / Data Channel (Google Token)"| Router
    User <-->|"2. WebRTC Audio I/O"| Router
    Router <-->|"3. Assigns job"| Dispatch
    Dispatch -.->|"Spins up"| Agent
    
    %% Connect router to input/output
    Router -->|"Raw Mic Audio"| NC
    TTS -->|"Synthesized Audio"| Router

    Tools <-->|"OAuth Token +\nAPI Requests"| Google
    
    %% Styling
    classDef agentBox fill:#1a0a2e,stroke:#a855f7,stroke-width:2px,color:#f0eeff
    classDef userBox fill:#0f172a,stroke:#3b82f6,stroke-width:2px,color:#bfdbfe
    classDef cloudBox fill:#1e1b4b,stroke:#7c3aed,stroke-width:2px,color:#e9d5ff
    classDef googleBox fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#bbf7d0
    classDef innerBox fill:#2e1065,stroke:#c084fc,stroke-width:1px,color:#f0eeff

    class Agent agentBox
    class User userBox
    class LiveKit cloudBox
    class Google googleBox
    class Input,Core,Output innerBox
```

### Step-by-step

| Step | What happens |
|---|---|
| **1–2** | User signs in with Google; browser gets an OAuth token scoped to `calendar` |
| **3–5** | Frontend calls `/api/livekit` → generates a LiveKit JWT and dispatches the agent |
| **6–8** | Browser joins the room via WebRTC; LiveKit Cloud assigns the job to the agent |
| **9–10** | Frontend sends the Google token to the agent over a LiveKit data channel |
| **Audio in** | Mic audio → Noise Cancellation → Silero VAD → MultilingualModel end-of-turn detection |
| **STT** | AssemblyAI transcribes speech (Deepgram Nova-3 as fallback) |
| **LLM** | GPT-4o-mini decides on a response or tool call (Gemini 2.5 Flash as fallback) |
| **Tool call** | `calendar_tools.py` calls Google Calendar API with the user's OAuth token |
| **TTS** | ElevenLabs Turbo v2.5 synthesizes audio → sent back via WebRTC |


## Project structure

```
Calendar Voice Agent/
├── frontend/              # Next.js app (UI + LiveKit token API)
│   └── src/app/
│       ├── page.tsx       # Main UI
│       ├── layout.tsx
│       ├── globals.css
│       └── api/livekit/
│           └── route.ts   # Generates LiveKit token + dispatches agent
│
└── calendar-assistant/    # Python LiveKit agent
    ├── agent.py           # Agent entrypoint
    ├── calendar_tools.py  # Google Calendar tool functions
    ├── requirements.txt
    └── pyproject.toml
```

---

## Prerequisites

- **Node.js** v18 or later
- **Python** 3.10 or later
- A **LiveKit Cloud** account — [create one free at livekit.io](https://livekit.io)
- A **Google Cloud** project with the **Google Calendar API** enabled and an OAuth 2.0 **Web Application** credential

---

## 1. Google Cloud setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Calendar API**: APIs & Services → Enable APIs → search "Google Calendar API"
4. Create OAuth credentials: APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000` (add your production domain later)
   - Authorized redirect URIs: `http://localhost:3000` (add your production domain later)
5. Copy the **Client ID** — you'll need it for the frontend `.env.local`

---

## 2. LiveKit Cloud setup

1. Sign in at [cloud.livekit.io](https://cloud.livekit.io)
2. Create a project. From the project dashboard, copy:
   - **WebSocket URL** (looks like `wss://your-project-xyz.livekit.cloud`)
   - **API Key**
   - **API Secret**
3. Deploy your Python agent to LiveKit Cloud (see step 5 below). After deploying, find the **Agent ID** in the LiveKit Cloud dashboard — it looks like `CA_xxxxxxxxx`. You'll need this for the frontend.

---

## 3. Frontend setup

```bash
cd frontend
npm install
```

Create a file called `.env.local` inside the `frontend/` folder:

```env
# Your Google OAuth 2.0 Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here.apps.googleusercontent.com

# LiveKit Cloud WebSocket URL
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project-xyz.livekit.cloud

# LiveKit API credentials (used server-side only — never exposed to the browser)
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

Open `src/app/api/livekit/route.ts` and update the **Agent ID** on line 32 to match yours:

```ts
await agentDispatch.createDispatch(room, 'CA_YOUR_AGENT_ID_HERE');
```

Start the dev server:

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 4. Python agent setup

```bash
cd calendar-assistant

# Create and activate a virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\Activate.ps1

# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a file called `.env` inside the `calendar-assistant/` folder:

```env
LIVEKIT_URL=wss://your-project-xyz.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

---

## 5. Running locally

Open two terminals:

**Terminal 1 — Python agent:**

```bash
cd calendar-assistant

# Activate the virtual environment
.venv\Scripts\Activate.ps1   # Windows
source .venv/bin/activate    # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Download model files (only needed once)
python agent.py download-files

# Start the agent
python agent.py start
```

You should see:
```
registered worker  url=wss://your-project.livekit.cloud
```

**Terminal 2 — Next.js frontend:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Using the app

1. Click **Sign in with Google** and authorize calendar access
2. Click **Start voice session** — this connects to the LiveKit room and dispatches the agent
3. Wait for the agent to say hello, then speak naturally:
   - *"What's on my calendar this week?"*
   - *"Schedule a dentist appointment tomorrow at 2pm"*
   - *"Cancel my 3pm meeting on Friday"*



## Environment variable reference

### `frontend/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit Cloud WebSocket URL (`wss://...`) |
| `LIVEKIT_API_KEY` | LiveKit API key (server-side only) |
| `LIVEKIT_API_SECRET` | LiveKit API secret (server-side only) |

### `calendar-assistant/.env`

| Variable | Description |
|---|---|
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL (`wss://...`) |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript |
| Voice UI | LiveKit Components React, LiveKit Client |
| Auth | Google OAuth 2.0 via `@react-oauth/google` |
| Agent runtime | LiveKit Agents (Python) |
| STT | AssemblyAI (primary), Deepgram Nova-3 (fallback) |
| LLM | GPT-4o-mini (primary), Gemini 2.5 Flash (fallback) |
| TTS | ElevenLabs Turbo v2.5 |
| VAD | Silero |
| Calendar | Google Calendar API v3 |
