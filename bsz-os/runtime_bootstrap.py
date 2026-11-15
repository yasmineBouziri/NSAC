"""Prepare the local BSZ-OS runtime, then launch the application.

This is intentionally standard-library-only so a fresh Python installation can
run it. Package installation is idempotent and occurs in the project venv,
never in the user's global Python environment.
"""
import os
import shutil
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV = ROOT / ".venv"
REQUIRED = (("llama-cpp-python", "llama_cpp"),)
MODEL_NAMES = {
    "BSZ_LLM_MODEL": "Llama-3.2-3B-Instruct-Medical-Finetuned-merged.Q4_K_M.gguf",
    "BSZ_EMBED_MODEL": "nomic-embed-text-v1.5.f16.gguf",
}


def runtime_python():
    return VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def _run(python, args, *, check=False):
    return subprocess.run([str(python), *args], cwd=ROOT, check=check)


def ensure_venv():
    target = runtime_python()
    if target.resolve() == Path(sys.executable).resolve():
        return target
    if not target.exists():
        print("BSZ-OS: creating local Python environment...", flush=True)
        venv.EnvBuilder(with_pip=True, clear=False).create(VENV)
    return target


def has_nvidia():
    return bool(shutil.which("nvidia-smi")) and subprocess.run(
        ["nvidia-smi", "-L"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    ).returncode == 0


def cuda_compiler():
    candidates = [
        shutil.which("nvcc"),
        os.environ.get("CUDA_HOME", ""),
        os.environ.get("CUDA_PATH", ""),
        "/usr/local/cuda/bin/nvcc",
        "/usr/local/cuda-12/bin/nvcc",
        "/usr/local/cuda-13/bin/nvcc",
    ]
    for candidate in candidates:
        path = Path(candidate) if candidate else None
        if path and path.name != "nvcc":
            path = path / "bin" / "nvcc"
        if path and path.is_file() and os.access(path, os.X_OK):
            return path
    return None


def gpu_build_backend():
    """Return a backend that can be compiled locally, if its toolchain exists."""
    if has_nvidia() and cuda_compiler():
        return "cuda"
    if (
        shutil.which("glslc")
        and shutil.which("glslangValidator")
        and Path("/usr/include/vulkan/vulkan.h").is_file()
    ):
        return "vulkan"
    return None


def has_c_compiler():
    if os.name == "nt":
        return bool(shutil.which("cl") or shutil.which("nmake") or shutil.which("gcc") or shutil.which("clang"))
    return bool(shutil.which("gcc") or shutil.which("clang") or shutil.which("cc"))


def llama_has_gpu(python):
    probe = subprocess.run(
        [str(python), "-c",
         "import llama_cpp; print(llama_cpp.llama_print_system_info().decode(errors='replace'))"],
        capture_output=True, text=True, cwd=ROOT,
    )
    return probe.returncode == 0 and ("CUDA" in probe.stdout or "Vulkan" in probe.stdout or "SYCL" in probe.stdout)


def missing_packages(python):
    missing = []
    for package, module in REQUIRED:
        probe = subprocess.run(
            [str(python), "-c", f"import importlib.util; raise SystemExit(0 if importlib.util.find_spec({module!r}) else 1)"],
            cwd=ROOT,
        )
        if probe.returncode:
            missing.append(package)
    return missing


def install_missing(python, packages):
    if not packages:
        return True
    if os.environ.get("BSZ_AI_AUTO_INSTALL", "1").lower() in {"0", "false", "no"}:
        print("BSZ-OS: automatic package installation disabled (BSZ_AI_AUTO_INSTALL=0).", flush=True)
        return False

    # On Windows without a C/C++ compiler, attempting a source build will fail with CMake/NMake errors.
    # Check if pre-compiled binary wheels exist first:
    if os.name == "nt" and not has_c_compiler() and "llama-cpp-python" in packages:
        print("BSZ-OS: checking for pre-built llama-cpp-python binary wheel...", flush=True)
        res = subprocess.run(
            [str(python), "-m", "pip", "install", "--disable-pip-version-check", "--only-binary", ":all:", "llama-cpp-python"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        if res.returncode == 0 and not missing_packages(python):
            print("BSZ-OS: pre-built llama-cpp-python wheel installed successfully.", flush=True)
            return True
        print(
            "BSZ-OS: Notice: No pre-built llama-cpp-python wheel is available for this Python version on Windows, "
            "and Microsoft C++ Build Tools (cl/nmake) are not installed.\n"
            "BSZ-OS will run in standard mode without local LLM (vitals, cabin air, clock, widgets, themes, and health systems remain 100% functional).\n"
            "To enable local LLM acceleration, use Python 3.10-3.12 (with precompiled wheels) or install Visual Studio C++ Build Tools.",
            flush=True,
        )
        return False

    print("BSZ-OS: installing local AI runtime: " + ", ".join(packages), flush=True)
    try:
        args = ["-m", "pip", "install", "--disable-pip-version-check", "--prefer-binary"]
        backend = gpu_build_backend()
        if backend and "llama-cpp-python" in packages:
            print(f"BSZ-OS: building llama.cpp with {backend.upper()} support...", flush=True)
            option = "-DGGML_CUDA=on" if backend == "cuda" else "-DGGML_VULKAN=on"
            os.environ["CMAKE_ARGS"] = os.environ.get("CMAKE_ARGS", "") + f" {option}"
            compiler = cuda_compiler()
            if backend == "cuda" and compiler:
                os.environ["CUDACXX"] = str(compiler)
            args.extend(["--upgrade", "--force-reinstall", "--no-cache-dir"])
        args.extend(packages)
        _run(python, args, check=True)
        return not missing_packages(python)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"BSZ-OS: AI runtime installation failed: {exc}", flush=True)
        print("BSZ-OS will continue; health monitoring remains available.", flush=True)
        return False


def detect_models():
    for variable, name in MODEL_NAMES.items():
        if os.environ.get(variable):
            print(f"BSZ-OS: using {variable}={os.environ[variable]}", flush=True)
            continue
        candidates = (ROOT / name, ROOT.parent / name, Path.cwd() / name)
        found = next((p.resolve() for p in candidates if p.is_file()), None)
        if found:
            os.environ[variable] = str(found)
            print(f"BSZ-OS: detected {name}", flush=True)
        else:
            print(f"BSZ-OS: model not found: {name}", flush=True)


def prepare():
    python = ensure_venv()
    packages = missing_packages(python)
    if has_nvidia() and not llama_has_gpu(python):
        llama_missing = "llama-cpp-python" in packages
        packages = list(dict.fromkeys([*packages, "llama-cpp-python"]))
        backend = gpu_build_backend()
        if backend:
            print(f"BSZ-OS: installed llama.cpp has no GPU backend; {backend.upper()} rebuild required.", flush=True)
        else:
            print(
                "BSZ-OS: NVIDIA GPU detected, but no CUDA/Vulkan build toolchain is installed. "
                "The NVIDIA driver alone is not enough; install the CUDA toolkit (nvcc) or Vulkan development headers "
                "then restart to enable GPU offload.",
                flush=True,
            )
            if not llama_missing:
                packages = [package for package in packages if package != "llama-cpp-python"]
    installed = install_missing(python, packages)
    detect_models()
    return python, installed


def main():
    if "--check" in sys.argv[1:]:
        python, installed = prepare()
        print(f"BSZ-OS: runtime={python}", flush=True)
        print(f"BSZ-OS: llama-cpp-python={'ready' if installed or not missing_packages(python) else 'unavailable'}",
              flush=True)
        return 0

    python, _ = prepare()
    os.environ["BSZ_RUNTIME_BOOTSTRAPPED"] = "1"
    if os.name == "nt":
        raise SystemExit(subprocess.call([str(python), str(ROOT / "bsz.py"), *sys.argv[1:]], env=os.environ))
    os.execvpe(str(python), [str(python), str(ROOT / "bsz.py"), *sys.argv[1:]], os.environ)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
