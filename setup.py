"""Cross-platform one-shot setup script."""
import sys, os, shutil, subprocess, platform

ROOT = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.join(ROOT, ".venv")

def run(cmd, cwd=None, shell=True):
    print(f"[setup] $ {cmd}")
    subprocess.check_call(cmd, cwd=cwd or ROOT, shell=shell)

def check_python():
    v = sys.version_info
    if v.major < 3 or (v.major == 3 and v.minor < 10):
        print("Error: Python 3.10+ required")
        sys.exit(1)
    print(f"[setup] Python {v.major}.{v.minor}.{v.micro} OK")

def check_node():
    try:
        out = subprocess.check_output("node --version", shell=True, text=True).strip()
        ver = int(out.lstrip("v").split(".")[0])
        if ver < 18:
            print("Error: Node.js 18+ required")
            sys.exit(1)
        print(f"[setup] Node {out} OK")
    except FileNotFoundError:
        print("Error: Node.js not found, install from https://nodejs.org")
        sys.exit(1)

def ensure_venv():
    venv_python = os.path.join(VENV_DIR, "Scripts", "python.exe") if platform.system() == "Windows" else os.path.join(VENV_DIR, "bin", "python")
    if not os.path.exists(venv_python):
        print("[setup] Creating virtual environment...")
        run(f"\"{sys.executable}\" -m venv \"{VENV_DIR}\"")
    else:
        print(f"[setup] Virtual env already exists at {VENV_DIR}")
    # Ensure pip is available even if venv was created without it
    try:
        subprocess.run(f"\"{venv_python}\" -m pip --version", shell=True, capture_output=True, check=True)
    except subprocess.CalledProcessError:
        print("[setup] Installing pip...")
        run(f"\"{venv_python}\" -m ensurepip --upgrade")
    print("[setup] Upgrading pip...")
    run(f"\"{venv_python}\" -m pip install --upgrade pip")
    return venv_python

def ensure_env():
    env_path = os.path.join(ROOT, ".env")
    example_path = os.path.join(ROOT, ".env.example")
    if not os.path.exists(env_path) and os.path.exists(example_path):
        shutil.copy(example_path, env_path)
        print(f"[setup] Created .env from .env.example — edit with your keys")
    backend_env = os.path.join(ROOT, "dashboard", "dashboard", "backend", ".env")
    backend_example = os.path.join(ROOT, "dashboard", "dashboard", "backend", ".env.example")
    if not os.path.exists(backend_env) and os.path.exists(backend_example):
        shutil.copy(backend_example, backend_env)
        print(f"[setup] Created backend .env from .env.example — edit JWT secret")

def install_python_deps(python_exe):
    reqs = [
        os.path.join(ROOT, "requirements.txt"),
        os.path.join(ROOT, "dashboard", "dashboard", "backend", "requirements.txt"),
    ]
    
    is_windows = platform.system().lower() == "windows"
    
    for r in reqs:
        if is_windows:
            win_r = r.replace("requirements.txt", "requirements-windows.txt")
            if os.path.exists(win_r):
                r = win_r
        
        if os.path.exists(r):
            print(f"[setup] Installing: {r}")
            run(f"\"{python_exe}\" -m pip install -r \"{r}\"")
        else:
            print(f"[setup] Warning: Dependency file not found: {r}")

def install_npm_deps():
    frontend = os.path.join(ROOT, "dashboard", "dashboard", "frontend")
    pkg = os.path.join(frontend, "package.json")
    if os.path.exists(pkg):
        run("npm install", cwd=frontend)

def init_db(python_exe):
    models = os.path.join(ROOT, "dashboard", "dashboard", "backend", "models.py")
    if os.path.exists(models):
        print("[setup] Initializing database...")
        run(f"\"{python_exe}\" -c \"import sys; sys.path.insert(0, '{os.path.join(ROOT, 'dashboard', 'dashboard', 'backend').replace(chr(92), '/')}'); import models as m; m.Base.metadata.create_all(m.engine); m.init_db()\"")

def trust_mitmproxy_ca():
    """Generate & install mitmproxy CA cert so HTTPS interception works."""
    if platform.system() != "Windows":
        return
    cert_path = os.path.expanduser(r"~\.mitmproxy\mitmproxy-ca-cert.cer")
    if os.path.exists(cert_path):
        return
    print("[setup] Generating mitmproxy CA certificate (one-time)...")
    mitmdump = os.path.join(VENV_DIR, "Scripts", "mitmdump.exe")
    if not os.path.exists(mitmdump):
        return
    proc = subprocess.Popen([mitmdump, "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    proc.wait()
    if os.path.exists(cert_path):
        print("[setup] Installing mitmproxy CA certificate (may need admin)...")
        subprocess.run(["certutil", "-addstore", "Root", cert_path], shell=True)
        print("[setup] CA certificate installed. HTTPS traffic can be decrypted.")

if __name__ == "__main__":
    print("=" * 50)
    print("  AI Proxy Dashboard — Setup")
    print("=" * 50)
    check_python()
    check_node()
    venv_python = ensure_venv()
    ensure_env()
    install_python_deps(venv_python)
    install_npm_deps()
    init_db(venv_python)
    trust_mitmproxy_ca()
    print()
    print("Setup complete!")
    print()
    is_win = platform.system() == "Windows"
    if is_win:
        print("  Run:  Windows_start.bat")
    else:
        print("  Run:  bash start.sh")
    print()
