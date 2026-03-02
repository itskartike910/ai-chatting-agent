# 🚀 OmniBrowse

### AI-Orchestrated Browser Automation Agent

OmniBrowse is a production-grade Chromium extension that enables autonomous multi-step web workflows using structured AI-driven execution. It converts natural language tasks into deterministic browser actions while maintaining cross-browser compatibility and system reliability.

Built for automation across social platforms, e-commerce workflows, research tasks, and general web navigation.

---

## 🌐 Universal Chromium Compatibility

OmniBrowse uses only standard Chromium Extension APIs:

* `chrome.scripting`
* `chrome.tabs`
* Manifest V3 service workers
* Custom DOM state extraction engine

Fully compatible with:

* Google Chrome
* Chromium
* Microsoft Edge
* Brave
* And Other Chromium Based Desktop Browsers

No proprietary APIs. No vendor lock-in.

---

## ⚙️ Core Capabilities

### 🔹 AI Task Execution Engine

* Converts natural language requests into structured multi-step execution plans
* Separates task classification, planning, execution, and validation stages
* Maintains execution history to improve reliability and reduce loop failures

### 🔹 Deterministic Interaction Pipeline

* DOM state extraction using semantic tree representation
* Renderer-based action execution (click, type, scroll, navigation)
* Async-safe interaction handling for dynamic web pages

### 🔹 Secure Orchestration

* Backend-integrated authentication
* Token-based usage tracking
* Controlled execution lifecycle

### 🔹 Cross-Browser Architecture

* Modular extension design
* Standard Chromium APIs only
* Portable across desktop and mobile Chromium builds

---

## 🏗 Architecture Overview

```
ai-chatting-agent/
├── public/                     # Extension files
│   ├── agents/                # AI agent implementations
│   │   ├── AITaskRouter.js    # Request classification
│   │   ├── PlannerAgent.js    # Task planning
│   │   └── ValidatorAgent.js  # Completion validation
│   ├── actions/               # Action handlers
│   │   └── ActionRegistry.js  # Universal action system
│   ├── services/              # Core services
│   │   ├── DOMService.js      # Universal DOM interaction (buildDomTree)
│   │   └── MultiLLMService.js # Multi-LLM provider support
│   ├── managers/              # State & connection managers
│   ├── background.js          # Service worker (universal Chromium)
│   ├── content.js             # Content script
│   ├── buildDomTree.js        # DOM analysis engine
│   ├── manifest.json          # Extension manifest (Chromium standard)
│   └── index.html             # Popup HTML
├── src/                       # React frontend
│   ├── components/            # UI components
│   ├── hooks/                # Custom React hooks
│   └── styles/               # CSS and animations
└── build/                    # Built extension (generated)
```

---


## 🌟 Key Features

### 🧠 **Multi-Agent AI System**
- **AI Task Router**: Intelligently classifies user requests (chat vs web automation)
- **Planner Agent**: Creates strategic batch execution plans (2-7 sequential actions)
- **Navigator Agent**: Executes precise web interactions within the browser
- **Validator Agent**: Validates task completion with progressive assessment

### 🚀 **Smart Web Automation**
- **Social Media**: Automated posting on X/Twitter, LinkedIn, Facebook
- **E-commerce**: Product search, shopping cart management, order placement
- **Content Discovery**: YouTube video search and playback, research tasks
- **Universal Navigation**: Intelligent URL routing and page interaction

### 💬 **Interactive Chat Interface (Sidebar)**
- **Sidebar Experience**: Full-height sidebar panel for seamless multitasking
- **Real-time Communication**: Chat with AI agents while browsing
- **Task Status Tracking**: Live updates with observation and strategy display
- **Chat History**: Persistent conversation storage with search functionality
- **Markdown Support**: Rich text formatting for code, links, and emphasis
- **Always Accessible**: Keep the agent visible while navigating websites

### 🔧 **Modern Architecture**
- **Sidebar Interface**: Persistent side panel for multitasking (Chrome Side Panel API)
- **Standard Chrome APIs**: Uses `chrome.scripting` and `chrome.tabs` for universal compatibility
- **BuildDomTree Engine**: Advanced DOM analysis for precise element targeting
- **No Proprietary Dependencies**: Works on any Chromium-based browser

---

## 🔧 Installation & Setup

### Prerequisites

#### For Desktop (Chrome, Edge, Brave, etc.):
- **Any Chromium-based browser** (Chrome, Edge, Brave, Opera, Vivaldi, etc.)
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager

### 1️⃣ Clone Repository

```bash
git clone https://github.com/itskartike910/ai-chatting-agent.git
cd ai-chatting-agent
npm install
```

### 2️⃣ Build Extension

```bash
npm run build
```

### 3️⃣ Load in Chromium Browser

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click “Load Unpacked”
4. Select the `build/` directory

### 4️⃣ Configure AI API Keys

1. Configure your preferred AI provider:

#### Option A: Google Gemini (Recommended)
- **Provider**: Select "Gemini"
- **API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Model**: `gemini-2.5-flash` (default) or `gemini-pro`

#### Option B: Anthropic Claude
- **Provider**: Select "Claude"
- **API Key**: Get from [Anthropic Console](https://console.anthropic.com/)
- **Model**: `claude-3-haiku` or `claude-3-sonnet`

#### Option C: OpenAI GPT-4o
- **Provider**: Select "OpenAI"
- **API Key**: Get from [OpenAI Console](https://platform.openai.com/api-keys)
- **Model**: `gpt-4o` (default) or `gpt-4o-mini`


---

## 🤖 Example Use Cases

* “Search for AI research papers and summarize findings”
* “Find the cheapest iPhone 15 and add to cart”
* “Post a tweet about system design patterns”
* “Navigate to YouTube and play first machine learning tutorial”

---

## 🛠 Technology Stack

* JavaScript (ES6+)
* React (UI Layer)
* Chromium Extension APIs (Manifest V3)
* Custom DOM Analysis Engine
* Multi-LLM Support (OpenAI / Gemini / Claude)

---

## 🔐 Security & Privacy

* No external data collection
* API keys stored locally
* Direct communication with AI providers
* Minimal permission model

---

## 📝 License

[MIT License](LICENSE)
