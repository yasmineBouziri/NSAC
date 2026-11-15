import os
import re
import unittest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DIR = os.path.join(ROOT_DIR, "web")

class TestGamesUI(unittest.TestCase):
    def test_pages_games_dial(self):
        pages_path = os.path.join(WEB_DIR, "js", "core", "pages.js")
        with open(pages_path, "r", encoding="utf-8") as f:
            content = f.read()
        # Verify circular games dial components
        self.assertIn("games-dial-container", content)
        self.assertIn("games-dial-rim", content)
        self.assertIn("games-showcase", content)
        self.assertIn("games-hud-bar", content)
        self.assertIn("games-slot", content)

        # Verify all 5 game choices
        for gid in ["chess", "pinball", "sudoku", "g2048", "snake"]:
            self.assertIn(f"id: '{gid}'", content)

        # Verify keyboard Enter launching selected game
        self.assertIn("e.key === 'Enter'", content)
        self.assertIn("select(choices[pos].id)", content)

    def test_game_modules_mount_and_scoping(self):
        # Chess
        chess_path = os.path.join(WEB_DIR, "js", "games", "chess.js")
        with open(chess_path, "r", encoding="utf-8") as f:
            chess_code = f.read()
        self.assertIn("export function mountChess", chess_code)
        self.assertIn("chess-host", chess_code)
        self.assertIn("calc(100vh - 270px)", chess_code)
        self.assertIn("#nw", chess_code)
        self.assertIn("#ai", chess_code)
        self.assertIn("#vw", chess_code)

        # Pinball
        pinball_path = os.path.join(WEB_DIR, "js", "games", "spacecadet.js")
        with open(pinball_path, "r", encoding="utf-8") as f:
            pinball_code = f.read()
        self.assertIn("export function mountPinball", pinball_code)
        self.assertIn("pinball-cabinet", pinball_code)
        self.assertIn("calc(100vh - 275px)", pinball_code)
        self.assertIn("#pL", pinball_code)
        self.assertIn("#pR", pinball_code)
        self.assertIn("#plg", pinball_code)
        self.assertIn("#pgo", pinball_code)

        # Sudoku
        sudoku_path = os.path.join(WEB_DIR, "js", "games", "sudoku.js")
        with open(sudoku_path, "r", encoding="utf-8") as f:
            sudoku_code = f.read()
        self.assertIn("export function mountSudoku", sudoku_code)
        self.assertIn("sudoku-host", sudoku_code)
        self.assertIn("calc(100vh - 275px)", sudoku_code)
        self.assertIn("#er", sudoku_code)
        self.assertIn("#ck", sudoku_code)
        self.assertIn("diff-btn", sudoku_code)

    def test_css_viewport_fitting_and_no_duplicate_label(self):
        css_path = os.path.join(WEB_DIR, "css", "os.css")
        with open(css_path, "r", encoding="utf-8") as f:
            css = f.read()

        # Check page header hidden for games view to preserve viewport
        self.assertIn(".page-content:has(.games-view) .page-header{display:none}", css)
        # Check dial styling and enlarged radius
        self.assertIn(".games-dial-container", css)
        self.assertIn(".games-dial-rim", css)
        self.assertIn(".games-showcase", css)
        self.assertIn("--GDR:clamp(190px", css)
        # Verify .sl is hidden to prevent duplicate naming
        self.assertIn(".sl{display:none!important}", css)

if __name__ == "__main__":
    unittest.main()
