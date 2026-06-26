"""
Screen Capture Module
Captures screenshots using mss (fastest cross-platform method).
On Wayland, delegates to WaylandScreenCapture (grim / XDG Portal).
Saves as JPEG with configurable quality to date-organized directories.
"""

import logging
import io
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

import mss
import mss.tools
from PIL import Image

from config import settings
from platform_support import is_wayland

logger = logging.getLogger("screenmind.capture.screen")


class ScreenCapture:
    """Handles screenshot capture, compression, and storage.

    On Wayland Linux, delegates to WaylandScreenCapture (grim/XDG Portal).
    On X11/Windows/macOS, uses mss directly.
    """

    def __init__(self):
        self._backend = None
        self._sct = None

        if sys.platform == "linux" and is_wayland():
            try:
                from capture.wayland import WaylandScreenCapture
                self._backend = WaylandScreenCapture()
            except Exception as e:
                logger.error(f"Wayland backend failed to init: {e}")
                logger.warning("Capture will be unavailable.")
                # self._backend stays None — capture() returns None gracefully
        else:
            self._sct = mss.mss()

    def capture(self) -> Optional[Tuple[Path, Image.Image]]:
        """
        Capture the primary monitor and save as a compressed JPEG.

        Returns:
            Tuple of (saved file path, PIL Image) or None if capture fails.
        """
        if self._backend:
            return self._backend.capture()

        if self._sct:
            try:
                # Grab the primary monitor (index 1; index 0 is the "all monitors" virtual screen)
                monitor = self._sct.monitors[1]
                raw = self._sct.grab(monitor)

                # Convert to PIL Image (mss returns BGRA, PIL expects RGB)
                img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

                # Save to date-organized directory
                now = datetime.now()
                date_dir = settings.screenshots_dir / now.strftime("%Y-%m-%d")
                date_dir.mkdir(parents=True, exist_ok=True)

                filename = f"{now.strftime('%H-%M-%S')}_{int(now.timestamp() * 1000) % 1000:03d}.jpg"
                filepath = date_dir / filename

                img.save(
                    str(filepath),
                    "JPEG",
                    quality=settings.screenshot_quality,
                    optimize=True,
                )

                # Encrypt at rest if enabled (no-op when encryption_enabled=False)
                try:
                    from privacy.encryption import encrypt_image
                    encrypt_image(filepath)
                except Exception:
                    pass  # Never fail capture due to encryption

                return filepath, img

            except Exception as e:
                logger.error(f"Error capturing screenshot: {e}")
                return None

        return None  # both _backend and _sct are None (init failure)

    def capture_to_bytes(self) -> Optional[Tuple[bytes, Image.Image]]:
        """
        Capture screenshot and return as JPEG bytes (for immediate processing
        without saving to disk first).

        Returns:
            Tuple of (JPEG bytes, PIL Image) or None if capture fails.
        """
        if self._backend:
            return self._backend.capture_to_bytes()

        if self._sct:
            try:
                monitor = self._sct.monitors[1]
                raw = self._sct.grab(monitor)
                img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

                buffer = io.BytesIO()
                img.save(
                    buffer,
                    "JPEG",
                    quality=settings.screenshot_quality,
                    optimize=True,
                )
                return buffer.getvalue(), img

            except Exception as e:
                logger.error(f"Error capturing to bytes: {e}")
                return None

        return None

    def close(self):
        """Release capture resources."""
        if self._backend:
            self._backend.close()
        elif self._sct:
            self._sct.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

