# Contributing to ScreenMind

Contributions are welcome — bug fixes, features, docs, tests, all of it.

## Setup

1. Fork and clone:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ScreenMind.git
   cd ScreenMind
   ```

2. Install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-test.txt
   ```

3. Set up a Gemma model (needed for the analysis engine):
   ```bash
   python setup_llama.py
   ```
   Or use the Model Hub in the web dashboard to download a model.

4. Run tests:
   ```bash
   pytest
   ```

## Reporting Bugs

Open an [issue](https://github.com/ayushh0110/ScreenMind/issues) with:
- Your OS, Python version, and GPU (model + VRAM)
- Steps to reproduce
- Relevant logs or screenshots

## Pull Requests

1. Branch off `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes, add tests if applicable
3. Run `pytest` to make sure nothing breaks
4. Open a PR against `main`

Keep commits focused — one logical change per commit.

## Where Help is Needed

- **macOS support** — screen capture on macOS needs work
- **Wayland testing** — Wayland capture works but needs more real-world testing across distros
- **Model testing** — trying ScreenMind with different Gemma quantizations and variants
- **Agent recipes** — writing and sharing useful agent configurations in `default_agents/`
- **MCP integrations** — expanding the MCP server with new tools
- **Docs** — tutorials, setup guides for specific hardware, video walkthroughs

## Project Structure

```
ScreenMind/
├── api/              # Web dashboard + REST API (Flask)
├── capture/          # Screen capture (Windows, X11, Wayland)
├── engine/           # Analysis, LLM client, embeddings, agents
├── storage/          # SQLite database layer
├── workers/          # Background workers (audio transcription)
├── integrations/     # Notion, webhooks, etc.
├── platform_support/ # OS-specific window detection
├── tests/            # Test suite (pytest)
├── main.py           # Entry point — starts capture + API server
├── mcp_server.py     # MCP server for IDE integration
└── config.py         # All configuration and model settings
```

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
