"""Display engine: serves the BSZ-OS shell. Static files live in ../../web (same folder GitHub Pages publishes)."""
from pathlib import Path

MANIFEST = {"name": "display", "version": "0.2.0", "provides": ["shell", "applets", "theme"]}


def register(core):
    core.static = Path(__file__).resolve().parents[2] / "web"
