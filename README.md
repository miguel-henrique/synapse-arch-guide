# Synapse Architecture Guide

An interactive learning platform covering the CREAM-PIE architecture, the List primitive, and the Template Engine patterns in CI Connect / Synapse v3.

**Stack:** React 18 + TypeScript + Vite  
**Password:** `creampie`

## Sections

- **Architecture** — Five-layer interactive overview, List types explorer, CREAM-PIE recipe decoder, Relationships & Perspective demo, Rendering Engine live demo, real code examples
- **Showcase** — Demo scripts for presenting the Operations menu, the Synapse board and Leads at the backend level: manifests, `psql` queries against the local Docker Postgres, code paths, API calls, and a proof checklist against the doctrine
- **Course** — 5 levels with questions, instant feedback, and sessionStorage progress
- **Glossary** — All official terms from the CI Connect docs

## Development

```bash
npm install
npm run dev       # :5900
npm run build
```

## Deployment

Configured for Vercel (`vercel.json`). Set `VITE_*` env vars in the Vercel dashboard if needed.

DNS: point a CNAME record to `cname.vercel-dns.com` for a custom domain.
