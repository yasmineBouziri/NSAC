import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("runtime_bootstrap", ROOT / "runtime_bootstrap.py")
runtime_bootstrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runtime_bootstrap)


class PythonSelectionTests(unittest.TestCase):
    def test_find_compatible_python_skips_32_bit_current_interpreter(self):
        x64_python = r"C:\Python311\python.exe"
        responses = [
            subprocess.CompletedProcess(["py"], 1, "", ""),
            subprocess.CompletedProcess(["py"], 0, x64_python, ""),
        ]
        with (
            mock.patch.object(runtime_bootstrap.sys, "version_info", (3, 10)),
            mock.patch.object(runtime_bootstrap.sys, "executable", r"C:\Python310-32\python.exe"),
            mock.patch.object(runtime_bootstrap, "is_64bit_python",
                              side_effect=lambda path: str(path) == x64_python),
            mock.patch.object(runtime_bootstrap.subprocess, "run", side_effect=responses),
        ):
            self.assertEqual(runtime_bootstrap.find_compatible_python(), x64_python)

    def test_existing_32_bit_venv_uses_separate_64_bit_venv(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            old_python = root / ".venv" / "Scripts" / "python.exe"
            old_python.parent.mkdir(parents=True)
            old_python.write_text("32-bit environment")
            new_python = root / ".venv-x64-runtime" / "Scripts" / "python.exe"
            compatible_python = root / "python311.exe"

            def create_venv(command, check):
                target_python = Path(command[-1]) / "Scripts" / "python.exe"
                target_python.parent.mkdir(parents=True)
                target_python.write_text("64-bit environment")
                return subprocess.CompletedProcess(command, 0)

            def is_64bit(python):
                return Path(python) == new_python

            with (
                mock.patch.object(runtime_bootstrap, "VENV", root / ".venv"),
                mock.patch.object(runtime_bootstrap, "ROOT", root),
                mock.patch.object(runtime_bootstrap, "find_compatible_python", return_value=str(compatible_python)),
                mock.patch.object(runtime_bootstrap, "is_64bit_python", side_effect=is_64bit),
                mock.patch.object(runtime_bootstrap.subprocess, "run", side_effect=create_venv),
            ):
                selected_python = runtime_bootstrap.ensure_venv()

            self.assertEqual(selected_python, new_python)
            self.assertEqual(old_python.read_text(), "32-bit environment")


if __name__ == "__main__":
    unittest.main()
