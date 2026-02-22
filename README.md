# CodeFlip

A mobile-first code execution environment for practicing LeetCode-style problems in **Python and TypeScript simultaneously**. Write a solution in one language, flip to compare it in the other, and run both in parallel — all from your phone.

Built with React Native (Expo) and a lightweight Node.js execution server that mirrors the Piston API contract.

---

## Table of Contents

- [Features](#features)
- [Screens](#screens)
- [System Design](#system-design)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Execution Server](#execution-server)
- [Future Features](#future-features)

---

## Features

- **Editor Screen** — Write Python or TypeScript with line numbers and a monospace editor. Run code and see stdout/stderr/exit code in an output console.
- **Compare Screen** — Two view modes:
  - *Flip mode*: toggle between languages with a single editor
  - *Split mode*: horizontal scroll showing both side-by-side
  - "Run Both" executes both languages in parallel (`Promise.all`)
- **Problems Screen** — Create, rename, and delete named problem slots. Each problem stores separate Python and TypeScript buffers. Persists to `AsyncStorage` (offline, no account needed).
- **Local Execution Server** — Drop-in Piston-compatible Node.js server that runs `python3` and `tsx` as child processes. No Docker, no cloud calls required during development.

---

## Screens

| Screen | Description |
|--------|-------------|
| **Editor** | Single-language editor with run + output console |
| **Compare** | Flip/split dual-language view with parallel execution |
| **Problems** | Problem list manager with CRUD |

---

## System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   iOS / Android Device                  │
│                                                         │
│   ┌──────────────┐   ┌────────────────────────────┐    │
│   │  React Native │   │     Zustand Global Store   │    │
│   │  (Expo SDK)   │◄──│  problems[], results{},    │    │
│   │               │   │  activeLanguage, isRunning │    │
│   └──────┬────────┘   └────────────────────────────┘    │
│          │ axios HTTP                                    │
└──────────┼──────────────────────────────────────────────┘
           │
           ▼ POST /api/v2/piston/execute
┌──────────────────────────────────────────────────────────┐
│                   Execution Backend                      │
│                                                         │
│   Development            Production (planned)           │
│   ┌──────────────┐       ┌──────────────────────┐       │
│   │  Node.js     │       │  Piston API / Judge0  │       │
│   │  server.js   │       │  (Docker sandboxed)   │       │
│   │  (port 3001) │       │  emkc.org or          │       │
│   │  tsx / py3   │       │  self-hosted VPS      │       │
│   └──────────────┘       └──────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

### State Management

Zustand was chosen over Redux for this scope. The full app state fits in one flat store with no selectors boilerplate. Actions are colocated with state, and async actions (code execution) are just `async` functions inside `set()` callbacks.

```
AppStore
├── problems: Problem[]              ← persisted to AsyncStorage
├── currentProblemId: string
├── activeLanguage: 'python' | 'typescript'
├── isRunning: boolean
└── results: Record<string, ExecutionResult | null>
              └── key = "{problemId}_{language}"
```

Results are keyed by `{problemId}_{language}` so each problem independently tracks output per language without additional nesting. This makes multi-language comparison trivial — `results["two-sum_python"]` and `results["two-sum_typescript"]` are independently readable.

### Code Execution Flow

```
User taps "Run"
       │
       ▼
store.runCode()
  └── sets isRunning = true
  └── calls pistonApi.executeCode(language, code)
            │
            ▼
       axios.post(`${BASE_URL}/execute`, {
         language, version,
         files: [{ name, content }],
         run_timeout: 10_000,
         compile_timeout: 15_000
       })
            │
            ▼
       Local server (server.js):
         python     → execFile('python3', [tmpfile.py])
         typescript → execFile('tsx',     [tmpfile.ts])
            │
            ▼
       Response: { run: { stdout, stderr, code } }
            │
            ▼
  store.results[key] = ExecutionResult
  store.isRunning = false
            │
            ▼
  OutputConsole re-renders
```

For the Compare screen, both languages execute concurrently:

```javascript
const [pyResult, tsResult] = await Promise.all([
  executeCode('python', problem.python),
  executeCode('typescript', problem.typescript),
]);
```

This halves the perceived wait time since neither execution depends on the other.

### Persistence Layer

| Data | Storage | Survives App Restart |
|------|---------|---------------------|
| Problem list + code buffers | `AsyncStorage` (`@codeflip_problems`) | Yes |
| Execution results | In-memory (Zustand) | No |

Results are intentionally ephemeral — they're cheap to re-generate and persisting them would add complexity with minimal value at this scale.

### API Contract (Piston-Compatible)

The local server exposes the same interface as the public Piston API so the client never needs to know which backend it's talking to. Swapping backends requires only changing `EXPO_PUBLIC_API_URL`.

```
GET  /health                    → { ok: true }
GET  /api/v2/piston/runtimes   → []
POST /api/v2/piston/execute    → ExecutionResult
```

Request body:
```json
{
  "language": "python",
  "version": "3.10.0",
  "files": [{ "name": "solution.py", "content": "print('hello')" }],
  "run_timeout": 10000
}
```

Response:
```json
{
  "run": {
    "stdout": "hello\n",
    "stderr": "",
    "code": 0
  }
}
```

### Data Model

```typescript
type Language = 'python' | 'typescript'

interface Problem {
  id: string          // "two-sum-1700000000000"
  title: string
  python: string      // full source code
  typescript: string
  createdAt: number   // Unix ms
}

interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
  language: Language
  executedAt: number
}
```

### iOS App Transport Security (ATS)

iOS blocks plain `http://` requests from native app code (NSURLSession, which Axios uses under the hood). Safari bypasses ATS for user browsing but the app does not. To allow the local dev server over HTTP:

```json
"ios": {
  "infoPlist": {
    "NSAllowsArbitraryLoads": true
  }
}
```

In production this should be scoped to the specific domain via `NSExceptionDomains` rather than a blanket allow.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Mobile framework | React Native + Expo SDK 54 | Cross-platform iOS/Android, fast iteration |
| Language | TypeScript (strict mode) | Type safety across the whole app |
| State | Zustand 5 | Minimal boilerplate, colocated async actions |
| Navigation | React Navigation 7 | Bottom-tab navigation |
| HTTP | Axios | Timeout support, interceptors, familiar API |
| Persistence | AsyncStorage | Offline-first, zero infrastructure |
| Execution (dev) | Node.js + tsx + python3 | No Docker overhead locally |
| Execution (prod, planned) | Piston / Judge0 | Sandboxed Docker containers |

---

## Project Structure

```
Compiler/
├── server/
│   └── server.js              # Local execution server (Node.js)
│
└── CodeFlip/
    ├── App.tsx                # Root: tab navigator + AsyncStorage hydration
    ├── app.json               # Expo config (ATS, icons, orientation)
    ├── index.ts               # Expo entry point
    ├── tsconfig.json          # Strict TypeScript config
    ├── .env.local             # Your LAN IP — gitignored
    ├── .env.example           # Template for contributors
    │
    └── src/
        ├── types/
        │   └── index.ts       # Problem, ExecutionResult, Language, Piston types
        │
        ├── store/
        │   └── useStore.ts    # Zustand store: all state + actions
        │
        ├── services/
        │   └── pistonApi.ts   # executeCode(), fetchRuntimes()
        │
        ├── constants/
        │   ├── theme.ts       # Colors, typography, spacing scale
        │   └── templates.ts   # Default code templates for new problems
        │
        ├── screens/
        │   ├── EditorScreen.tsx    # Single-language edit + run
        │   ├── CompareScreen.tsx   # Flip/split + run both
        │   └── ProblemsScreen.tsx  # CRUD problem list
        │
        └── components/
            ├── CodeEditor.tsx      # Line-numbered TextInput
            ├── OutputConsole.tsx   # stdout/stderr/exit code display
            ├── LanguageTabs.tsx    # Python ↔ TypeScript switcher
            └── RunButton.tsx       # Animated run/loading button
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- `tsx` installed globally: `npm install -g tsx`
- Python 3: `python3 --version`
- Expo Go on your iPhone/Android, or a simulator

### 1. Clone and install

```bash
git clone https://github.com/siavashahmadi/Compiler.git
cd Compiler/CodeFlip
npm install
```

### 2. Configure your LAN IP

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:3001/api/v2/piston
```

Find your LAN IP on Mac: `ipconfig getifaddr en0`

### 3. Start the execution server

```bash
node server/server.js
```

Verify: `curl http://localhost:3001/health` → `{"ok":true}`

### 4. Start Expo

```bash
cd CodeFlip
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` for iOS simulator.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Execution backend base URL | `http://192.168.1.5:3001/api/v2/piston` |

All `EXPO_PUBLIC_` variables are bundled at build time by Metro. `.env.local` is gitignored — never commit your LAN IP.

---

## Execution Server

`server/server.js` is a zero-dependency Node.js HTTP server that mimics the Piston API contract. It:

- Writes submitted code to a temp file in `os.tmpdir()`
- Executes `python3` (Python) or `tsx` (TypeScript) as a child process
- Returns stdout/stderr/exit code wrapped in Piston response format
- Enforces a 10-second execution timeout via `execFile`
- Enables CORS for all origins (development only)
- Binds to `0.0.0.0` so it's reachable from a physical device on the same network

To run on a non-default port:

```bash
PORT=4000 node server/server.js
```

---

## Future Features

### Reliability & Performance

- **Rate limiting** — Token bucket or sliding window counter per client IP on the execute endpoint. Prevents runaway clients from monopolizing execution workers. In a distributed deployment, the counter lives in Redis and is checked atomically before each job is enqueued.
- **Job queue** — Decouple HTTP ingress from execution with a queue (BullMQ or SQS). The API responds immediately with a job ID; the client polls or subscribes via WebSocket for the result. Workers pull jobs independently and scale horizontally without touching the API layer.
- **Execution result caching** — Hash the `(language, code)` pair and store results with a short TTL (e.g. 60s). Identical back-to-back submissions skip execution entirely. Useful for shared problems where many users submit the same template starter code.
- **Worker auto-scaling** — Scale execution workers based on queue depth. Scale-to-zero when idle; burst on demand. Fits naturally on AWS Fargate, Fly.io Machines, or Kubernetes HPA.
- **Circuit breaker** — Wrap the external Piston API calls in a circuit breaker. If the upstream is failing, open the circuit and return a clear error instead of letting requests pile up with 30s timeouts.

### Security & Sandboxing

- **Docker sandboxing for the local server** — Wrap each execution in a Docker container with `--network none`, a read-only filesystem mount, a CPU quota, and a memory limit. The current `execFile` approach has no resource isolation.
- **Linux namespace / seccomp isolation** — For lower overhead than full Docker, use Linux namespaces (PID, network, mount, user) with a seccomp profile to restrict the syscall surface. This is closer to how production judge systems (Codeforces, LeetCode) work internally.
- **Input validation and code size limits** — Reject submissions above a configurable byte limit before spawning a process. Prevent degenerate inputs (infinite loops that write to stdout, huge memory allocations) from burning resources.
- **Scoped ATS exceptions** — Replace `NSAllowsArbitraryLoads: true` with `NSExceptionDomains` scoped to the specific API hostname for production iOS builds.
- **Request signing** — HMAC-sign execution requests so the server can verify they originate from the app, not an arbitrary HTTP client.

### Language Support

- **Java** — `javac` compile step + `java` run step with a temp working directory per submission.
- **C++** — `g++ -O2 -o /tmp/out /tmp/sol.cpp && /tmp/out`
- **Go** — `go run /tmp/sol.go`
- **Rust** — `rustc -o /tmp/out /tmp/sol.rs && /tmp/out`
- **Language version selection** — Let users pick the runtime version per problem (Python 3.10 vs 3.12, Node 18 vs 22) to match a specific online judge's environment.

### Editor Experience

- **Syntax highlighting** — Integrate `react-native-code-editor` or embed CodeMirror 6 in a WebView. Currently the editor is a plain `TextInput` with monospace font.
- **Auto-indent** — Detect language-specific indentation rules and auto-indent on newline (e.g. indent after `:` in Python, after `{` in TypeScript).
- **Bracket matching and auto-close** — Auto-close `(`, `[`, `{`, `"`, `'` and visually match pairs.
- **Keyboard toolbar** — A row of commonly needed symbols (`[`, `]`, `{`, `}`, `(`, `)`, `:`, `->`, `=>`) docked above the software keyboard to reduce tap count.
- **Font size control** — Pinch-to-zoom in the editor, or a settings slider, for users who prefer larger text.

### Cloud & Sync

- **User accounts** — OAuth (GitHub, Google) or magic-link auth to tie problems to a user identity instead of device storage.
- **Cloud sync** — Persist problems in Postgres. Sync changes across devices in the background. Last-write-wins conflict resolution for the MVP; CRDT-based merging if collaborative editing is added later.
- **Shareable problem links** — Generate a short URL for a problem + solution pair. Anyone with the link can open it in the app and get a read-only snapshot.
- **Offline-first with sync queue** — Keep `AsyncStorage` as the write-ahead store. Flush a local mutation log to the server when connectivity is restored. No data loss when the phone goes offline mid-session.

### Problem Management

- **Import from LeetCode URL** — Parse a LeetCode problem URL to pre-fill the title, constraints, and starter function signatures.
- **Tags and difficulty** — Annotate problems with topic tags (array, dynamic programming, graph) and difficulty (easy/medium/hard). Filter and sort the list.
- **Test case management** — Store multiple stdin test cases per problem. Run all cases in sequence and show a per-case pass/fail table with expected vs. actual output.
- **Custom stdin input** — Let the user enter arbitrary stdin before running instead of hard-coding input inside the solution.
- **Problem notes** — A markdown note field per problem for time/space complexity analysis, approach sketches, and edge case reminders.
- **Solution versioning** — Keep a history of previous saves so users can diff their current solution against an earlier attempt.

### Observability

- **Structured server logs** — Emit JSON log lines (timestamp, method, path, status, latency ms, language) instead of `console.log`. Ingest into Datadog, Grafana Loki, or CloudWatch for dashboards and alerting.
- **Client-side crash reporting** — Sentry in the React Native app for JS error and native crash reports.
- **Execution latency metrics** — Track p50/p95/p99 execution latency per language. Alert when p95 exceeds a threshold.
- **Richer health endpoint** — Expose runtime versions, current queue depth, worker availability, and uptime at `/health` so load balancers and uptime monitors have signal beyond a simple 200.
- **Distributed tracing** — Propagate a trace ID from the app through the API and into the execution worker so a single request can be followed end-to-end in a trace viewer.

### UX & Polish

- **Dark/light theme toggle** — Currently hardcoded to a GitHub Dark palette. Add a light mode and respect the system preference via `useColorScheme`.
- **Haptic feedback** — Pulse the Taptic Engine when execution finishes. Light tap on success, heavy tap on non-zero exit code.
- **iPad layout** — Use the full iPad width for a persistent side-by-side layout in Compare mode rather than a horizontal scroll.
- **Execution history drawer** — Keep the last N results per problem/language so the user can swipe back through previous runs without re-executing.
- **Onboarding flow** — A short first-launch walkthrough explaining the flip/compare concept for new users.
