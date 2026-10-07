# Kube-Learn (WRS)

A frontend dashboard for a small Facebook-like app used to learn Kubernetes. It shows how the platform is layered:

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
