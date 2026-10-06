# Die Atlas

An explorable atlas of computer and GPU architecture: from one transistor to a multi-GPU AI server. Dielab is the sandbox inside it.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run validate   # content contract, chip maps, missions/challenges, bundle budget
npm run shots      # screenshots of every screen (needs a running server + Chrome)
```

Static site (Vite + React + TypeScript). Deploys to Vercel with the settings in `vercel.json`.

Content lives in typed data files under `src/content/`; see `docs/PLAN.md` for the plan, palette and the hardware numbers with their sources.
