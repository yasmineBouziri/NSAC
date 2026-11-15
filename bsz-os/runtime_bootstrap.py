"""Prepare the local BSZ-OS runtime, then launch the application.

This is intentionally standard-library-only so a fresh Python installation can
run it. Package installation is idempotent and occurs in the project venv,
never in the user's global Python environment.
"""
import os
import re
import shutil
import struct
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


def load_dotenv():
    """Load key-value pairs from .env if present (standard-library only)."""
    for base_dir in (Path.cwd(), ROOT, ROOT.parent):
        env_file = base_dir / ".env"
        if env_file.is_file():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip("\"'")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass
            break


load_dotenv()


def runtime_python(venv_dir=VENV):
    return venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def is_64bit_python(python):
    if Path(python).resolve() == Path(sys.executable).resolve():
        return struct.calcsize("P") == 8
    try:
        result = subprocess.run(
            [str(python), "-c", "import struct; print(struct.calcsize('P') * 8)"],
            capture_output=True, text=True,
        )
    except OSError:
        return False
    return result.returncode == 0 and result.stdout.strip() == "64"


def configure_cuda_dll_path(python):
    if os.name != "nt":
        return
    site_packages = Path(python).absolute().parent.parent / "Lib" / "site-packages"
    nvidia = site_packages / "nvidia"
    directories = {directory.parent for directory in nvidia.glob("**/*.dll") if directory.is_file()} if nvidia.is_dir() else set()
    for directory in directories:
        try:
            _DLL_DIRECTORY_HANDLES.append(os.add_dll_directory(str(directory)))
        except OSError:
            pass
    if directories:
        os.environ["PATH"] = os.pathsep.join(
            [str(directory) for directory in directories] + [os.environ.get("PATH", "")]
        )


def _run(python, args, *, check=False):
    return subprocess.run([str(python), *args], cwd=ROOT, check=check)


def find_compatible_python():
    if (3, 10) <= sys.version_info[:2] <= (3, 12) and is_64bit_python(sys.executable):
        return sys.executable
    for ver in ("3.12", "3.11", "3.10"):
        try:
            res = subprocess.run(["py", f"-{ver}", "-c",
                                  "import struct,sys; print(sys.executable) if struct.calcsize('P') == 8 else sys.exit(1)"],
                                 capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                return res.stdout.strip()
        except OSError:
            pass
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    for name in ("Python312", "Python311", "Python310"):
        candidate = Path(local_app_data) / "Programs" / "Python" / name / "python.exe"
        if candidate.is_file() and is_64bit_python(candidate):
            return str(candidate)
    if os.name == "nt":
        raise RuntimeError("BSZ-OS AI requires a 64-bit Python 3.10-3.12 installation.")
    return sys.executable


def ensure_venv():
    venv_dir = VENV
    target = runtime_python(venv_dir)
    if target.is_file() and is_64bit_python(target):
        return target

    if target.exists() or venv_dir.exists():
        venv_dir = ROOT / ".venv-x64-runtime"
        target = runtime_python(venv_dir)
        if target.is_file():
            if is_64bit_python(target):
                return target
            raise RuntimeError(f"The existing 64-bit runtime at {target} is not usable.")

    comp_py = find_compatible_python()
    print(f"BSZ-OS: creating local 64-bit Python environment using {comp_py}...", flush=True)
    subprocess.run([comp_py, "-m", "venv", str(venv_dir)], check=True)
    if not is_64bit_python(target):
        raise RuntimeError(f"The Python environment at {target} is not 64-bit.")
    return target


def detect_nvidia_gpu():
    """Detect if NVIDIA GPU is present and what maximum CUDA version the driver supports."""
    candidates = [
        shutil.which("nvidia-smi"),
        r"C:\Windows\Sysnative\nvidia-smi.exe",
        r"C:\Windows\System32\nvidia-smi.exe",
        r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
        "/usr/bin/nvidia-smi",
        "/usr/local/cuda/bin/nvidia-smi",
    ]
    smi = next((p for p in candidates if p and os.path.isfile(p)), None)
    if not smi:
        return {"available": False, "name": None, "cuda_version": 0.0}
    try:
        res = subprocess.run([smi, "-L"], capture_output=True, text=True, timeout=5)
        if res.returncode != 0:
            return {"available": False, "name": None, "cuda_version": 0.0}
        name_line = res.stdout.strip().splitlines()[0] if res.stdout.strip() else "NVIDIA GPU"

        info_res = subprocess.run([smi], capture_output=True, text=True, timeout=5)
        match = re.search(r"CUDA Version:\s*(\d+\.\d+)", info_res.stdout)
        cuda_ver = float(match.group(1)) if match else 12.4
        return {"available": True, "name": name_line, "cuda_version": cuda_ver}
    except Exception:
        return {"available": False, "name": None, "cuda_version": 0.0}


def has_nvidia():
    return detect_nvidia_gpu()["available"]


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
        "paths=list({p.parent for p in nvidia.glob('**/*.dll') if p.is_file()}) if nvidia.is_dir() else []; "
        "handles=[os.add_dll_directory(str(p)) for p in paths]; "
        "os.environ['PATH']=os.pathsep.join([str(p) for p in paths]+[os.environ.get('PATH','')]); "
        "import llama_cpp; "
        "has_gpu = bool(getattr(llama_cpp, 'llama_supports_gpu_offload', lambda: False)()); "
        "info = llama_cpp.llama_print_system_info().decode(errors='replace'); "
        "print('GPU_OFFLOAD:' + str(has_gpu)); "
        "print(info)"
    )
    probe = subprocess.run(
        [str(python), "-c", probe_code],
        capture_output=True, text=True, cwd=ROOT,
    )
    return probe.returncode == 0 and ("GPU_OFFLOAD:True" in probe.stdout or "CUDA" in probe.stdout or "Vulkan" in probe.stdout)


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


def install_ai_runtime(python):
    """Install optimal pre-built llama-cpp-python runtime without requiring C++ Build Tools or CMake."""
    if os.environ.get("BSZ_AI_AUTO_INSTALL", "1").lower() in {"0", "false", "no"}:
        print("BSZ-OS: automatic package installation disabled (BSZ_AI_AUTO_INSTALL=0).", flush=True)
        return False

    gpu_info = detect_nvidia_gpu()
    force_cpu = os.environ.get("BSZ_AI_GPU_LAYERS") == "0"

    if gpu_info["available"] and not force_cpu:
        print(f"BSZ-OS: detected {gpu_info['name']} (Driver CUDA {gpu_info['cuda_version']})", flush=True)

        cuda_targets = []
        if gpu_info["cuda_version"] >= 13.0:
            cuda_targets.append({
                "name": "CUDA 13.0",
                "index": "https://abetlen.github.io/llama-cpp-python/whl/cu130",
                "packages": [
                    "llama-cpp-python",
                    "nvidia-cuda-runtime==13.0.48",
                    "nvidia-cuda-nvrtc==13.0.48",
                    "nvidia-cublas==13.0.2.14",
                ]
            })
        if gpu_info["cuda_version"] >= 12.0:
            cuda_targets.append({
                "name": "CUDA 12.4",
                "index": "https://abetlen.github.io/llama-cpp-python/whl/cu124",
                "packages": [
                    "llama-cpp-python",
                    "nvidia-cuda-runtime-cu12",
                    "nvidia-cuda-nvrtc-cu12",
                    "nvidia-cublas-cu12",
                ]
            })

        for target in cuda_targets:
            print(f"BSZ-OS: installing pre-built {target['name']} GPU runtime...", flush=True)
            cmd = [
                "-m", "pip", "install", "--disable-pip-version-check",
                "--upgrade", "--force-reinstall", "--prefer-binary",
                "--only-binary", ":all:",
                "--extra-index-url", target["index"],
                *target["packages"],
            ]
            try:
                _run(python, cmd, check=True)
                configure_cuda_dll_path(python)
                if llama_has_gpu(python):
                    print(f"BSZ-OS: [SUCCESS] {target['name']} GPU offload is active and verified.", flush=True)
                    return True
                else:
                    print(f"BSZ-OS: {target['name']} installed but GPU offload check did not verify. Trying fallback...", flush=True)
            except (OSError, subprocess.CalledProcessError) as exc:
                print(f"BSZ-OS: {target['name']} installation failed: {exc}", flush=True)

    # If no GPU is available or GPU installation was unsuccessful, install pre-built CPU binary wheel
    print("BSZ-OS: installing pre-built CPU AI runtime (AVX2-optimized, zero build tools required)...", flush=True)
    cpu_cmd = [
        "-m", "pip", "install", "--disable-pip-version-check",
        "--upgrade", "--prefer-binary",
        "--only-binary", ":all:",
        "--extra-index-url", "https://abetlen.github.io/llama-cpp-python/whl/cpu",
        "llama-cpp-python",
    ]
    try:
        _run(python, cpu_cmd, check=True)
        return not missing_packages(python)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"BSZ-OS: CPU runtime installation failed: {exc}", flush=True)
        return False


def install_missing(python, packages):
    if not packages:
        return True
    if os.environ.get("BSZ_AI_AUTO_INSTALL", "1").lower() in {"0", "false", "no"}:
        print("BSZ-OS: automatic package installation disabled (BSZ_AI_AUTO_INSTALL=0).", flush=True)
        return False

    if "llama-cpp-python" in packages:
        success = install_ai_runtime(python)
        packages = [p for p in packages if p != "llama-cpp-python"]
        if not packages:
            return success

    print("BSZ-OS: installing packages: " + ", ".join(packages), flush=True)
    try:
        args = ["-m", "pip", "install", "--disable-pip-version-check", "--prefer-binary", "--only-binary", ":all:", *packages]
        _run(python, args, check=True)
        return not missing_packages(python)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(f"BSZ-OS: package installation failed: {exc}", flush=True)
        return False


def detect_models():
    for variable, name in MODEL_NAMES.items():
        if os.environ.get(variable):
            print(f"BSZ-OS: using {variable}={os.environ[variable]}", flush=True)
            continue
        candidates = (
            ROOT / "models" / name,
            ROOT / name,
            ROOT.parent / "models" / name,
            ROOT.parent / name,
            Path.cwd() / "models" / name,
            Path.cwd() / name,
        )
        found = next((p.resolve() for p in candidates if p.is_file()), None)
        if found:
            os.environ[variable] = str(found)
            print(f"BSZ-OS: detected {name}", flush=True)
        else:
            print(f"BSZ-OS: model not found: {name}", flush=True)


def prepare():
    python = ensure_venv()
    packages = missing_packages(python)

    # Check if AI runtime needs installation or if an installed CPU-only runtime needs GPU upgrade
    gpu_requested = has_nvidia() and os.environ.get("BSZ_AI_GPU_LAYERS") != "0"
    needs_ai_install = ("llama-cpp-python" in packages) or (gpu_requested and not llama_has_gpu(python))

    if needs_ai_install:
        if gpu_requested and not ("llama-cpp-python" in packages) and not llama_has_gpu(python):
            print("BSZ-OS: NVIDIA GPU detected, but installed llama-cpp-python is CPU-only. Upgrading to GPU runtime...", flush=True)
        install_ai_runtime(python)
        packages = [p for p in packages if p != "llama-cpp-python"]

    installed = install_missing(python, packages)
    detect_models()
    return python, installed
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
