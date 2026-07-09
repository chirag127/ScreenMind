/* ScreenMind — site content registry.
   Loaded as a plain script before app.js; exposes window.SITE_CONTENT.
   Also read by build.js (Node) to pre-render static pages.
   Block types the renderer understands:
     {h} heading · {h3} sub-heading · {p} paragraph (inline HTML ok)
     {code} · {list:[...]} · {cards:[{i,t,d}]} · {steps:[{t,d}]}
     {callout} · {table:{head,rows}} · {stats:[{n,l}]}
     {img} · {loopvideo} · {video} · {youtube}
   Page fields: tag, title (on-page H1), seoTitle (optional, used for <title>), blocks.
*/
window.SITE_CONTENT = {
  nav: [
    { group: "Overview", items: [["features", "What's inside"]] },
    { group: "Docs", items: [["install", "Install & run"], ["chat-search", "Chat & Search"], ["voice-meetings", "Voice & meetings"], ["agents", "Agents"], ["mcp", "MCP server"], ["privacy", "Nothing leaves"]] },
    { group: "Deep dive", items: [["how-it-works", "Under the hood"]] },
  ],

  pages: {
    // ── OVERVIEW (features + how it compares, merged) ─────────
    features: {
      tag: "Overview",
      title: "What ScreenMind does",
      seoTitle: "Features & how it compares",
      blocks: [
        { p: "ScreenMind captures your screen, understands it with a single local model, and turns it into a searchable, chat-able memory of everything you do — all on your machine." },
        { video: "/assets/demo.mp4" },
        { stats: [ { n: "1,500+", l: "DOWNLOADS" }, { n: "~180", l: "GITHUB STARS" }, { n: "4 GB", l: "MIN VRAM" }, { n: "MIT", l: "LICENSE" } ] },
        { cards: [
          { i: "📸", t: "Smart capture", d: "Content-change detection with perceptual hashing — it captures when the screen actually changes, not on a dumb timer." },
          { i: "🔬", t: "Gemma 4 vision", d: "Every frame analyzed into structured info: app, activity, mood, a rich scene description, and layout regions." },
          { i: "🔍", t: "Hybrid search", d: "Semantic embeddings (MiniLM) fused with FTS5 keyword search. Find things by meaning, not just exact words." },
          { i: "💬", t: "Chat with memory", d: "Conversational RAG over your history with follow-ups, and a vision fallback that reads the screenshot when text isn't enough." },
          { i: "🧠", t: "In-app Model Hub", d: "Download, switch and manage models from the UI with live progress — no terminal. Chat/Summary stay locked until the model is ready." },
          { i: "🎙️", t: "Voice memos", d: "Hold a hotkey and talk — Gemma 4's native audio encoder transcribes it, with a screenshot captured alongside." },
          { i: "🎤", t: "Meeting transcription", d: "Auto-detects Zoom/Teams/Meet/Discord, records mic + system audio, transcribes, and writes a structured summary." },
          { i: "📊", t: "Analytics & Rewind", d: "Category breakdowns, top apps, an hourly heatmap, and a timelapse player to scrub through your whole day." },
          { i: "🤖", t: "Agents", d: "Automations in plain-English Markdown or full Python. Drop a file in the agents folder and it runs on a schedule." },
          { i: "🔌", t: "MCP + integrations", d: "Expose your history to Claude/Cursor/VS Code over MCP; push summaries to Obsidian, Notion, or webhooks." },
          { i: "🔒", t: "Private by design", d: "100% local, zero telemetry, encryption at rest, and automatic redaction of cards / API keys / passwords." },
          { i: "⌨️", t: "System hotkeys", d: "Bookmark a moment, pause/resume capture, or record a voice memo — all with global shortcuts." },
          { i: "🔔", t: "Smart notifications", d: "Gentle nudges — distraction alerts, break reminders, and keyword auto-bookmarks like 'git push' or 'deploy'." },
          { i: "🧑‍💻", t: "Dev-aware", d: "Detects your git repo, branch and recent changes while you code, so coding activity is tracked with real context." },
        ] },
        { h: "How it compares" },
        { p: "Microsoft showed the world wants screen-aware AI with Recall — but it drew heavy privacy backlash. ScreenMind is the open-source, fully-local alternative to Recall and Screenpipe." },
        { table: {
          head: ["", "ScreenMind", "Screenpipe", "MS Recall"],
          rows: [
            ["License", "MIT — fully open", "Source-available (paid for commercial)", "Proprietary"],
            ["Cost", "Free forever", "Free personal / paid commercial", "Needs $1000+ Copilot+ PC"],
            ["Privacy", "Zero network, zero telemetry", "Local-first, optional cloud", "Telemetry opt-in"],
            ["Min hardware", "Any GPU ≥4 GB (or CPU)", "8 GB RAM, modern CPU", "40 TOPS NPU + 16 GB RAM"],
            ["AI architecture", "One model — vision+audio+reasoning", "OCR + Whisper + external LLM", "Proprietary NPU model"],
            ["Audio / meetings", "Native (Gemma audio encoder)", "Whisper-based", "Not supported"],
            ["Search", "Semantic + FTS5 hybrid", "Semantic + keyword + a11y", "Semantic only"],
            ["Chat with memory", "Full RAG + follow-ups", "✗", "✗"],
            ["Agents", "Markdown + Python + MCP", "Pipes (TS) + MCP", "✗"],
            ["Encryption", "AES (Fernet) + OS keyring", "Optional", "TPM + BitLocker"],
            ["Platform", "Windows / macOS / Linux", "Windows / macOS / Linux", "Windows 11 only"],
          ],
        } },
        { callout: "Fun fact: the whole thing was built and benchmarked on a 4&nbsp;GB GTX 1650 — the model literally spills into system RAM and still works. Any GPU with ≥6&nbsp;GB runs it 3–5× faster." },
      ],
    },

    // ── DOCS ─────────────────────────────────────────────────
    install: {
      tag: "Getting started",
      title: "Install & first run",
      blocks: [
        { p: "Requirements: Python 3.10+, a GPU with 4&nbsp;GB+ VRAM recommended (CPU works too), and ~5&nbsp;GB disk for the model." },
        { h3: "Install" },
        { code: "pip install screenmind" },
        { h3: "Run" },
        { code: "screenmind" },
        { p: "Then open <b>http://127.0.0.1:7777</b>." },
        { h3: "What happens on first run" },
        { list: [
          "Prompts to install the AI packages (~2.5&nbsp;GB one-time).",
          "Auto-detects your GPU and downloads the right <code>llama-server</code> build (CUDA/CPU) if it isn't found.",
          "Opens the <b>Model Hub</b> — download Gemma 4 E2B (~5&nbsp;GB) with live progress right in the UI.",
          "Chat and Summary stay locked (🧠💤) until the model is ready, then auto-unlock.",
          "Creates <code>~/.screenmind/</code> for all your data.",
        ] },
        { h: "Developer install (from source)" },
        { p: "Working on ScreenMind itself? Install it editable with the dev extras." },
        { code: "git clone https://github.com/ayushh0110/ScreenMind.git\ncd ScreenMind\n\npython -m venv venv\nvenv\\Scripts\\activate        # Windows\n# source venv/bin/activate   # macOS/Linux\n\npip install -e \".[ai,dev]\"" },
        { p: "Then set up a model with <code>python -m screenmind.setup_llama</code> (or use the Model Hub) and run the tests with <code>pytest</code>." },
        { h3: "Configuration" },
        { p: "Everything is configurable from the <b>Settings</b> tab (persisted to <code>settings.json</code>) or via a <code>.env</code> file — capture interval, analysis mode, performance/GPU-layer mode, blocked apps, retention, encryption, hotkeys, and integrations." },
        { callout: "Tip: first run opens the Model Hub and fetches Gemma 4 E2B for you — no terminal, no manual GGUF hunting. On a 4&nbsp;GB GPU, pick Fast mode." },
      ],
    },

    "chat-search": {
      tag: "Docs",
      title: "Chat & Search",
      blocks: [
        { p: "Two ways to get things back out of your memory: hybrid search across the timeline, and a conversational agent that answers from your history." },
        { h3: "See chat in action" },
        { loopvideo: "/assets/animation.mp4" },
        { h: "Hybrid search" },
        { p: "Search fuses two signals: semantic embeddings (find by meaning) and an FTS5 keyword index (find exact terms), plus meeting-transcript matches. Results are merged and re-ranked, and matching text is highlighted right on the screenshot." },
        { h: "Chat with your memory" },
        { p: "Chat behaves like a normal assistant that can reach into your timeline when relevant:" },
        { steps: [
          { t: "Keyword probe", d: "Keywords are pulled from your question and run through FTS5 to see if the timeline has anything relevant." },
          { t: "Semantic re-rank", d: "Candidate moments are re-scored with embeddings, plus a gentle recency boost, to pick the best context." },
          { t: "Answer", d: "The organized screen text (or the screenshot itself, as a vision fallback) is handed to Gemma to answer — with conversation history for follow-ups." },
        ] },
        { p: "Casual chit-chat skips the timeline lookup entirely, and chat always pre-empts background analysis so answers come fast. Responses stream over SSE." },
        { callout: "Ask things like <i>“what did Alex say on Discord earlier?”</i> or <i>“what was I working on at 3pm?”</i> — it pulls the actual moment, not a guess." },
      ],
    },

    "voice-meetings": {
      tag: "Docs",
      title: "Voice memos & meetings",
      seoTitle: "Voice memos & meeting transcription",
      blocks: [
        { p: "The same local Gemma 4 model has a native audio encoder — so ScreenMind records and transcribes voice without bolting on Whisper or any cloud speech API." },
        { h: "Voice memos" },
        { p: "Hold the voice hotkey (<code>Ctrl+Shift+V</code> by default), speak, and release. Gemma transcribes it locally and captures a screenshot alongside, so the note is tied to whatever you were looking at." },
        { h: "Meetings — auto-detected" },
        { steps: [
          { t: "Detect", d: "When a meeting app (Zoom, Teams, Meet, Discord) comes to the foreground and voice is detected, recording starts on its own — nothing to click." },
          { t: "Transcribe", d: "Audio is transcribed in ~15-second chunks by Gemma's audio encoder as the meeting runs." },
          { t: "Summarize", d: "On stop, a structured summary is produced — topics, decisions and action items. Long meetings use map-reduce over the transcript." },
        ] },
        { p: "Recording stops on sustained silence, when the meeting app closes, or a safety timeout — so it never records forever. Transcripts are searchable and show up in chat and MCP." },
        { callout: "Fun fact: because it's one model, meeting audio, screen vision and chat all share the same 4&nbsp;GB GPU — no separate speech model, no extra downloads." },
      ],
    },

    agents: {
      tag: "Docs",
      title: "Agents",
      blocks: [
        { p: "Build automations on top of your screen data — no server, no glue code. Drop a file in <code>~/.screenmind/agents/</code> and it runs on a schedule: Markdown for AI-powered analysis, Python for full control." },
        { h: "Markdown agents" },
        { p: "Front-matter declares how it runs; the body is your prompt. Gemma runs it with the requested screen data injected automatically." },
        { code: "---\nname: Standup Report\nschedule: daily\ndescription: Daily standup from my screen activity\nenabled: true\noutput: local, obsidian\ndata: apps, timeline\n---\nGenerate a standup with three sections — what I did,\nwhat I'm doing today, and any blockers. Be concise." },
        { h3: "Frontmatter" },
        { list: [
          "<code>schedule</code> — <code>every 30m</code>, <code>every 1h</code>, <code>every 2h</code>, <code>every 6h</code>, or <code>daily</code>",
          "<code>output</code> — <code>local</code>, <code>obsidian</code>, <code>webhook</code> (comma-separate for several)",
          "<code>enabled</code> — whether it runs on schedule",
          "<code>data</code> — which screen data to inject (Markdown agents only)",
          "<code>model_requirement</code> — minimum context tokens the agent needs (optional)",
        ] },
        { h3: "Data sections" },
        { list: [
          "<code>timeline</code> — recent activities with timestamps, apps, summaries",
          "<code>apps</code> — app usage counts + category breakdown",
          "<code>urls</code> — URLs visited (from browser address bars)",
          "<code>meetings</code> — meeting summaries and durations",
          "<code>mood</code> — mood/sentiment from screen analysis",
        ] },
        { h: "Python plugins" },
        { p: "For state, filtering, or LLM calls, write a <code>.py</code> agent with a <code>run(context)</code> function and import from the SDK." },
        { code: "from screenmind.screenmind_sdk import get_urls_visited, save_state, load_state, ask_gemma\n\ndef run(context):\n    urls = get_urls_visited()\n    last = load_state(\"count\", 0)\n    save_state(\"count\", last + len(urls))\n    return ask_gemma(f\"Summarize these URLs: {urls}\")" },
        { h3: "SDK" },
        { list: [
          "<b>Data</b> — <code>get_recent_activity</code>, <code>get_activities</code>, <code>get_urls_visited</code>, <code>get_meetings</code>, <code>get_app_usage</code>, <code>search</code>, <code>get_summary</code>, <code>get_stats</code>",
          "<b>State</b> — <code>save_state</code>, <code>load_state</code>, <code>clear_state</code> (per-agent JSON, persists across runs)",
          "<b>AI</b> — <code>ask_gemma</code> (GPU-safe: waits for the GPU to be idle, never interrupts capture)",
          "<b>Actions</b> — <code>notify</code>, <code>capture_now</code>, <code>write_file</code>, <code>get_output_dir</code>",
        ] },
        { p: "Outputs route to <code>local</code>, your <code>obsidian</code> vault, or a <code>webhook</code> — mix and match." },
        { callout: "Fun fact: the four built-in agents (daily journal, focus report, meeting actions, code changelog) are just Markdown files in <code>~/.screenmind/agents/</code> — open one and edit it live." },
      ],
    },

    mcp: {
      tag: "Docs",
      title: "MCP server",
      blocks: [
        { p: "ScreenMind ships an MCP (Model Context Protocol) server that exposes your screen history as tools any MCP-compatible assistant can call — Claude Desktop, Cursor, and VS Code (via Cline/Continue) — over stdio." },
        { h: "Setup" },
        { steps: [
          { t: "Install the MCP extra", d: "Run <code>pip install \"mcp[cli]\"</code> in your ScreenMind environment." },
          { t: "Point your AI client at ScreenMind", d: "Add the server to your client's MCP config (below), using your install path." },
          { t: "Restart the client", d: "\"screenmind\" appears with its tools, ready to query your history." },
        ] },
        { h3: "Client config" },
        { code: '{\n  "mcpServers": {\n    "screenmind": {\n      "command": "python",\n      "args": ["-m", "screenmind.mcp_server"]\n    }\n  }\n}' },
        { p: "Config location — <b>Claude Desktop:</b> <code>%APPDATA%\\Claude\\claude_desktop_config.json</code> (Windows) or <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS). <b>Cursor:</b> Settings → MCP. <b>VS Code:</b> <code>.vscode/mcp.json</code>." },
        { h: "Tools" },
        { list: [
          "<code>search_screen</code> — natural-language search across your history (semantic + keyword)",
          "<code>get_recent_activity</code> — the most recent N activities",
          "<code>get_activity_by_time</code> — activities for a specific date/time range",
          "<code>get_daily_summary</code> — the AI daily summary and standup notes",
          "<code>search_audio</code> — search across meeting transcripts",
          "<code>get_screenshot</code> — fetch a screenshot path by activity id",
          "<code>capture_now</code> — trigger an instant screenshot",
          "<code>get_stats</code> — overall statistics about your screen history",
        ] },
        { h3: "Test it" },
        { code: "npx @modelcontextprotocol/inspector python -m screenmind.mcp_server" },
        { p: "Opens the MCP Inspector web UI so you can call each tool interactively before wiring up your assistant." },
        { callout: "Tip: ask Claude <i>“what was I working on at 3pm?”</i> — it calls <code>get_activity_by_time</code> under the hood and reads straight from your local database. Read-only, all local, no API keys." },
      ],
    },

    privacy: {
      tag: "Private by design",
      title: "Nothing leaves your machine",
      seoTitle: "Privacy & Security",
      blocks: [
        { p: "It's literally watching your screen, so privacy isn't a setting — it's the default. Nothing is uploaded, nothing is phoned home." },
        { h: "Privacy & security, by default" },
        { cards: [
          { i: "🏠", t: "100% local", d: "All processing on your machine. Zero network calls after the initial model download. No telemetry, ever." },
          { i: "🛡️", t: "Sensitive-data filter", d: "Auto-redacts credit cards (Luhn-checked), SSNs, API keys, JWTs and passwords from captured text before storage." },
          { i: "🔐", t: "Encryption at rest", d: "Optional AES (Fernet) encryption for screenshots, with the key held in your OS keyring." },
          { i: "🔢", t: "Dashboard PIN lock", d: "Hashed PIN with a configurable auto-lock timeout for the dashboard." },
          { i: "🕶️", t: "Incognito mode", d: "One-click pause — nothing is recorded while it's on." },
          { i: "🗑️", t: "Retention control", d: "Auto-delete data older than N days (or keep forever). Clear any day from the timeline instantly." },
        ] },
        { callout: "Fun fact: the secret-redaction pass runs <b>before</b> the model ever sees the frame — so even your own local AI never reads your card numbers, SSNs or API keys." },
      ],
    },

    // ── DEEP DIVE (how it works + architecture, merged & high-level) ──
    "how-it-works": {
      tag: "Deep dive",
      title: "Under the hood",
      seoTitle: "How ScreenMind works — architecture",
      blocks: [
        { p: "A quick tour of how ScreenMind turns a screen into memory — enough to understand it, without the internals you'd need to rebuild it." },
        { diagram: `┌ Capture ───┐   ┌ Analyze · one GPU ───┐   ┌ Store ───┐
│ dedup      │──▶│ OCR → Gemma 4 → embed │──▶│ SQLite   │──▶  Search · Chat
│ a11y+redact│   └───────────────────────┘   │ + FTS5   │      Agents · MCP
└────────────┘          ▲                     └──────────┘
                        └── Chat · Voice · Meetings share the same model` },
        { h: "Capture → memory" },
        { steps: [
          { t: "Smart capture", d: "A worker watches the screen and only saves when it meaningfully changes (perceptual hashing), auto-pausing on games/editors and skipping blocked apps." },
          { t: "Read the screen", d: "Accessibility APIs and OCR pull the on-screen text, handed to the model as context so it spends its budget understanding, not reading." },
          { t: "Redact secrets", d: "A filter strips cards, SSNs, API keys and passwords before anything is stored or sent to the model." },
          { t: "Understand", d: "Gemma 4 E2B turns the frame + text into structured meaning — app, activity, summary, mood, layout." },
          { t: "Index", d: "A MiniLM embedding (on CPU) plus a full-text index land in local SQLite, powering hybrid semantic + keyword search." },
        ] },
        { h: "One model, one GPU" },
        { p: "Everything — screen vision, meeting audio, chat and summaries — runs on a single local Gemma 4 E2B. The interesting part is sharing one GPU gracefully:" },
        { list: [
          "<b>Chat comes first.</b> A chat message cancels any in-flight analysis, frees the GPU in under a second, then answers — the dropped frame is re-queued.",
          "<b>Don't repeat work.</b> A per-app cache skips frames that barely changed, so most captures never touch the model.",
          "<b>Three modes.</b> Fast (~12s), Balanced (~40s) or Accurate (~76s) on a 4&nbsp;GB GTX 1650 — and far quicker on bigger GPUs.",
        ] },
        { h: "Footprint" },
        { list: [
          "~3–4&nbsp;GB VRAM, ~1.5–2&nbsp;GB RAM, ~80–150&nbsp;MB disk per active day.",
          "100% local — the only network call is the one-time model download.",
          "Windows, macOS and Linux (X11 + Wayland) via an OS-abstraction layer.",
        ] },
        { callout: "Fun fact: “fast” mode pre-fills an empty &lt;think&gt;&lt;/think&gt; block so the model skips its own reasoning and answers immediately — that's most of the jump from ~76s down to ~12s per frame." },
      ],
    },
  },
};
