# CodeFlip — System Design

> A mobile code execution environment for polyglot LeetCode practice.
> This document frames the architecture at an interview-ready level.

---

## 1. Problem Statement

Build a mobile application that lets a user write Python and TypeScript solutions to algorithmic problems side-by-side, execute them, and compare outputs — without shipping or maintaining any server infrastructure themselves.

**Core constraints:**
- Must execute arbitrary user code safely (sandboxing is non-negotiable)
- Must support at minimum Python 3 and TypeScript 5
- Offline-first persistence for code (local drafts survive network loss)
- Sub-10-second execution latency for typical LeetCode solutions

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Mobile Client (Expo/RN)             │
│                                                      │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │  Editor  │  │  Problems  │  │  Compare / Diff  │ │
│  │  Screen  │  │  Screen    │  │  Screen          │ │
│  └──────────┘  └────────────┘  └──────────────────┘ │
│        │                                │            │
│  ┌─────▼────────────────────────────────▼──────────┐ │
│  │           Zustand Global Store                   │ │
│  │  problems[] · activeLanguage · results · running │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │ executeCode()                   │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │              Piston API Client                   │ │
│  │       (axios · timeout · retry logic)            │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                 │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │         AsyncStorage (local persistence)         │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                       │  HTTPS POST /execute
                       ▼
┌─────────────────────────────────────────────────────┐
│           Piston Code Execution API                  │
│                (emkc.org / self-hostable)            │
│                                                      │
│  ┌─────────────┐    ┌─────────────────────────────┐ │
│  │  API Server │    │  Container Orchestration     │ │
│  │  (Node.js)  │───▶│  Docker per execution        │ │
│  └─────────────┘    │  - Namespace isolation        │ │
│                     │  - Resource limits (CPU/MEM)  │ │
│                     │  - 10s run timeout            │ │
│                     │  - No network access          │ │
│                     └─────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 3. Key Design Decisions

### 3.1 Code Execution — Why Piston?

| Option | Pros | Cons |
|---|---|---|
| **Piston API** (chosen) | Free, no auth needed, open-source, Docker-backed sandbox, 70+ languages | External dependency, rate limited |
| Judge0 | Well-known, hosted plans | Requires API key, paid tiers |
| AWS Lambda | Infinite scale, low cost | Complex setup, cold starts, per-language Dockerfiles needed |
| Self-hosted Docker | Full control | Ops burden, requires a server |
| WebAssembly (WASM) | Fully offline, no latency | TS/Python WASM runtimes are immature, large bundle |

**Piston** wins for this use case because it's the fastest path to a working sandbox without standing up infrastructure. For a production system at scale, the self-hosted Docker approach is recommended (see §6).

### 3.2 State Management — Zustand

Zustand is chosen over Redux because:
- Zero boilerplate for this scope (3 screens, ~5 actions)
- Synchronous state reads anywhere without `useSelector` overhead
- Easy async action support via plain `async` functions in the store

The store is the single source of truth for all problem data. The UI is purely reactive.

### 3.3 Persistence — AsyncStorage

Problem code is persisted to AsyncStorage on every explicit save event (problem add/rename/delete). This gives:
- Offline-first behavior — code survives app restarts and network loss
- No backend required for persistence at MVP scale

**Future upgrade path:** Replace AsyncStorage with a Supabase or Firebase Firestore sync layer to enable multi-device sync.

### 3.4 Editor — TextInput + Line Numbers

The code editor is built on React Native's `TextInput` with:
- A fixed-width line number column (computed from newline count)
- Horizontal + vertical ScrollView wrapping
- Monospace font, dark background

This avoids the complexity of a WebView-bridged editor (CodeMirror/Monaco) at the cost of syntax highlighting. **Planned enhancement:** replace with a WebView + CodeMirror 6 instance, using `postMessage` for bidirectional state sync.

---

## 4. Data Model

```typescript
interface Problem {
  id: string;          // slug + timestamp (e.g. "two-sum-1700000000000")
  title: string;       // display name
  python: string;      // full source code
  typescript: string;  // full source code
  createdAt: number;   // Unix timestamp (ms)
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  language: 'python' | 'typescript';
  executedAt: number;
}
```

Results are kept in memory only (not persisted). They're keyed by `{problemId}_{language}` in the Zustand store.

---

## 5. Execution Request Flow

```
User taps "Run"
     │
     ▼
useStore.runCode()
  - reads code from problems[]
  - sets isRunning = true
  - calls pistonApi.executeCode(language, code)
     │
     ▼
POST https://emkc.org/api/v2/piston/execute
  Body: {
    language: "typescript",
    version:  "5.0.3",
    files: [{ name: "solution.ts", content: "..." }],
    run_timeout: 10000
  }
     │
     ▼ (Piston spins up ephemeral Docker container)
     │ executes code, captures stdout + stderr
     │ destroys container
     ▼
Response: { run: { stdout, stderr, code } }
     │
     ▼
useStore: results[key] = ExecutionResult
  isRunning = false
     │
     ▼
OutputConsole re-renders with result
```

**"Run Both"** (Compare screen) fires two concurrent `executeCode()` calls via `Promise.all`, halving the perceived wait time.

---

## 6. Scaling to Production

If this were a production product (think: mobile LeetCode clone), here's how the architecture evolves:

### Phase 1 — Self-hosted Piston
Deploy Piston on a single VPS (2 vCPU, 4GB RAM):
- Handles ~20 concurrent executions
- $10-20/month on DigitalOcean or Hetzner

### Phase 2 — Execution Queue
```
Mobile Client
    │
    ▼
API Gateway (rate limiting, auth)
    │
    ▼
Job Queue (Redis/SQS)
    │
    ▼
Worker Pool (auto-scaled EC2 Spot / ECS Fargate)
  [Worker] → Docker exec → return result
    │
    ▼
Result Store (Redis TTL 60s)
    │
    ▼
Client polls /result/{jobId}  OR  WebSocket push
```

**Key additions at this phase:**
- **Rate limiting** per user: 10 executions/min (prevents abuse)
- **Execution queue depth** monitoring: scale workers when P95 wait > 2s
- **Result caching**: same code + language hash → skip execution, return cached result
- **Timeout enforcement**: Docker `--timeout` + server-side watchdog

### Phase 3 — Multi-region
- Deploy execution workers in US, EU, AP regions
- Route requests to nearest region via Cloudflare (GeoDNS)
- Reduces latency from ~800ms (cross-ocean) to ~150ms (regional)

### Security Model
Every execution runs in a Docker container with:
```
--network none              # no outbound internet
--memory 256m               # memory cap
--cpus 0.5                  # CPU cap
--read-only                 # immutable rootfs
--tmpfs /tmp:size=50m       # writable tmp only
--ulimit nproc=50           # no fork bombs
--ulimit fsize=1048576      # 1MB max file write
```

---

## 7. Interview Talking Points

These are the angles that will resonate in a system design interview:

| Question | Answer |
|---|---|
| **How do you sandbox code safely?** | Docker container per execution with `--network none`, CPU/memory limits, read-only filesystem, `nproc` ulimit. The container is destroyed after execution — no state leaks between users. |
| **How do you handle scale?** | Decouple submission from execution via a queue. Workers are stateless and horizontally scalable. Auto-scale on queue depth metric. |
| **How do you minimize latency?** | Run both languages in parallel (`Promise.all`). Cache results by code hash. Co-locate workers with users (multi-region). |
| **What if Piston goes down?** | Abstract the executor behind an interface. Swap in Judge0, Sphere Engine, or a self-hosted cluster without changing the client. |
| **How do you prevent abuse?** | Rate limiting at the API gateway (token bucket, per-user). Execution timeouts enforced at both the API server and Docker level. Automatic request throttling on the client. |
| **How do you store user code?** | MVP: AsyncStorage (local-only). Production: user table + code table in Postgres, synced via REST or Realtime subscription. |

---

## 8. Tech Stack Summary

| Layer | Technology | Rationale |
|---|---|---|
| Mobile | React Native (Expo) | Cross-platform iOS/Android, TypeScript-native |
| State | Zustand | Minimal boilerplate, synchronous reads |
| Persistence | AsyncStorage | Offline-first, zero infra |
| HTTP client | Axios | Timeout + interceptor support |
| Code execution | Piston API | Free, sandboxed, 70+ languages, self-hostable |
| Navigation | React Navigation | De-facto standard for RN |

---

*CodeFlip — built to practice algorithms, designed to explain distributed systems.*
