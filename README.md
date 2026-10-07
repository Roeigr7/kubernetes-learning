# Nexora Infrastructure

A frontend dashboard for a fictional company, Nexora. It shows how a production Kubernetes platform is layered:

AWS Cloud → Kubernetes cluster → nodes → pods → containers

The interface is a React, TypeScript, and Material UI app. All values come from local mock JSON in `src/data/infrastructure.json`. There is no live cluster, cloud account, or backend.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```
