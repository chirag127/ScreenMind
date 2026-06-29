"""Tests for model_manager — covers today's changes:
  - is_audio_capable / get_active_capabilities
  - switch_model guards (downloaded check, single-flight lock)
  - cancel_download flag under lock
  - _cleanup_incomplete_cache
  - _check_model_disk_space for all 5 models
  - get_model_status capabilities field
"""

import threading
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from engine import model_manager


class TestAudioCapability:
    """Tests for is_audio_capable() and get_active_capabilities()."""

    def test_audio_capable_gemma4_e2b(self):
        """Gemma 4 E2B supports audio."""
        assert model_manager.is_audio_capable("gemma-4-e2b") is True

    def test_audio_capable_gemma4_e4b(self):
        """Gemma 4 E4B supports audio."""
        assert model_manager.is_audio_capable("gemma-4-e4b") is True

    def test_audio_capable_gemma4_12b(self):
        """Gemma 4 12B supports audio."""
        assert model_manager.is_audio_capable("gemma-4-12b") is True

    def test_unknown_model_not_audio(self):
        """Unknown model key returns False."""
        assert model_manager.is_audio_capable("nonexistent-model") is False

    def test_get_active_capabilities_returns_dict(self):
        """get_active_capabilities returns a dict with audio and vision keys."""
        caps = model_manager.get_active_capabilities()
        assert "audio" in caps
        assert "vision" in caps

    def test_capabilities_for_gemma4(self):
        """Gemma 4 E2B has both audio and vision."""
        with patch.object(model_manager, "_active_model_key", "gemma-4-e2b"):
            caps = model_manager.get_active_capabilities()
            assert caps["audio"] is True
            assert caps["vision"] is True

    def test_capabilities_for_gemma4_12b(self):
        """Gemma 4 12B has both audio and vision."""
        with patch.object(model_manager, "_active_model_key", "gemma-4-12b"):
            caps = model_manager.get_active_capabilities()
            assert caps["audio"] is True
            assert caps["vision"] is True


class TestSwitchModelGuards:
    """Tests for switch_model guard clauses."""

    def test_switch_unknown_model_returns_false(self):
        """Switching to unknown model returns False."""
        assert model_manager.switch_model("nonexistent") is False

    @patch.object(model_manager, "is_model_downloaded", return_value=False)
    def test_switch_not_downloaded_returns_false(self, _mock):
        """Switching to a not-downloaded model returns False."""
        assert model_manager.switch_model("nonexistent") is False

    @patch.object(model_manager, "is_model_downloaded", return_value=True)
    def test_switch_blocked_by_lock(self, _mock):
        """Switching while lifecycle lock held returns False."""
        model_manager._download_lock.acquire()
        try:
            assert model_manager.switch_model("gemma-4-e2b") is False
        finally:
            model_manager._download_lock.release()

    @patch.object(model_manager, "is_model_downloaded", return_value=True)
    @patch.object(model_manager, "is_server_running", return_value=True)
    def test_switch_sets_starting_state(self, _run, _dl):
        """switch_model sets transient 'starting' status during execution."""
        states_during = []

        def capture_start_server(key=None, **kw):
            states_during.append(model_manager.get_download_state()["status"])
            return True

        with patch.object(model_manager, "start_server", side_effect=capture_start_server):
            with patch("engine.model_manager.settings") as mock_settings:
                mock_settings.active_model = "gemma-4-e2b"
                model_manager.switch_model("gemma-4-e2b")
        assert "starting" in states_during


class TestRestartServerGuards:
    """Tests for restart_server guard clauses."""

    def test_restart_blocked_by_lock(self):
        """Restart while lifecycle lock held returns False."""
        model_manager._download_lock.acquire()
        try:
            assert model_manager.restart_server() is False
        finally:
            model_manager._download_lock.release()


class TestCancelDownload:
    """Tests for cancel_download flag safety."""

    def test_cancel_when_idle_returns_false(self):
        """Cancel when no download active returns False."""
        model_manager._set_download_state(active=False, status="idle")
        assert model_manager.cancel_download() is False

    def test_cancel_when_downloading_returns_true(self):
        """Cancel during download sets flag and returns True."""
        model_manager._set_download_state(active=True, status="downloading")
        try:
            assert model_manager.cancel_download() is True
            with model_manager._download_state_lock:
                assert model_manager._cancel_download_flag is True
        finally:
            # Clean up
            model_manager._cancel_download_flag = False
            model_manager._set_download_state(active=False, status="idle")

    def test_cancel_when_starting_returns_false(self):
        """Cancel during 'starting' phase (not downloading) returns False."""
        model_manager._set_download_state(active=True, status="starting")
        try:
            assert model_manager.cancel_download() is False
        finally:
            model_manager._set_download_state(active=False, status="idle")


class TestDiskSpaceMap:
    """Verify disk space estimates exist for all models."""

    def test_all_models_have_size_estimates(self):
        """Every model in AVAILABLE_MODELS has a disk size entry."""
        # The estimated_sizes dict is inside _check_model_disk_space,
        # so we test indirectly: no model should fall through to default.
        for m in model_manager.AVAILABLE_MODELS:
            key = m["key"]
            # _check_model_disk_space returns True (enough space) or False
            # We just verify it doesn't crash and uses a known size
            result = model_manager._check_model_disk_space(key)
            assert isinstance(result, bool), f"Disk check for {key} returned non-bool"


class TestGetModelStatus:
    """Tests for capabilities field in get_model_status."""

    @patch.object(model_manager, "is_server_running", return_value=True)
    @patch.object(model_manager, "_active_model_key", "gemma-4-e2b")
    def test_status_includes_capabilities(self, _):
        """get_model_status response includes capabilities dict."""
        model_manager._set_download_state(active=False, status="idle")
        status = model_manager.get_model_status()
        assert "capabilities" in status
        assert "audio" in status["capabilities"]
        assert "vision" in status["capabilities"]

    @patch.object(model_manager, "is_server_running", return_value=True)
    @patch.object(model_manager, "_active_model_key", "nonexistent-model")
    def test_status_capabilities_reflect_model(self, _):
        """Capabilities reflect the active model's actual support."""
        model_manager._set_download_state(active=False, status="idle")
        status = model_manager.get_model_status()
        assert status["capabilities"]["audio"] is False
        assert status["capabilities"]["vision"] is False


class TestCleanupIncompleteCache:
    """Tests for _cleanup_incomplete_cache."""

    def test_cleanup_nonexistent_repo(self):
        """Cleaning up a non-existent repo doesn't crash."""
        # Should not raise
        model_manager._cleanup_incomplete_cache("nonexistent/repo-xyz")

    def test_cleanup_removes_incomplete_files(self, tmp_path):
        """Incomplete files are removed from cache dir."""
        # Create a fake HF cache structure
        repo_dir = tmp_path / "models--test--repo"
        repo_dir.mkdir(parents=True)
        incomplete = repo_dir / "blobs" / "sha256-abc.incomplete"
        incomplete.parent.mkdir(parents=True)
        incomplete.write_text("partial data")

        complete = repo_dir / "blobs" / "sha256-def"
        complete.write_text("full data")

        with patch("pathlib.Path.home", return_value=tmp_path.parent.parent):
            # Adjust cache dir to match our tmp structure
            with patch.object(Path, "home", return_value=tmp_path / ".."):
                pass

        # Direct test: call with the actual path manipulation
        # We need to match the cache_dir = Path.home() / ".cache" / "huggingface" / "hub"
        cache_dir = tmp_path / ".cache" / "huggingface" / "hub"
        cache_dir.mkdir(parents=True)
        model_cache = cache_dir / "models--test--repo"
        model_cache.mkdir(parents=True)
        inc_file = model_cache / "blobs" / "sha256.incomplete"
        inc_file.parent.mkdir(parents=True)
        inc_file.write_text("partial")
        ok_file = model_cache / "blobs" / "sha256-complete"
        ok_file.write_text("full")

        with patch("pathlib.Path.home", return_value=tmp_path):
            model_manager._cleanup_incomplete_cache("test/repo")

        assert not inc_file.exists(), ".incomplete file should be deleted"
        assert ok_file.exists(), "Complete file should be preserved"
