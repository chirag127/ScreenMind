"""
Model Manager for ScreenMind
Handles llama-server process lifecycle, GGUF model downloads, and model switching.
"""

import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Optional, Callable

from config import settings


# Available models with HuggingFace download info
AVAILABLE_MODELS = [
    {
        "key": "gemma-4-e2b",
        "name": "Gemma 4 E2B",
        "size": "2B",
        "vram": "~4 GB",
        "quality": "Good",
        "tier": 1,
        "hf_repo": "unsloth/gemma-4-E2B-it-GGUF",
        "hf_file": "Q4_K_M.gguf",
        "audio": True,
        "vision": True,
    },
    {
        "key": "gemma-4-e4b",
        "name": "Gemma 4 E4B",
        "size": "4B",
        "vram": "~6 GB",
        "quality": "Great",
        "tier": 2,
        "hf_repo": "unsloth/gemma-4-E4B-it-GGUF",
        "hf_file": "Q4_K_M.gguf",
        "audio": True,
        "vision": True,
    },
]


# Server process state
_server_process: Optional[subprocess.Popen] = None
_server_lock = threading.Lock()
_active_model_key: Optional[str] = None

# Download state — single-flight + thread-safe reads/writes
_download_lock = threading.Lock()      # guards the entire download→start lifecycle
_download_state_lock = threading.Lock()  # guards state dict reads/writes
_download_state: dict = {
    "active": False,
    "model": None,
    "status": "idle",           # idle | downloading | starting | done | error
    "downloaded_bytes": 0,
    "message": "",
}


def _set_download_state(**kwargs) -> None:
    """Thread-safe update of download state."""
    global _download_state
    with _download_state_lock:
        _download_state = {**_download_state, **kwargs}


def get_download_state() -> dict:
    """Get a copy of the current download state (safe from any thread)."""
    with _download_state_lock:
        return dict(_download_state)


def _clear_error_state() -> None:
    """Clear a sticky error state (called when a new download or retry starts)."""
    st = get_download_state()
    if st["status"] == "error" and not st["active"]:
        _set_download_state(status="idle", message="")


def get_models_dir() -> Path:
    """Get the directory where GGUF models are cached."""
    d = settings.data_path / "models"
    d.mkdir(parents=True, exist_ok=True)
    return d


def get_model_info(key: str) -> Optional[dict]:
    """Get model metadata by key."""
    for m in AVAILABLE_MODELS:
        if m["key"] == key:
            return m
    return None


def list_models() -> list:
    """List all available models with download status."""
    global _active_model_key
    result = []
    for m in AVAILABLE_MODELS:
        status = "not_installed"
        if is_model_downloaded(m["key"]):
            status = "active" if m["key"] == _active_model_key else "downloaded"
        result.append({**m, "status": status})
    return result


def is_model_downloaded(key: str) -> bool:
    """
    Check if a model's GGUF file is fully downloaded in the HuggingFace cache.

    Guards against false positives from partial/interrupted downloads by checking:
    1. The model cache directory exists
    2. At least one .gguf blob file exists in snapshots/
    3. No .incomplete files exist (HF hub creates these during downloads)
    """
    info = get_model_info(key)
    if not info:
        return False
    # Check HuggingFace hub cache
    cache_dir = Path.home() / ".cache" / "huggingface" / "hub"
    if not cache_dir.exists():
        return False
    repo_slug = info["hf_repo"].replace("/", "--")
    model_cache = cache_dir / f"models--{repo_slug}"
    if not model_cache.exists():
        return False

    # Check for .incomplete files — indicates download was interrupted
    for p in model_cache.rglob("*.incomplete"):
        return False

    # Verify at least one GGUF blob actually exists in snapshots
    # HF cache stores actual files in blobs/ as hash-named files,
    # and snapshots/ contains symlinks/pointers. Check blobs/ for non-empty files.
    blobs_dir = model_cache / "blobs"
    if blobs_dir.exists():
        blob_files = [f for f in blobs_dir.iterdir() if f.is_file() and f.stat().st_size > 1024 * 1024]
        if blob_files:
            return True

    # Fallback: check if any snapshot directory has content
    snapshots_dir = model_cache / "snapshots"
    if snapshots_dir.exists():
        for snap in snapshots_dir.iterdir():
            if snap.is_dir() and any(snap.iterdir()):
                return True

    return False


def _do_download(key: str) -> bool:
    """
    Internal: download a model GGUF from HuggingFace.
    Caller must hold _download_lock. Updates _download_state as it progresses.
    """
    info = get_model_info(key)
    if not info:
        return False

    _set_download_state(
        active=True, model=key, status="downloading",
        downloaded_bytes=0, message=f"Downloading {info['name']}...",
    )

    print(f"[ModelManager] Downloading {info['name']} from {info['hf_repo']}...")

    try:
        cmd = [
            sys.executable, "-m", "huggingface_hub", "download",
            info["hf_repo"], info["hf_file"],
            "--local-dir-use-symlinks", "False",
        ]

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # Poll for progress while download runs
        cache_dir = Path.home() / ".cache" / "huggingface" / "hub"
        repo_slug = info["hf_repo"].replace("/", "--")
        model_cache = cache_dir / f"models--{repo_slug}"

        while proc.poll() is None:
            time.sleep(3)
            total_bytes = 0
            try:
                if model_cache.exists():
                    for f in model_cache.rglob("*"):
                        if f.is_file():
                            try:
                                total_bytes += f.stat().st_size
                            except OSError:
                                pass
            except Exception:
                pass
            # Monotonic: never go backwards (#6)
            cur = get_download_state().get("downloaded_bytes", 0)
            _set_download_state(downloaded_bytes=max(cur, total_bytes),
                                message=f"Downloading {info['name']}...")

        if proc.returncode == 0:
            print(f"[ModelManager] Download complete: {info['name']}")
            return True
        else:
            stderr = (proc.stderr.read() or b"").decode()[:200]
            print(f"[ModelManager] Download failed: {stderr}")
            _set_download_state(status="error", message=f"Download failed: {stderr[:100]}")
            return False
    except Exception as e:
        print(f"[ModelManager] Download error: {e}")
        _set_download_state(status="error", message=f"Error: {str(e)[:100]}")
        return False


def start_server(model_key: Optional[str] = None, timeout: int = 60) -> bool:
    """
    Start llama-server with the specified model.
    If already running with the same model, does nothing.
    If running with a different model, restarts.

    Args:
        timeout: seconds to wait for /health (60 normal, 180 for cold start after download)
    """
    global _server_process, _active_model_key

    key = model_key or settings.active_model
    info = get_model_info(key)
    if not info:
        print(f"[ModelManager] Unknown model: {key}")
        return False

    with _server_lock:
        # Already running with this model?
        if _server_process and _server_process.poll() is None and _active_model_key == key:
            return True

        # Stop existing server (inline — we already hold the lock)
        if _server_process:
            try:
                _server_process.terminate()
                _server_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                _server_process.kill()
            except Exception:
                pass
            _server_process = None
            _active_model_key = None

        # Build llama-server command
        hf_spec = f"{info['hf_repo']}:{info['hf_file'].replace('.gguf', '')}"
        port = settings.llama_server_port

        # Find llama-server binary: check project's llama/ folder first, then PATH
        llama_bin = "llama-server"
        project_bin = Path(__file__).parent.parent / "llama" / "llama-server.exe"
        if project_bin.exists():
            llama_bin = str(project_bin)
        elif sys.platform == "win32":
            # Also check without .exe for PATH lookup
            llama_bin = "llama-server.exe"

        cmd = [
            llama_bin,
            "-hf", hf_spec,
            "--mmproj-auto",
            "--port", str(port),
            "-ngl", str(settings.num_gpu_layers),
            "-c", str(settings.context_window),
            "--parallel", "1",   # Single slot — analysis/audio/chat are sequential
            "--no-warmup",
        ]

        # Flash attention — faster + less VRAM, but not all GPUs support it
        if settings.flash_attention:
            cmd.extend(["--flash-attn", "on"])

        # KV cache quantization — saves ~60% KV VRAM with negligible quality loss
        if settings.kv_cache_quant:
            cmd.extend(["--cache-type-k", "q8_0", "--cache-type-v", "q4_0"])

        print(f"[ModelManager] Starting llama-server: {info['name']} on port {port} (timeout={timeout}s)")

        try:
            startupinfo = None
            if sys.platform == "win32":
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0

            # Use DEVNULL for stdout/stderr to prevent pipe buffer deadlock.
            # llama-server writes a lot of logs — if we use PIPE and never read,
            # the OS buffer fills and the process hangs.
            _server_process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                startupinfo=startupinfo,
            )

            # Wait for server to be ready (poll /health)
            for i in range(timeout):
                time.sleep(1)
                if _server_process.poll() is not None:
                    print(f"[ModelManager] Server exited early (code: {_server_process.returncode})")
                    _server_process = None
                    return False
                try:
                    import httpx
                    r = httpx.get(f"http://127.0.0.1:{port}/health", timeout=2)
                    if r.status_code == 200:
                        _active_model_key = key
                        print(f"[ModelManager] Server ready ({i+1}s)")
                        return True
                except Exception:
                    pass

            print(f"[ModelManager] Server failed to start within {timeout}s")
            stop_server()
            return False

        except FileNotFoundError:
            print("[ModelManager] llama-server not found.")
            if sys.platform == "win32":
                print("[ModelManager]   Run: python setup_llama.py")
                print("[ModelManager]   Or download from: https://github.com/ggml-org/llama.cpp/releases")
            elif sys.platform == "darwin":
                print("[ModelManager]   Run: brew install llama.cpp")
                print("[ModelManager]   Or:  python setup_llama.py")
            else:
                print("[ModelManager]   Run: python setup_llama.py")
                print("[ModelManager]   Or download from: https://github.com/ggml-org/llama.cpp/releases")
            return False
        except Exception as e:
            print(f"[ModelManager] Failed to start server: {e}")
            return False


def stop_server():
    """Stop the running llama-server process."""
    global _server_process, _active_model_key

    with _server_lock:
        if _server_process:
            try:
                _server_process.terminate()
                _server_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                _server_process.kill()
            except Exception:
                pass
            _server_process = None
            _active_model_key = None
            print("[ModelManager] Server stopped")


def switch_model(key: str) -> bool:
    """Switch to a different model (restarts server)."""
    info = get_model_info(key)
    if not info:
        return False
    _clear_error_state()
    settings.save_runtime_overrides({"active_model": key})
    return start_server(key)


def restart_server() -> bool:
    """
    Force-restart the server with the current active model.
    Always stops and restarts, even if the same key is active.
    Used by the Retry button.

    Respects _download_lock: refuses if a download lifecycle is active,
    and prevents concurrent retries from racing each other.
    """
    if not _download_lock.acquire(blocking=False):
        print("[ModelManager] Lifecycle in progress, retry ignored")
        return False

    try:
        _clear_error_state()
        stop_server()
        return start_server(settings.active_model, timeout=180)
    finally:
        _download_lock.release()


def get_active_model() -> Optional[str]:
    """Get the currently active model key."""
    return _active_model_key


def is_server_running() -> bool:
    """Check if llama-server process is alive."""
    return _server_process is not None and _server_process.poll() is None


def get_model_status() -> dict:
    """
    Get the full model status for the frontend.

    Returns a dict with:
      status: "no_model" | "downloading" | "starting" | "ready" | "error"
      active_model: str | None
      download: dict | None  (download state if active)
    """
    dl = get_download_state()
    active = get_active_model() or settings.active_model

    # Check download/lifecycle state first (active=True means lifecycle in progress)
    if dl["active"]:
        return {
            "status": dl["status"],  # "downloading" or "starting"
            "active_model": active,
            "model_downloaded": is_model_downloaded(active),
            "download": {
                "model": dl["model"],
                "downloaded_bytes": dl["downloaded_bytes"],
                "message": dl["message"],
                "status": dl["status"],
            },
        }

    # Sticky error from a failed download→start cycle (#4)
    if dl["status"] == "error":
        return {
            "status": "error",
            "active_model": active,
            "model_downloaded": is_model_downloaded(active),
            "download": None,
            "message": dl["message"],
        }

    # No download in progress — check server
    if is_server_running():
        return {
            "status": "ready",
            "active_model": active,
            "model_downloaded": True,
            "download": None,
        }

    # Server not running — is a model at least downloaded?
    if is_model_downloaded(active):
        return {
            "status": "error",  # downloaded but server not running
            "active_model": active,
            "model_downloaded": True,
            "download": None,
            "message": "Server not running. Click Retry to restart.",
        }

    # Check if ANY model is downloaded (active might be wrong)
    for m in AVAILABLE_MODELS:
        if is_model_downloaded(m["key"]):
            return {
                "status": "error",
                "active_model": active,
                "model_downloaded": True,
                "download": None,
                "message": f"Model {m['key']} is downloaded but not active. Switch in Settings.",
            }

    return {
        "status": "no_model",
        "active_model": active,
        "model_downloaded": False,
        "download": None,
    }


def _check_model_disk_space(key: str) -> bool:
    """Check disk space before model download. Returns True if enough space."""
    info = get_model_info(key)
    if not info:
        return True

    # Estimate model size from known info (rough: 2B~1.5GB, 4B~3GB at Q4_K_M)
    estimated_sizes = {
        "gemma-4-e2b": 1.5 * 1024**3,
        "gemma-4-e4b": 3.0 * 1024**3,
    }
    model_size = estimated_sizes.get(key, 2 * 1024**3)  # default 2GB
    headroom = 1 * 1024**3  # 1GB headroom
    required = model_size + headroom

    try:
        usage = shutil.disk_usage(Path.home())
        if usage.free < required:
            free_gb = usage.free / (1024**3)
            need_gb = required / (1024**3)
            print(f"[ModelManager] WARNING: Low disk space! Free: {free_gb:.1f}GB, Need: ~{need_gb:.1f}GB")
            _set_download_state(
                status="error",
                message=f"Not enough disk space. Free: {free_gb:.1f}GB, Need: ~{need_gb:.1f}GB",
            )
            return False
        return True
    except Exception:
        return True  # If we can't check, don't block


def download_and_start(key: str) -> bool:
    """
    Download a model, switch to it, and start the server.
    Used by the lock screen "Download" button.

    Holds _download_lock across the ENTIRE lifecycle (download→start)
    so no second request can slip in between. (#3)

    Updates download state through: downloading → starting → ready/error.
    On failure, leaves error state sticky so the retry screen shows. (#4)
    """
    if not _download_lock.acquire(blocking=False):
        print(f"[ModelManager] Lifecycle already in progress, rejecting {key}")
        return False

    try:
        # Clear any previous sticky error
        _clear_error_state()

        # Disk space check (#8)
        if not _check_model_disk_space(key):
            return False

        # Download phase
        ok = _do_download(key)
        if not ok:
            # Error state is already set by _do_download — leave it sticky
            return False

        # Transition to "starting" state
        _set_download_state(status="starting", message="Starting model server...")

        # Switch active model and start server with extended timeout (#7)
        settings.save_runtime_overrides({"active_model": key})
        started = start_server(key, timeout=180)  # 3 min for cold GGUF load

        if started:
            _set_download_state(
                active=False, status="idle", model=None,
                downloaded_bytes=0, message="",
            )
            return True
        else:
            # Leave error sticky (#4)
            _set_download_state(
                active=False, status="error",
                message="Server failed to start. Check GPU/VRAM.",
            )
            return False
    except Exception as e:
        _set_download_state(
            active=False, status="error",
            message=f"Unexpected error: {str(e)[:100]}",
        )
        return False
    finally:
        _download_lock.release()
