import unittest

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def hex_to_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3:
        h = ''.join(x * 2 for x in h)
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def lum(hex_code):
    r, g, b = hex_to_rgb(hex_code)
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def contrast_ratio(hex1, hex2):
    l1, l2 = lum(hex1), lum(hex2)
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

REQUIRED_TOKENS = [
    'background', 'surface', 'text', 'muted', 'line',
    'accent', 'accent2', 'ok', 'warn', 'info',
    'text_on_accent', 'glow',
    'heading_font', 'body_font',
    'slot_radius', 'border_width', 'shadow', 'motion_level'
]

THEMES = {
    'high-contrast': {
        'name': 'High Contrast',
        'background': '#000000', 'surface': '#000000', 'text': '#FFFFFF',
        'muted': '#E0E0E0', 'line': '#FFFFFF',
        'accent': '#FFFF00', 'accent2': '#00E5FF', 'ok': '#00E5FF', 'warn': '#FFB000', 'info': '#FFFF00',
        'text_on_accent': '#000000', 'glow': 'transparent',
        'heading_font': 'Atkinson Hyperlegible', 'body_font': 'Atkinson Hyperlegible',
        'slot_radius': '50%', 'border_width': '3px', 'shadow': 'none', 'motion_level': 'none',
        'is_high_contrast': True
    },
    'low-vision-xl': {
        'name': 'Low Vision XL',
        'background': '#FFFFFF', 'surface': '#F5F7FB', 'text': '#0A0A0A',
        'muted': '#333333', 'line': '#0A0A0A',
        'accent': '#0B3D91', 'accent2': '#5A2D82', 'ok': '#1B6E3A', 'warn': '#B54708', 'info': '#0B3D91',
        'text_on_accent': '#FFFFFF', 'glow': 'rgba(11, 61, 145, 0.25)',
        'heading_font': 'Atkinson Hyperlegible', 'body_font': 'Atkinson Hyperlegible',
        'slot_radius': '14px', 'border_width': '2px', 'shadow': '0 4px 12px rgba(0,0,0,0.15)', 'motion_level': 'none',
        'is_high_contrast': True
    },
    'lexior': {
        'name': 'Lexior',
        'background': '#FBF4E4', 'surface': '#F4EAD3', 'text': '#2B2B2B',
        'muted': '#5A5A5A', 'line': 'rgba(43, 43, 43, 0.25)',
        'accent': '#2F6F8F', 'accent2': '#4A5F8A', 'ok': '#3C7A57', 'warn': '#B5651D', 'info': '#4A5F8A',
        'text_on_accent': '#FFFFFF', 'glow': 'transparent',
        'heading_font': 'Lexend', 'body_font': 'Lexend',
        'slot_radius': '14px', 'border_width': '2px', 'shadow': '0 2px 8px rgba(43, 43, 43, 0.08)', 'motion_level': 'none',
        'is_high_contrast': False
    },
    'calm': {
        'name': 'Low-Stimulation Calm',
        'background': '#1E2326', 'surface': '#262C30', 'text': '#DDE3E0',
        'muted': '#9AA5A1', 'line': 'rgba(154, 165, 161, 0.22)',
        'accent': '#8FB3A3', 'accent2': '#7A968B', 'ok': '#8FB3A3', 'warn': '#C9A27E', 'info': '#9FB0C7',
        'text_on_accent': '#1E2326', 'glow': 'transparent',
        'heading_font': 'Manrope', 'body_font': 'Manrope',
        'slot_radius': '8px', 'border_width': '1px', 'shadow': 'none', 'motion_level': 'none',
        'is_high_contrast': False
    },
    'night-vision': {
        'name': 'Night Vision',
        'background': '#080000', 'surface': '#140505', 'text': '#D9523F',
        'muted': '#8A3A30', 'line': 'rgba(217, 82, 63, 0.35)',
        'accent': '#FF6B57', 'accent2': '#D9523F', 'ok': '#FF6B57', 'warn': '#FF8A50', 'info': '#FF6B57',
        'text_on_accent': '#080000', 'glow': 'rgba(255, 107, 87, 0.3)',
        'heading_font': 'Manrope', 'body_font': 'Manrope',
        'slot_radius': '12px', 'border_width': '1px', 'shadow': '0 0 10px rgba(255,107,87,0.15)', 'motion_level': 'reduced',
        'is_high_contrast': False
    },
    'monochrome': {
        'name': 'Monochrome',
        'background': '#0F0F0F', 'surface': '#1E1E1E', 'text': '#F2F2F2',
        'muted': '#A0A0A0', 'line': '#444444',
        'accent': '#FFFFFF', 'accent2': '#CCCCCC', 'ok': '#FFFFFF', 'warn': '#D0D0D0', 'info': '#E0E0E0',
        'text_on_accent': '#0F0F0F', 'glow': 'rgba(255, 255, 255, 0.2)',
        'heading_font': 'Atkinson Hyperlegible', 'body_font': 'Atkinson Hyperlegible',
        'slot_radius': '8px', 'border_width': '2px', 'shadow': '0 2px 10px rgba(0,0,0,0.5)', 'motion_level': 'reduced',
        'is_high_contrast': True
    },
    'zen-garden': {
        'name': 'Zen Garden',
        'background': '#F2EEE6', 'surface': '#E8E3D8', 'text': '#2D2A26',
        'muted': '#68625B', 'line': 'rgba(45, 42, 38, 0.22)',
        'accent': '#6B7F5E', 'accent2': '#B27A5A', 'ok': '#5E7F5A', 'warn': '#B8693A', 'info': '#5B6F8A',
        'text_on_accent': '#000000', 'glow': 'rgba(107, 127, 94, 0.25)',
        'heading_font': 'Shippori Mincho', 'body_font': 'Manrope',
        'slot_radius': '44% 56% 52% 48% / 50% 46% 54% 50%', 'border_width': '1.5px', 'shadow': '0 4px 14px rgba(45, 42, 38, 0.08)', 'motion_level': 'reduced',
        'is_high_contrast': False
    },
    'retro-terminal': {
        'name': 'Retro Terminal',
        'background': '#050A05', 'surface': '#081208', 'text': '#7CFF8A',
        'muted': '#4EA55A', 'line': 'rgba(124, 255, 138, 0.35)',
        'accent': '#B6FFC0', 'accent2': '#7CC8FF', 'ok': '#7CFF8A', 'warn': '#FFB000', 'info': '#7CC8FF',
        'text_on_accent': '#050A05', 'glow': 'rgba(124, 255, 138, 0.5)',
        'heading_font': 'VT323', 'body_font': 'IBM Plex Mono',
        'slot_radius': '0px', 'border_width': '1px', 'shadow': '0 0 10px rgba(124,255,138,0.2)', 'motion_level': 'reduced',
        'is_high_contrast': False
    },
    'retro-terminal-amber': {
        'name': 'Retro Terminal Amber',
        'background': '#0A0700', 'surface': '#140E00', 'text': '#FFB000',
        'muted': '#BA7E00', 'line': 'rgba(255, 176, 0, 0.35)',
        'accent': '#FFE066', 'accent2': '#FFD27F', 'ok': '#FFB000', 'warn': '#FF6600', 'info': '#FFD27F',
        'text_on_accent': '#0A0700', 'glow': 'rgba(255, 176, 0, 0.5)',
        'heading_font': 'VT323', 'body_font': 'IBM Plex Mono',
        'slot_radius': '0px', 'border_width': '1px', 'shadow': '0 0 10px rgba(255,176,0,0.2)', 'motion_level': 'reduced',
        'is_high_contrast': False
    },
    'deep-ocean': {
        'name': 'Deep Ocean',
        'background': '#00141F', 'surface': '#001E2E', 'text': '#D6F4F2',
        'muted': '#7EADB0', 'line': 'rgba(61, 242, 224, 0.3)',
        'accent': '#3DF2E0', 'accent2': '#B35CFF', 'ok': '#6FFFD0', 'warn': '#FF8FA3', 'info': '#8FB4FF',
        'text_on_accent': '#00141F', 'glow': 'rgba(61, 242, 224, 0.6)',
        'heading_font': 'Outfit', 'body_font': 'Sora',
        'slot_radius': '50%', 'border_width': '1px', 'shadow': '0 0 25px rgba(61,242,224,0.25)', 'motion_level': 'full',
        'is_high_contrast': False
    },
    'botanical': {
        'name': 'Botanical Greenhouse',
        'background': '#EEF1E6', 'surface': '#F5F7EE', 'text': '#22301F',
        'muted': '#566852', 'line': 'rgba(79, 122, 74, 0.28)',
        'accent': '#4F7A4A', 'accent2': '#C26A4A', 'ok': '#4F7A4A', 'warn': '#D08A2E', 'info': '#6A8FA8',
        'text_on_accent': '#FFFFFF', 'glow': 'rgba(79, 122, 74, 0.25)',
        'heading_font': 'Fraunces', 'body_font': 'Nunito',
        'slot_radius': '50%', 'border_width': '1.5px', 'shadow': '0 3px 12px rgba(34,48,31,0.08)', 'motion_level': 'reduced',
        'is_high_contrast': False
    },
    'dusk-synth': {
        'name': 'Dusk Synth',
        'background': '#1A0B3B', 'surface': '#250F52', 'text': '#FFF1FB',
        'muted': '#C299D6', 'line': 'rgba(255, 95, 162, 0.4)',
        'accent': '#00F0FF', 'accent2': '#FF5FA2', 'ok': '#00F0FF', 'warn': '#FFB020', 'info': '#7AA2FF',
        'text_on_accent': '#0E0320', 'glow': 'rgba(255, 95, 162, 0.7)',
        'heading_font': 'Audiowide', 'body_font': 'Space Grotesk',
        'slot_radius': '50%', 'border_width': '1.5px', 'shadow': '0 0 20px rgba(0,240,255,0.35)', 'motion_level': 'full',
        'is_high_contrast': False
    },
    'dusk-synth-toned': {
        'name': 'Dusk Synth (Toned)',
        'background': '#120726', 'surface': '#1E0E38', 'text': '#F3E8F5',
        'muted': '#B892C7', 'line': 'rgba(224, 83, 145, 0.35)',
        'accent': '#E05391', 'accent2': '#8F66B8', 'ok': '#68D0B8', 'warn': '#E09853', 'info': '#7898D0',
        'text_on_accent': '#0E0320', 'glow': 'rgba(224, 83, 145, 0.25)',
        'heading_font': 'Audiowide', 'body_font': 'Space Grotesk',
        'slot_radius': '50%', 'border_width': '1.5px', 'shadow': '0 0 15px rgba(224,83,145,0.25)', 'motion_level': 'reduced',
        'is_high_contrast': False
    },
    'cozy-hearth': {
        'name': 'Cozy Hearth',
        'background': '#1F1612', 'surface': '#2B1F1A', 'text': '#F5E6D3',
        'muted': '#A89280', 'line': 'rgba(232, 162, 74, 0.25)',
        'accent': '#E8A24A', 'accent2': '#C4694A', 'ok': '#8FA58A', 'warn': '#E0A070', 'info': '#A9B8D0',
        'text_on_accent': '#1F1612', 'glow': 'rgba(232, 162, 74, 0.45)',
        'heading_font': 'Fraunces', 'body_font': 'Nunito',
        'slot_radius': '22px', 'border_width': '1.5px', 'shadow': '0 4px 18px rgba(232,162,74,0.15)', 'motion_level': 'reduced',
        'is_high_contrast': False
    },
    'mischief-plush': {
        'name': 'Mischief Plush',
        'background': '#EFE3D6', 'surface': '#FAF3ED', 'text': '#3E2B35',
        'muted': '#6F5462', 'line': 'rgba(90, 59, 46, 0.25)',
        'accent': '#8E5BB5', 'accent2': '#F29BB6', 'ok': '#2F8F73', 'warn': '#C2571F', 'info': '#5B6FC0',
        'text_on_accent': '#FFFFFF', 'glow': 'rgba(142, 91, 181, 0.4)',
        'heading_font': 'Nunito', 'body_font': 'Nunito',
        'slot_radius': '50%', 'border_width': '3px', 'shadow': '0 4px 0 rgba(90, 59, 46, 0.35)', 'motion_level': 'full',
        'is_high_contrast': False
    }
}

class TestThemeContrastAndTokens(unittest.TestCase):
    def test_all_themes_have_required_tokens(self):
        for key, t in THEMES.items():
            name = t['name']
            for token in REQUIRED_TOKENS:
                self.assertIn(token, t, f"Theme {name} missing required token: {token}")
                self.assertTrue(t[token], f"Theme {name} has empty token: {token}")
            self.assertIn(t['motion_level'], ['full', 'reduced', 'none'], f"Theme {name} invalid motion level: {t['motion_level']}")

    def test_all_themes_contrast(self):
        for key, t in THEMES.items():
            name = t['name']
            ratio_bg = contrast_ratio(t['text'], t['background'])
            ratio_surface = contrast_ratio(t['text'], t['surface'])
            ratio_on_accent = contrast_ratio(t['text_on_accent'], t['accent'])
            ratio_muted = contrast_ratio(t['muted'], t['background'])
            
            target = 7.0 if t['is_high_contrast'] else 4.5
            self.assertGreaterEqual(
                ratio_bg, target,
                f"Theme {name} body text contrast on bg {ratio_bg:.2f}:1 is below requirement {target:.1f}:1"
            )
            self.assertGreaterEqual(
                ratio_surface, target,
                f"Theme {name} body text contrast on surface {ratio_surface:.2f}:1 is below requirement {target:.1f}:1"
            )
            self.assertGreaterEqual(
                ratio_on_accent, 4.5,
                f"Theme {name} text-on-accent contrast {ratio_on_accent:.2f}:1 is below requirement 4.5:1"
            )
            # High-contrast and low-vision XL require muted text >= 4.5:1 as well
            if t['is_high_contrast']:
                self.assertGreaterEqual(
                    ratio_muted, 4.5,
                    f"Theme {name} muted text contrast {ratio_muted:.2f}:1 is below requirement 4.5:1"
                )

if __name__ == '__main__':
    unittest.main()
