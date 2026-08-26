# CodeRush UI — Rural Healthcare Dispatch

## How this is organized

```
src/
├── api/
│   ├── contract.js     ← READ THIS FIRST. Shared data shapes both of you code against.
│   ├── client.js        REST calls (GET snapshot, POST request)
│   └── socket.js         WebSocket — live requests, dispatch results, resource updates
├── state/
│   └── simulationStore.js  Single source of truth. Everything renders from here.
├── components/
│   ├── layout/          Header, Dashboard (page shell)
│   ├── map/              NetworkMap + RouteOverlay — nodes, edges, animated route
│   ├── requests/          Incoming request feed + manual test-request form
│   ├── resources/         Ambulance fleet / hospital capacity / medicine stock panels
│   ├── decision/           Decision log + cost breakdown — the "why" panel judges want
│   └── shared/             StatusBadge, LoadingState
└── hooks/                Thin selectors over the store
```

## The split

- **Algorithm teammate**: build the backend (FastAPI or whatever you pick) so it produces
  exactly the shapes in `src/api/contract.js` — over REST for the initial snapshot and
  request submission, over WebSocket for live updates. You own routing, allocation,
  dynamic re-routing on road closures, and writing the `decisionLog` strings.
- **UI (you)**: everything renders from `simulationStore.js`. Nothing is hardcoded —
  every panel is already wired to read from live state, so once the backend sends real
  data matching the contract, the whole dashboard is real without further UI changes.

## Before you can see anything real

1. `npm install`
2. Copy `.env.example` to `.env` and point it at wherever the backend actually runs.
3. Ask your teammate to stand up even a stub server that returns `contract.js`-shaped
   fake data — you can build and polish the whole UI against that before real routing
   logic exists.

## Non-negotiable for judging

The rules say hardcoded/static results are unacceptable — every value shown must trace
back to a real WebSocket/API payload. Nothing in `components/` should contain literal
lat/lngs, fake routes, or made-up costs by submission time — those are only present
right now as an empty/loading state, not as fallback demo data.
