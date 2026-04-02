# Task Planner

**Live site:** https://jmeegan2.github.io/planning/

A lightweight task planning tool built with vanilla TypeScript, HTML, and CSS. Designed around a structured template for breaking down engineering work into manageable chunks. Installable as a PWA.

## Features

- **Structured planning template** — sections covering done criteria, knowns, unknowns, work chunks, risks, decisions, and wrap-up
- **Auto-save** — changes persist to localStorage as you type
- **Collapsible sidebar** — browse and switch between saved plans
- **Checklist support** — track progress on deliverables and work chunks
- **Decision log** — table for recording decisions and reasoning over time
- **Notes** — freeform entries for jotting things down during implementation
- **Image attachments** — drag-and-drop image uploads stored as base64
- **Pomodoro timer** — 25/5/15 cycle with configurable times, sound alerts, and browser notifications
- **Export/Import JSON** — backup and restore all plans
- **Export PDF** — print-friendly layout
- **PWA** — installable as a desktop app, works offline
- **Zero dependencies at runtime** — just static HTML/CSS/JS, runs on GitHub Pages

## Template Sections

1. **What does "done" look like?** — concrete deliverables, quality gates, validation
2. **What do I already know?** — prior work, patterns, constraints
3. **What do I need to find out?** — unknowns with investigation plans
4. **Chunks (2-4 hrs each)** — broken down work items
5. **Risks & Blockers** — what could go sideways, dependencies, mitigations
- **Attachments** — image references and screenshots
- **Notes** — implementation-time observations
6. **Decision Log** — dated decisions with reasoning
7. **Wrap-up** — actual time vs estimate, surprises, lessons learned

## Development

Requires Node.js and npm.

```bash
npm install
npm run build
```

Then open `index.html` in a browser.

## Project Structure

```
src/
  types.ts    — interfaces (TaskPlan, ChecklistItem, etc.)
  storage.ts  — localStorage load/save, JSON export/import
  ui.ts       — DOM helpers (checklists, lists, auto-resize, images)
  app.ts      — state management, event wiring, init
  pomodoro.ts — pomodoro timer
dist/         — compiled JS output
```

## Tech

- TypeScript ES modules (no bundler)
- HTML + CSS (graph paper theme)
- localStorage for persistence
- Web Audio API for timer alerts
- Service worker for offline PWA support
