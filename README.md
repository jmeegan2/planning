# Task Planner

A lightweight task planning tool built with vanilla TypeScript, HTML, and CSS. Designed around a structured template for breaking down engineering work into manageable chunks.

## Features

- **Structured planning template** — 7 sections covering done criteria, knowns, unknowns, work chunks, risks, decisions, and wrap-up
- **Auto-save** — changes persist to localStorage as you type
- **Collapsible sidebar** — browse and switch between saved plans
- **Checklist support** — track progress on deliverables and work chunks
- **Decision log** — table for recording decisions and reasoning over time
- **Zero dependencies at runtime** — just static HTML/CSS/JS, runs on GitHub Pages

## Template Sections

1. **What does "done" look like?** — concrete deliverables, quality gates, validation
2. **What do I already know?** — prior work, patterns, constraints
3. **What do I need to find out?** — unknowns with investigation plans
4. **Chunks (2-4 hrs each)** — broken down work items
5. **Risks & Blockers** — what could go sideways, dependencies, mitigations
6. **Decision Log** — dated decisions with reasoning
7. **Wrap-up** — actual time vs estimate, surprises, retrospective

## Development

Requires Node.js and npm.

```bash
npm install
npm run build
```

Then open `index.html` in a browser.

## Tech

- TypeScript (compiled to JS, no bundler)
- HTML + CSS (graph paper theme)
- localStorage for persistence
