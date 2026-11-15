import importlib.util
import os
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ai_engine", ROOT / "engines" / "ai" / "engine.py")
ai_engine = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ai_engine)


class RuntimeConfigurationTests(unittest.TestCase):
    def test_automatic_gpu_mode_falls_back_to_cpu_without_gpu_support(self):
        gpu_info = {"available": False, "free_mb": 0, "total_mb": 0, "name": None}
        with (
            mock.patch.dict(os.environ, {"BSZ_AI_GPU_LAYERS": "-1"}),
            mock.patch.object(ai_engine, "_gpu_info", return_value=gpu_info),
            mock.patch.object(ai_engine, "_llama_gpu_available", return_value=False),
        ):
            runtime = ai_engine._Runtime()

        self.assertIsNone(runtime.error)
        self.assertEqual(runtime.config["gpu_layers"], 0)
        self.assertEqual(runtime.config["backend"], "cpu")

    def test_explicit_partial_gpu_mode_reports_missing_gpu_support(self):
        gpu_info = {"available": False, "free_mb": 0, "total_mb": 0, "name": None}
        with (
            mock.patch.dict(os.environ, {"BSZ_AI_GPU_LAYERS": "8"}),
            mock.patch.object(ai_engine, "_gpu_info", return_value=gpu_info),
            mock.patch.object(ai_engine, "_llama_gpu_available", return_value=False),
        ):
            runtime = ai_engine._Runtime()

        self.assertIn("no GPU offload support", runtime.error)


if __name__ == "__main__":
    unittest.main()
