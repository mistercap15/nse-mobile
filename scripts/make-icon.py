"""Generate the NSE Ranking app icon set.

Motif: an ascending seasonal line rising over ranked bars — the app ranks stocks
by monthly seasonal edge, so bars (the ranking) plus a rising line (the edge).
Drawn at 4x and downsampled for antialiasing, since PIL has none natively.
"""
from PIL import Image, ImageDraw

S = 4  # supersample factor

# Pale ice-blue background, matching the Expo template icon this replaces —
# sampled from it: ~#E6F4FE at the top deepening toward ~#BFDFFA at the bottom.
#
# The motif uses the LIGHT theme's accent/green from lib/theme.ts: the dark-theme
# variants are tuned for a near-black background and go washed-out on pale blue.
BG_TOP = (230, 244, 254)   # #E6F4FE
BG_BOT = (191, 223, 250)   # #BFDFFA
ACCENT = (29, 111, 232)    # accent #1D6FE8
GREEN = (21, 128, 61)      # green  #15803D
# Opaque on purpose: a semi-transparent fill drawn onto the transparent motif
# layer blends toward black, not toward the background, and the bars all but
# disappeared. This is the intended blended value, stated directly.
MUTED_BAR = (135, 150, 172)


def rounded_rect(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)


def draw_motif(img, size, inset_scale=1.0, with_bg=True, bg_radius=None):
    """Draw bars + rising line centred in a square of `size`."""
    d = ImageDraw.Draw(img, "RGBA")

    if with_bg:
        # Vertical gradient background.
        for y in range(size):
            t = y / max(size - 1, 1)
            col = tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
            d.line([(0, y), (size, y)], fill=col)
        if bg_radius:
            # Mask the gradient to a rounded square.
            mask = Image.new("L", (size, size), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1],
                                                   radius=bg_radius, fill=255)
            img.putalpha(mask)

    # Geometry: four bars of increasing height across the middle.
    cx = size / 2
    span = size * 0.52 * inset_scale          # total width of the bar group
    bar_w = span / 7.0
    gap = (span - bar_w * 4) / 3
    base_y = cx + size * 0.20 * inset_scale   # bars sit on this baseline
    heights = [0.16, 0.245, 0.33, 0.45]       # as a fraction of size
    x0 = cx - span / 2

    tops = []
    for i, h in enumerate(heights):
        x = x0 + i * (bar_w + gap)
        top = base_y - size * h * inset_scale
        # The tallest bar is the payoff — accent it, mute the rest.
        col = ACCENT if i == 3 else MUTED_BAR
        rounded_rect(d, [x, top, x + bar_w, base_y], r=bar_w * 0.34, fill=col)
        tops.append((x + bar_w / 2, top))

    # Rising line through the bar tops, ending in a node above the last bar.
    lw = max(2, int(size * 0.022 * inset_scale))
    pts = [(px, py - size * 0.055 * inset_scale) for px, py in tops]
    d.line(pts, fill=GREEN, width=lw, joint="curve")
    r = size * 0.030 * inset_scale
    ex, ey = pts[-1]
    d.ellipse([ex - r, ey - r, ex + r, ey + r], fill=GREEN)
    return img


def centred_motif(big, inset_scale):
    """Motif on transparency, shifted so its ink is centred on the canvas.

    The bars are centred by construction but the rising line overhangs them top
    and right, so the composition's actual centre of ink is not the geometric
    centre. Measuring the bbox and re-centring beats guessing an offset.
    """
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw_motif(layer, big, inset_scale=inset_scale, with_bg=False)
    bbox = layer.getbbox()
    if bbox:
        cx_ink = (bbox[0] + bbox[2]) / 2
        cy_ink = (bbox[1] + bbox[3]) / 2
        dx = int(big / 2 - cx_ink)
        dy = int(big / 2 - cy_ink)
        shifted = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        shifted.paste(layer, (dx, dy), layer)
        return shifted
    return layer


def make(size, path, with_bg=True, inset_scale=1.0, radius_frac=None):
    big = size * S
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    if with_bg:
        d = ImageDraw.Draw(img)
        for y in range(big):
            t = y / max(big - 1, 1)
            col = tuple(int(BG_TOP[i] + (BG_BOT[i] - BG_TOP[i]) * t) for i in range(3))
            d.line([(0, y), (big, y)], fill=col)
        if radius_frac:
            mask = Image.new("L", (big, big), 0)
            ImageDraw.Draw(mask).rounded_rectangle(
                [0, 0, big - 1, big - 1], radius=int(big * radius_frac), fill=255)
            img.putalpha(mask)
    motif = centred_motif(big, inset_scale)
    img.alpha_composite(motif)
    img.resize((size, size), Image.LANCZOS).save(path)
    print(f"  wrote {path} ({size}x{size})")


OUT = "assets/images"

# iOS / general icon — full bleed square, the OS applies its own mask.
make(1024, f"{OUT}/icon.png", with_bg=True, inset_scale=1.12)

# Android adaptive foreground: motif only, shrunk into the 66% safe zone so the
# launcher's circular/squircle mask never clips it.
big = 1024 * S
fg = centred_motif(big, 0.66)
fg.resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/android-icon-foreground.png")
print(f"  wrote {OUT}/android-icon-foreground.png (1024x1024, safe-zone inset)")

# Android adaptive background: flat ice-blue, matching the icon background.
Image.new("RGBA", (1024, 1024), (230, 244, 254, 255)).save(f"{OUT}/android-icon-background.png")
print(f"  wrote {OUT}/android-icon-background.png")

# Monochrome (Android 13 themed icons): silhouette on transparent.
mono = Image.new("RGBA", (big, big), (0, 0, 0, 0))
md = ImageDraw.Draw(mono, "RGBA")
cx = big / 2
span = big * 0.52 * 0.62
bar_w = span / 7.0
gap = (span - bar_w * 4) / 3
base_y = cx + big * 0.20 * 0.62
x0 = cx - span / 2
for i, h in enumerate([0.16, 0.245, 0.33, 0.45]):
    x = x0 + i * (bar_w + gap)
    md.rounded_rectangle([x, base_y - big * h * 0.62, x + bar_w, base_y],
                         radius=bar_w * 0.34, fill=(255, 255, 255, 255))
mono.resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/android-icon-monochrome.png")
print(f"  wrote {OUT}/android-icon-monochrome.png")

# Splash mark — motif, no background. The splash background is theme-aware
# (cream or near-black), so this one render has to work on both. The icon's
# light-theme blue/green are too dark to read on the dark splash, so the mark
# uses the mid-tone dark-theme tokens, which hold up against either.
ACCENT = (77, 159, 255)    # #4D9FFF
GREEN = (34, 197, 94)      # #22C55E
MUTED_BAR = (148, 163, 184)  # soft #94A3B8
splash = centred_motif(big, 0.9)
splash.resize((512, 512), Image.LANCZOS).save(f"{OUT}/splash-icon.png")
print(f"  wrote {OUT}/splash-icon.png (512x512, mid-tone for both splash themes)")

# Favicon for the web build.
make(64, f"{OUT}/favicon.png", with_bg=True, radius_frac=0.22)
