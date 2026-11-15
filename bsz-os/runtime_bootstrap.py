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
CUDA_WHEEL_INDEX = "https://abetlen.github.io/llama-cpp-python/whl/cu130"
_DLL_DIRECTORY_HANDLES = []


def runtime_python():
    return VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def configure_cuda_dll_path(python):
    if os.name != "nt":
        return
    site_packages = Path(python).absolute().parent.parent / "Lib" / "site-packages"
    nvidia = site_packages / "nvidia"
    directories = [directory for directory in nvidia.glob("*/bin/*") if directory.is_dir()]
    _DLL_DIRECTORY_HANDLES.extend(os.add_dll_directory(str(directory)) for directory in directories)
    if directories:
        os.environ["PATH"] = os.pathsep.join(
            [str(directory) for directory in directories] + [os.environ.get("PATH", "")]
        )


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
    probe_code = (
        "import os, pathlib, sys; "
        "nvidia=pathlib.Path(sys.prefix)/'Lib'/'site-packages'/'nvidia'; "
        "paths=[p for p in nvidia.glob('*/bin/*') if p.is_dir()] if nvidia.is_dir() else []; "
        "handles=[os.add_dll_directory(str(p)) for p in paths]; "
        "os.environ['PATH']=os.pathsep.join([str(p) for p in paths]+[os.environ.get('PATH','')]); "
        "import llama_cpp; "
        "print(llama_cpp.llama_print_system_info().decode(errors='replace'))"
    )
    probe = subprocess.run(
        [str(python), "-c", probe_code],
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


def install_cuda_wheel(python):
    if os.environ.get("BSZ_AI_AUTO_INSTALL", "1").lower() in {"0", "false", "no"}:
        print("BSZ-OS: automatic package installation disabled (BSZ_AI_AUTO_INSTALL=0).", flush=True)
        return False
    print("BSZ-OS: installing the pre-built CUDA 13.0 AI runtime...", flush=True)
    try:
        _run(python, [
            "-m", "pip", "install", "--disable-pip-version-check", "--upgrade",
            "--force-reinstall", "--no-cache-dir", "--extra-index-url", CUDA_WHEEL_INDEX,
            "llama-cpp-python", "nvidia-cuda-runtime==13.0.48",
            "nvidia-cuda-nvrtc==13.0.48", "nvidia-cublas==13.0.2.14",
        ], check=True)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"BSZ-OS: CUDA runtime installation failed: {exc}", flush=True)
        return False
    if llama_has_gpu(python):
        print("BSZ-OS: CUDA-enabled llama.cpp runtime is ready.", flush=True)
        return True
    print("BSZ-OS: installed llama.cpp still does not report GPU support.", flush=True)
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
        cuda_ready = os.name == "nt" and install_cuda_wheel(python)
        if cuda_ready:
            packages = [package for package in packages if package != "llama-cpp-python"]
        else:
            backend = gpu_build_backend()
            if backend:
                print(f"BSZ-OS: installed llama.cpp has no GPU backend; {backend.upper()} rebuild required.", flush=True)
                packages = list(dict.fromkeys([*packages, "llama-cpp-python"]))
            else:
                packages = [package for package in packages if package != "llama-cpp-python"]
                print(
                    "BSZ-OS: NVIDIA GPU detected, but no GPU-enabled llama.cpp runtime or build toolchain is available. "
                    "AI will not silently fall back to CPU; install a compatible CUDA runtime or explicitly set "
                    "BSZ_AI_GPU_LAYERS=0 to allow CPU inference.",
                    flush=True,
                )
    installed = install_missing(python, packages)
    detect_models()
    return python, installed


def main():
    if "--check" in sys.argv[1:]:
        python, installed = prepare()
        configure_cuda_dll_path(python)
        runtime_ready = installed or not missing_packages(python)
        gpu_requested = has_nvidia() and os.environ.get("BSZ_AI_GPU_LAYERS") != "0"
        if gpu_requested:
            gpu_ready = llama_has_gpu(python)
            print(f"BSZ-OS: GPU offload={'ready' if gpu_ready else 'unavailable'}", flush=True)
            runtime_ready = runtime_ready and gpu_ready
        print(f"BSZ-OS: runtime={python}", flush=True)
        print(f"BSZ-OS: llama-cpp-python={'ready' if runtime_ready else 'unavailable'}", flush=True)
        return 0 if runtime_ready else 1

    python, _ = prepare()
    configure_cuda_dll_path(python)
    os.environ["BSZ_RUNTIME_BOOTSTRAPPED"] = "1"
    if os.name == "nt":
        raise SystemExit(subprocess.call([str(python), str(ROOT / "bsz.py"), *sys.argv[1:]], env=os.environ))
    os.execvpe(str(python), [str(python), str(ROOT / "bsz.py"), *sys.argv[1:]], os.environ)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
