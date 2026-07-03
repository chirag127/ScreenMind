"""
ScreenMind — Main Entry Point
Starts all services: capture, analysis, API server.
Includes startup health checks and graceful error handling.
"""

import logging
import asyncio
import shutil
import signal
import sys

import threading

import uvicorn

from screenmind.config import settings
from screenmind.storage.database import Database
from screenmind.engine.embedder import Embedder
from screenmind.workers.capture_worker import CaptureWorker
from screenmind.workers.analysis_worker import AnalysisWorker
from screenmind.workers.audio_worker import AudioWorker
from screenmind.capture.hotkey import HotkeyListener
from screenmind.api.server import create_app

logger = logging.getLogger("screenmind.main")


def check_llama_server() -> bool:
    """Check if llama-server is reachable and ready for inference."""
    from screenmind.engine import llm_client

    status = llm_client.get_server_status()
    if status["status"] == "ok":
        logger.info(f"OK - llama-server online at {settings.llama_server_host}")
        return True
    elif status["status"] == "unreachable":
        logger.error(f"FAIL - Cannot reach llama-server at {settings.llama_server_host}")
        logger.info(f"Start it with: llama-server -hf unsloth/gemma-4-E2B-it-GGUF:Q4_K_M --mmproj-auto -ngl 99 --port {settings.llama_server_port}")
        return False
    else:
        logger.info(f"WARN - llama-server issue: {status['detail']}")
        return False


def check_disk_space():
    """Warn if disk space is low."""
    try:
        usage = shutil.disk_usage(str(settings.data_path))
        free_gb = usage.free / (1024 ** 3)
        if free_gb < 1.0:
            logger.info(f"WARN - Low disk space: {free_gb:.1f}GB free. ScreenMind needs space for screenshots.")
        else:
            logger.info(f"OK - Disk space: {free_gb:.1f}GB free")
    except Exception:
        pass


def print_first_run_help():
    """Show helpful info on first run (no DB yet)."""
    if not settings.db_path.exists():
        print(file=sys.stderr)  # noqa: T201
        print("  +==========================================+", file=sys.stderr)  # noqa: T201
        print("  |  Welcome to ScreenMind -- First Run!     |", file=sys.stderr)  # noqa: T201
        print("  +==========================================+", file=sys.stderr)  # noqa: T201
        print("  |  Screenshots will be saved to:           |", file=sys.stderr)  # noqa: T201
        print(f"  |    {str(settings.screenshots_dir)[:38]:<38} |", file=sys.stderr)  # noqa: T201
        print("  |                                          |", file=sys.stderr)  # noqa: T201
        print("  |  Press Ctrl+Shift+B to bookmark a moment |", file=sys.stderr)  # noqa: T201
        print("  |  Open the dashboard to see your timeline |", file=sys.stderr)  # noqa: T201
        print("  +==========================================+", file=sys.stderr)  # noqa: T201
        print(file=sys.stderr)  # noqa: T201


async def main():
    """Initialize and run all ScreenMind services."""

    print("=" * 60, file=sys.stderr)  # noqa: T201
    print("  ScreenMind — Privacy-First Screen Activity Journal", file=sys.stderr)  # noqa: T201
    print("  Powered by Gemma 4 E2B (100% Local)", file=sys.stderr)  # noqa: T201
    print("=" * 60, file=sys.stderr)  # noqa: T201
    print(file=sys.stderr)  # noqa: T201

    # ── AI dependency check (first-run only) ──────────────────────────
    _missing_ai = []
    try:
        import sentence_transformers  # noqa: F401
    except ImportError:
        _missing_ai.append("sentence-transformers>=3.3,<4.0")
    try:
        import easyocr  # noqa: F401
    except ImportError:
        _missing_ai.append("easyocr>=1.7.2,<2.0")

    if _missing_ai:
        print("=" * 60, file=sys.stderr)  # noqa: T201
        print("  ScreenMind requires AI packages for screen analysis.", file=sys.stderr)  # noqa: T201
        print("  This is a one-time download of ~2.5 GB (PyTorch + AI models).", file=sys.stderr)  # noqa: T201
        print("=" * 60, file=sys.stderr)  # noqa: T201
        print(file=sys.stderr)  # noqa: T201
        answer = input("  Install now? [Y/n]: ").strip().lower()
        if answer in ("", "y", "yes"):
            import subprocess
            print(file=sys.stderr)  # noqa: T201
            for pkg in _missing_ai:
                name = pkg.split(">=")[0]
                print(f"  Installing {name}...", file=sys.stderr)  # noqa: T201
                subprocess.check_call(
                    [sys.executable, "-m", "pip", "install", pkg],
                    stdout=sys.stderr,
                )
            print(file=sys.stderr)  # noqa: T201
            print("  AI packages installed successfully!", file=sys.stderr)  # noqa: T201
            print(file=sys.stderr)  # noqa: T201
        else:
            print(file=sys.stderr)  # noqa: T201
            print("  ScreenMind requires these packages for screen analysis. Cannot start.", file=sys.stderr)  # noqa: T201
            print(f"  Install manually:  pip install {' '.join(_missing_ai)}", file=sys.stderr)  # noqa: T201
            sys.exit(1)

    # ── First-run experience ─────────────────────────────────────────
    settings.ensure_dirs()
    print_first_run_help()

    logger.info(f"Data directory: {settings.data_path}")
    logger.info(f"Capture interval: {settings.capture_interval}s")
    logger.info(f"Model: {settings.active_model} ({settings.gemma_mode} mode)")
    if settings.blocked_apps_list:
        logger.info(f"Privacy zones: {', '.join(settings.blocked_apps_list)}")
    if settings.gemma_mode == "api":
        print("", file=sys.stderr)  # noqa: T201
        print("=" * 70, file=sys.stderr)  # noqa: T201
        print("WARNING: gemma_mode=api — screenshots are sent to Google AI Studio!", file=sys.stderr)  # noqa: T201
        print("   This disables the local-only privacy guarantee.", file=sys.stderr)  # noqa: T201
        print("   Set GEMMA_MODE=local to keep all data on your machine.", file=sys.stderr)  # noqa: T201
        print("=" * 70, file=sys.stderr)  # noqa: T201
    print(file=sys.stderr)  # noqa: T201

    # ── llama-server setup ─────────────────────────────────────────────
    # Check if llama-server binary is available; offer to install if missing
    from screenmind.setup_llama import ensure_llama_server
    llama_binary_available = ensure_llama_server()

    # ── Health checks ────────────────────────────────────────────────
    from screenmind.engine import model_manager
    if llama_binary_available:
        # Binary exists — check if server is running, start if not
        if not check_llama_server():
            logger.info("llama-server not running — starting automatically...")
            llm_server_ok = model_manager.start_server(settings.active_model, timeout=120)
        else:
            llm_server_ok = True
    else:
        llm_server_ok = False

    check_disk_space()
    if not llm_server_ok:
        print(file=sys.stderr)  # noqa: T201
        logger.warning("Starting without Gemma 4 -- screenshots will be captured")
        logger.warning("but NOT analyzed until llama-server is available.")
        logger.warning("The dashboard and API will still work with existing data.")
        if not llama_binary_available:
            logger.info("Run 'python -m screenmind.setup_llama' to install llama-server.")
        print(file=sys.stderr)  # noqa: T201
    print(file=sys.stderr)  # noqa: T201

    # ── Shared services ──────────────────────────────────────────────
    db = Database()
    # Fix any meetings left 'ongoing' from a previous crash
    stale = db.cleanup_stale_meetings()
    if stale:
        logger.info(f"Cleaned up {stale} stale meeting(s) from previous session")
    # Auto-cleanup old data based on retention setting
    if settings.retention_days > 0:
        cleaned = db.cleanup_old_data(settings.retention_days)
        if cleaned["activities"] > 0 or cleaned["meetings"] > 0:
            logger.info(f"Retention cleanup: removed {cleaned['activities']} activities, "
                  f"{cleaned['meetings']} meetings older than {settings.retention_days} days")
    embedder = Embedder()

    # Thread-safe shutdown flag (checked by voice transcription thread before DB writes)
    _shutdown = threading.Event()

    # ── Processing queue ─────────────────────────────────────────────
    processing_queue: asyncio.Queue = asyncio.Queue(maxsize=100)

    # ── Workers ──────────────────────────────────────────────────────
    capture_worker = CaptureWorker(queue=processing_queue, database=db)
    analysis_worker = AnalysisWorker(queue=processing_queue, database=db)

    # ── Audio Worker (Meeting Transcription) ─────────────────────────
    audio_worker = AudioWorker(database=db)
    # Inject audio_worker into capture_worker so it can signal meeting detection
    capture_worker._audio_worker = audio_worker

    # ── Hotkey Listener ──────────────────────────────────────────────
    from screenmind.ui.overlay import show_overlay_notification
    from screenmind.capture.voice_recorder import VoiceRecorder
    from screenmind.engine import llm_client

    voice_recorder = VoiceRecorder()

    def _on_bookmark():
        capture_worker.trigger_bookmark()
        show_overlay_notification("📌 Bookmarked", "Screenshot captured and bookmarked", duration=2.5, color="#10b981")

    def _toggle_pause():
        if capture_worker.is_paused:
            capture_worker.resume(source="hotkey")
            logger.info(">> Capture resumed")
            show_overlay_notification("▶ Capturing Resumed", "Screen recording is active", duration=2.5, color="#8b5cf6")
        else:
            capture_worker.pause(source="hotkey")
            logger.info("|| Capture paused")
            show_overlay_notification("⏸ Capturing Paused", "Screen recording is paused", duration=2.5, color="#f59e0b")

    def _on_voice_start():
        voice_recorder.start()
        show_overlay_notification("🎙️ Recording", "Speak now... release to stop", duration=1.0, color="#ec4899")

    def _on_voice_stop():
        import threading

        result = voice_recorder.stop()
        if result is None:
            show_overlay_notification("⚠️ Too Short", "Recording discarded", duration=1.5, color="#f59e0b")
            return

        wav_bytes, screenshot_path, wav_path = result
        show_overlay_notification("✨ Transcribing...", "Processing voice memo", duration=2.0, color="#8b5cf6")

        # Transcribe in background thread (don't block hotkey handler)
        def _transcribe():
            try:
                transcript = llm_client.transcribe_audio(wav_bytes)
                # Guard: don't write to DB if shutdown is in progress
                if _shutdown.is_set():
                    logger.info("Shutdown in progress — discarding memo")
                    return
                # Save to database as a voice memo activity
                from screenmind.storage.models import ScreenshotEntry
                from datetime import datetime
                entry = ScreenshotEntry(
                    timestamp=datetime.now(),
                    screenshot_path=str(screenshot_path) if screenshot_path else "",
                    window_title="Voice Memo",
                    detected_app_name="Voice Memo",
                    bookmarked=True,
                    analyzed=False,
                )
                activity_id = db.insert_activity(entry)
                # Update with transcription
                from screenmind.storage.models import ActivityRecord
                analysis = ActivityRecord(
                    app_name="Voice Memo",
                    activity_category="other",
                    activity_summary=transcript[:200] if transcript else "Voice memo",
                    detailed_context=str(wav_path),
                    mood="neutral",
                    confidence=0.9,
                )
                db.update_activity_analysis(activity_id, analysis)
                logger.info(f"Saved: {transcript[:60]}...")
                show_overlay_notification("✅ Memo Saved", transcript[:50] if transcript else "Saved", duration=2.0, color="#10b981")
            except Exception as e:
                logger.error(f"Transcription failed: {e}")
                show_overlay_notification("❌ Failed", str(e)[:50], duration=2.0, color="#ef4444")

        threading.Thread(target=_transcribe, daemon=True).start()

    hotkey_listener = HotkeyListener(
        bookmark_callback=_on_bookmark,
        pause_callback=_toggle_pause,
        voice_start_callback=_on_voice_start,
        voice_stop_callback=_on_voice_stop,
    )

    # ── API Server ───────────────────────────────────────────────────
    app = create_app(
        database=db,
        embedder=embedder,
        capture_worker=capture_worker,
        analysis_worker=analysis_worker,
        audio_worker=audio_worker,
    )

    # ── Graceful Shutdown ────────────────────────────────────────────
    shutdown_event = asyncio.Event()

    def handle_signal(*_):
        print("\n[Main] Shutdown signal received...", file=sys.stderr)  # noqa: T201
        _shutdown.set()  # Signal voice transcription thread
        shutdown_event.set()

    signal.signal(signal.SIGINT, handle_signal)
    if sys.platform != "win32":
        signal.signal(signal.SIGTERM, handle_signal)

    # ── Safety check: warn/block 0.0.0.0 binding without PIN ──────────
    if settings.api_host in ("0.0.0.0", "::"):
        if not settings.dashboard_pin_hash:
            print("", file=sys.stderr)  # noqa: T201
            print("=" * 70, file=sys.stderr)  # noqa: T201
            print("WARNING: Binding to 0.0.0.0 exposes ALL screen data to your network!", file=sys.stderr)  # noqa: T201
            print("   Set a PIN (dashboard_pin_hash) before exposing to the network.", file=sys.stderr)  # noqa: T201
            print("   Falling back to 127.0.0.1 for safety.", file=sys.stderr)  # noqa: T201
            print("=" * 70, file=sys.stderr)  # noqa: T201
            print("", file=sys.stderr)  # noqa: T201
            settings.api_host = "127.0.0.1"
        else:
            logger.warning("WARNING: Server exposed to network (0.0.0.0). PIN auth is enabled.")

    # ── Start API server in background thread ────────────────────────
    server_config = uvicorn.Config(
        app,
        host=settings.api_host,
        port=settings.api_port,
        log_level="warning",
    )
    server = uvicorn.Server(server_config)

    # Run uvicorn in a thread so it doesn't block the async loop
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    # ── Start Workers ────────────────────────────────────────────────
    hotkey_listener.start()

    capture_task = asyncio.create_task(capture_worker.run())
    analysis_task = asyncio.create_task(analysis_worker.run())

    # ── Agent System ─────────────────────────────────────────────────
    agent_scheduler = None
    try:
        from screenmind.engine.agent_runner import AgentScheduler, get_agents_dir
        import shutil as _shutil
        from pathlib import Path as _Path
        # Copy default agents on first run
        agents_dir = get_agents_dir()
        defaults_dir = _Path(__file__).parent / "default_agents"
        if defaults_dir.exists():
            for f in defaults_dir.iterdir():
                dest = agents_dir / f.name
                if not dest.exists():
                    _shutil.copy2(f, dest)
                    logger.info(f"Installed default agent: {f.name}")

        if settings.agents_enabled:
            agent_scheduler = AgentScheduler()
            agent_scheduler.start()
            logger.info(f"Scheduler started — scanning {agents_dir}")
    except Exception as e:
        logger.info(f"Could not start scheduler: {e}")

    logger.info(f"Dashboard: http://{settings.api_host}:{settings.api_port}")
    logger.info(f"API docs:  http://{settings.api_host}:{settings.api_port}/docs")
    logger.info(f"Bookmark:  {settings.bookmark_hotkey}")
    print(file=sys.stderr)  # noqa: T201
    logger.info("ScreenMind is running! Press Ctrl+C to stop.")
    print(file=sys.stderr)  # noqa: T201

    # ── Wait for shutdown ────────────────────────────────────────────
    await shutdown_event.wait()

    # ── Cleanup ──────────────────────────────────────────────────────
    logger.info("Shutting down...")
    capture_worker.stop()
    analysis_worker.stop()
    audio_worker.force_stop()
    hotkey_listener.stop()
    if agent_scheduler:
        agent_scheduler.stop()
    server.should_exit = True

    capture_task.cancel()
    analysis_task.cancel()

    try:
        await asyncio.gather(capture_task, analysis_task, return_exceptions=True)
    except asyncio.CancelledError:
        pass

    db.close()
    model_manager.stop_server()
    logger.info("Goodbye!")


def run():
    """Sync entry point for CLI: `screenmind` command."""
    if "--version" in sys.argv:
        from screenmind import __version__
        print(f"screenmind {__version__}")  # noqa: T201
        return
    if "--help" in sys.argv or "-h" in sys.argv:
        from screenmind import __version__
        print(f"ScreenMind {__version__} -- Privacy-First AI Screen Activity Journal")  # noqa: T201
        print()  # noqa: T201
        print("Usage: screenmind [OPTIONS]")  # noqa: T201
        print()  # noqa: T201
        print("Options:")  # noqa: T201
        print("  --version    Show version and exit")  # noqa: T201
        print("  --help, -h   Show this help and exit")  # noqa: T201
        return
    asyncio.run(main())


if __name__ == "__main__":
    run()
