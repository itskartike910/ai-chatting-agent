# 🤖 AI Social Shopping Agent

An intelligent **universal Chromium extension** that automates web tasks using advanced AI agents. Works on **Chrome, Edge, Brave, and all Chromium-based browsers** including Wootzapp Browser for Android. Perfect for social media automation, e-commerce shopping, content discovery, and general web navigation tasks.

![AI Social Shopping Agent](https://img.shields.io/badge/AI%20Agent-Browser%20Extension-blue)
![Chromium Compatible](https://img.shields.io/badge/Chromium-Universal-green)
![Version](https://img.shields.io/badge/version-1.0.4-green)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB)

## 🌐 Universal Chromium Compatibility

This extension uses **standard Chromium APIs** (`chrome.scripting`, `chrome.tabs`) and the powerful **buildDomTree** DOM analysis engine, making it compatible with all Chromium-based browsers:

✅ **Google Chrome** - Full support  
✅ **Microsoft Edge** - Full support  
✅ **Brave Browser** - Full support  
✅ **Opera** - Full support  
✅ **Vivaldi** - Full support  
✅ **Wootzapp Browser** (Android) - Full support with mobile optimization  

No proprietary APIs required - works everywhere Chromium does!

## 🌟 Key Features

### 🧠 **Multi-Agent AI System**
- **AI Task Router**: Intelligently classifies user requests (chat vs web automation)
- **Planner Agent**: Creates strategic batch execution plans (2-7 sequential actions)
- **Navigator Agent**: Executes precise web interactions with mobile optimization
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

### 📱 **Responsive Design**
- **Desktop & Mobile**: Works on both desktop and mobile Chromium browsers
- **Touch-Friendly**: Optimized for both mouse and touch interactions
- **Element Highlighting**: Visual feedback during automation (with auto-cleanup)
- **Progress Tracking**: Real-time task completion indicators

### 🔧 **Modern Architecture**
- **Sidebar Interface**: Persistent side panel for multitasking (Chrome Side Panel API)
- **Standard Chrome APIs**: Uses `chrome.scripting` and `chrome.tabs` for universal compatibility
- **BuildDomTree Engine**: Advanced DOM analysis for precise element targeting
- **No Proprietary Dependencies**: Works on any Chromium-based browser

## 🔧 Installation & Setup

### Prerequisites

#### For Desktop (Chrome, Edge, Brave, etc.):
- **Any Chromium-based browser** (Chrome, Edge, Brave, Opera, Vivaldi, etc.)
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager

#### For Mobile (Wootzapp Browser):
- **Wootzapp Browser** installed on Android device
- **Node.js** (v16 or higher) - for building the extension
- **npm** or **yarn** package manager

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd ai-social-agent

# Install dependencies
npm install
```

### 2. Build the Extension
```bash
# Build for production
npm run build:extension

# Or for development with watch mode
npm run dev:webpack
```

### 3. Load Extension in Browser

#### For Chrome, Edge, Brave (Desktop):
1. Open your Chromium browser
2. Navigate to the extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
   - **Opera**: `opera://extensions/`
   - **Vivaldi**: `vivaldi://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `build/` directory from your project
6. **Click the extension icon** in the toolbar to open the sidebar

#### For Wootzapp Browser (Android):
1. Open Wootzapp Browser on your Android device
2. Navigate to `wootz://extensions/` or tap menu → Extensions
3. Enable **Developer mode** using the toggle switch
4. Tap **Load unpacked**
5. Navigate to the `build/` folder (transfer to device via USB, cloud, or file sharing)

### 4. Configure AI API Keys

1. Click the extension icon in your browser toolbar
2. Go to **Settings** (gear icon)
3. Configure your preferred AI provider:

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

## 🎯 How to Use

### 💬 **Chat Mode**
Ask general questions, get explanations, or request code examples:

```
Examples:
• "What is machine learning?"
• "Write a JavaScript function to sort an array"
• "Explain how REST APIs work"
• "Help me understand React hooks"
```

### 🤖 **Web Automation Mode**
Request specific web actions using natural language:

#### Social Media Automation
```
Examples:
• "Post 'Hello World!' on Twitter"
• "Search for AI tutorials on YouTube and play the first video"
• "Find trending topics on LinkedIn"
• "Share my latest blog post on Facebook"
```

#### E-commerce & Shopping
```
Examples:
• "Find iPhone 15 on Amazon and add to cart"
• "Search for wireless headphones under $100"
• "Compare prices of laptops on different sites"
• "Add the first Labubu doll to my shopping cart"
```

#### Research & Content Discovery
```
Examples:
• "Search for latest AI news on Google"
• "Find reviews of the new Tesla Model 3"
• "Look up restaurants near me on Yelp"
• "Find cooking tutorials on YouTube"
```

#### Web Navigation
```
Examples:
• "Go to Gmail and check my inbox"
• "Open Netflix and browse comedy movies"
• "Navigate to my bank's website"
• "Visit the latest news on BBC"
```

### 🔄 **Task Execution Flow**

1. **Input**: Type your request in natural language
2. **Classification**: AI determines if it's a chat or automation task
3. **Planning**: Planner Agent creates an optimal execution strategy
4. **Execution**: Navigator Agent performs actions with real-time updates
5. **Validation**: Validator Agent confirms task completion
6. **Feedback**: Get detailed results and next steps

## 🛠️ Development

### Project Structure
```
ai-social-agent/
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

### Available Scripts

```bash
# Development
npm start              # Start React dev server
npm run dev:webpack    # Watch mode for extension files

# Building
npm run build          # Build React app
npm run build:webpack  # Build extension files
npm run build:extension # Complete extension build

# Testing
npm test              # Run test suite
```

### Technical Architecture

This extension uses **standard Chromium APIs** for universal compatibility:

#### DOM Interaction
- **`buildDomTree.js`**: Advanced DOM analysis engine that creates a semantic representation of web pages
- **`chrome.scripting.executeScript()`**: Injects and executes scripts in page context
- **DOMService**: Abstraction layer providing universal DOM operations

#### Actions System
- Uses `chrome.scripting` to perform clicks, typing, scrolling
- No browser-specific APIs required
- Works identically across all Chromium browsers

#### Screenshot Capture
- **`chrome.tabs.captureVisibleTab()`**: Standard screenshot API
- Supports both PNG and JPEG formats
- No additional permissions needed beyond standard tabs

#### Key Benefits
✅ **Universal**: Works on any Chromium browser (desktop & mobile)  
✅ **Standard**: Uses only official Chrome Extension APIs  
✅ **Portable**: No vendor lock-in or proprietary dependencies  
✅ **Future-proof**: Based on stable, long-term APIs

## 🚨 Troubleshooting

### Common Issues

#### Extension Not Loading
- Ensure Developer mode is enabled
- Check console for error messages
- Verify all files are in the `build/` directory
- Try reloading the extension

#### AI API Errors
- Verify API key is correct and active
- Check internet connection
- Ensure API provider has sufficient quota
- Try switching to a different model

#### Automation Failures
- Enable Debug mode for detailed logs
- Check if website structure has changed
- Verify element highlighting works
- Try manual execution first

### Error Codes
- **401**: Invalid API key
- **429**: Rate limit exceeded
- **500**: Server error
- **TIMEOUT**: Action took too long
- **ELEMENT_NOT_FOUND**: Page structure changed

## 🔒 Privacy & Security

- **Local Storage**: Chat history stored locally in browser
- **API Communication**: Direct communication with AI providers
- **No Data Collection**: Extension doesn't collect personal data
- **Secure Headers**: All API calls use secure authentication
- **Permission Model**: Minimal required permissions


