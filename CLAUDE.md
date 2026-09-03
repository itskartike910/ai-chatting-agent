# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OmniBrowse — a Chromium Manifest V3 extension that converts natural language tasks into deterministic browser actions. It supports multi-LLM providers (Gemini, Claude, OpenAI) and runs autonomous multi-step web workflows via an agentic pipeline.

## Build Commands

```bash
npm install                    # Install dependencies
npm run build                  # Build React side panel (react-scripts) → build/
npm run build:webpack          # Build extension scripts (background, content, buildDomTree) → build/
npm run build:extension        # Full build: React + webpack → build/ directory
npm run dev:webpack            # Webpack dev mode with watch
npm run start                  # React dev server (for UI development only)
npm run test                   # Run tests via react-scripts
```

**Loading the extension:** After `npm run build:extension`, load the `build/` directory in `chrome://extensions/` (Developer Mode → Load Unpacked).

**Two build systems coexist:** React (`react-scripts`) builds the side panel UI into `build/`. Webpack builds the extension scripts (`background.js`, `content.js`, `buildDomTree.js`) from `public/` into `build/`. Both output to the same `build/` directory — the webpack config has `clean: false` to avoid wiping React output.

## Architecture

### Extension Layer (`public/`)

The extension scripts live in `public/` and run in the Chrome extension context (service worker + content scripts):

- **`background.js`** — Service worker entry. Contains `BackgroundScriptAgent` (message routing, config management) and `MultiAgentExecutor` (the main execution loop that orchestrates agents). This is the largest and most critical file.
- **`content.js`** — Content script injected into every page. Manages agent status popups (show/hide "AI Agent in Action" overlay) via `chrome.storage.onChanged` listeners.
- **`buildDomTree.js`** — DOM analysis engine injected into pages. Builds a semantic tree of interactive elements with highlight indices, used by the LLM to identify which elements to interact with.
- **`agents/`** — AI agent implementations:
  - `AITaskRouter.js` — Classifies user requests as CHAT or WEB_AUTOMATION, generates initial plans
  - `PlannerAgent.js` — Creates batch execution plans (2-7 actions per step) with observation/strategy reasoning
  - `ValidatorAgent.js` — Progressive task completion validation with confidence scoring
- **`services/`** — Core services:
  - `MultiLLMService.js` — Multi-provider LLM abstraction (Gemini, Claude, OpenAI). Routes API calls through `API_BASE_URL` backend (`https://nextjs-app-410940835135.us-central1.run.app/api`)
  - `DOMService.js` — Chrome API wrapper for DOM interaction: injects `buildDomTree.js`, captures screenshots via `chrome.tabs.captureVisibleTab`, removes element highlights
- **`managers/`** — State management:
  - `ConnectionManager.js` — Port-based message routing between background and side panel, session persistence via `chrome.storage.local`
  - `TaskManager.js` — Task lifecycle (start, cancel, resume)
  - `MemoryManager.js` — Execution context compression for LLM prompts
  - `ContextManager.js` — Browser context (current tab, active tab tracking)
- **`actions/ActionRegistry.js`** — Universal action execution (click, type, scroll, navigate, wait, go_back, etc.)

### React UI Layer (`src/`)

Side panel UI built with React 18 + HashRouter:

- **`components/`** — `ChatInterface` (main chat), `ChatInput`, `MessageList`, `SettingsModal`, `StartupPage`, `ChatHistoryPage`, `HowToUsePage`, `TaskStatus`
- **`hooks/`** — `useChat` (message state + chrome.storage persistence), `useConfig` (AI provider config via `chrome.storage.sync`), `useAuth` (backend auth check), `useChatHistory`
- **`styles/`** — Animation CSS files per component

### Execution Flow

1. User sends task via side panel chat → `useChat` hook → port message to background
2. `BackgroundScriptAgent.handlePortMessage` → `executeTaskWithBackgroundManager`
3. `AITaskRouter.analyzeAndRoute` classifies intent (CHAT vs WEB_AUTOMATION) and generates initial plan
4. For WEB_AUTOMATION: `MultiAgentExecutor.execute` runs the main loop:
   - Gets page state via `DOMService.getPageState` (injects `buildDomTree.js`)
   - `PlannerAgent.plan` generates batch actions with observation/strategy
   - `ActionRegistry.executeAction` runs each action
   - `ValidatorAgent.validate` checks completion (triggered when planner requests it)
   - Loop continues until done, max steps (50), or cancelled
5. Results broadcast back to side panel via `ConnectionManager.broadcast`

### Key Patterns

- **Port-based messaging:** Side panel ↔ background communication uses `chrome.runtime.connect` ports, not one-off messages. Messages are persisted in `chrome.storage.local` for reconnection recovery.
- **Config via `chrome.storage.sync`:** AI provider settings (API keys, model selection, provider choice) stored in sync storage, watched for changes to reinitialize services.
- **Dual storage:** `chrome.storage.local` for messages/execution state; `chrome.storage.sync` for user config.
- **Service worker keep-alive:** Uses `chrome.alarms` with 0.1 minute period to prevent background script termination.
- **All extension scripts in `public/` are plain ES modules** (not bundled by React). The webpack config in `webpack.config.js` bundles these separately (`public/background.js`, `public/content.js`, `public/buildDomTree.js`), targeting `webworker`.

## LLM Configuration

Default provider: Gemini (`gemini-2.5-flash`). Configurable per-agent type (navigator, planner, validator) via settings UI. Backend API URL is hardcoded in `MultiLLMService.js` and `.env`. Price ID in `.env` is for backend billing integration.

## Environment Variables

`REACT_APP_API_BASE_URL` and `REACT_APP_PRICE_ID` in `.env` — used during React build for backend API and Stripe pricing.
