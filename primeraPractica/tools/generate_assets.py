#!/usr/bin/env python3
"""
Generador de arte para NEON CLASH.
Todo el arte se dibuja proceduralmente con Pillow: no hay assets de terceros.
Salidas:
  assets/backgrounds/neon-rooftop.png
  assets/sprites/kai.png  (sprite sheet 8x4, frames de 160x160)
  assets/sprites/raze.png
  assets/sprites/portrait-kai.png
  assets/sprites/portrait-raze.png
  assets/favicon.png
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_BG = os.path.join(ROOT, "assets", "backgrounds")
OUT_SP = os.path.join(ROOT, "assets", "sprites")
os.makedirs(OUT_BG, exist_ok=True)
os.makedirs(OUT_SP, exist_ok=True)

W, H = 1280, 720
FW, FH = 160, 160
S = 4  # supersampling de los luchadores

PALETTES = {
    "kai": {
        "suit": (20, 34, 64),
        "suit2": (32, 54, 94),
        "suit3": (11, 20, 40),
        "accent": (35, 232, 255),
        "accent2": (0, 132, 255),
        "skin": (219, 166, 125),
        "hair": (7, 9, 18),
        "metal": (140, 170, 200),
        "visor": (120, 250, 255),
    },
    "raze": {
        "suit": (58, 18, 42),
        "suit2": (88, 28, 64),
        "suit3": (32, 10, 26),
        "accent": (255, 55, 140),
        "accent2": (255, 146, 40),
        "skin": (232, 190, 158),
        "hair": (244, 240, 250),
        "metal": (190, 145, 165),
        "visor": (255, 190, 90),
    },
}


def sc(v):
    if isinstance(v, (tuple, list)):
        return tuple(int(round(x * S)) for x in v)
    return int(round(v * S))


def capsule(draw, p1, p2, width, fill, outline=None, outline_w=3):
    """Segmento redondeado con contorno."""
    a, b = sc(p1), sc(p2)
    w = sc(width)
    if outline:
        ow = sc(outline_w)
        draw.line([a, b], fill=outline, width=w + ow * 2)
        r = (w + ow * 2) / 2
        for p in (a, b):
            draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=outline)
    draw.line([a, b], fill=fill, width=w)
    r = w / 2
    for p in (a, b):
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)


def poly(draw, pts, fill, outline=None, width=3):
    pts = [sc(p) for p in pts]
    draw.polygon(pts, fill=fill)
    if outline:
        draw.line(pts + [pts[0]], fill=outline, width=sc(width), joint="curve")


def rim(draw, p1, p2, color, width=1.2, side=1.6):
    """Línea de luz de borde paralela a un segmento."""
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    ln = math.hypot(dx, dy) or 1
    ox, oy = -dy / ln * side, dx / ln * side
    draw.line(
        [sc((p1[0] + ox, p1[1] + oy)), sc((p2[0] + ox, p2[1] + oy))],
        fill=color,
        width=sc(width),
    )


def ellipse(draw, box, fill, outline=None, width=3):
    box = [sc(v) for v in box]
    if outline:
        draw.ellipse(box, fill=outline)
        pad = sc(width)
        draw.ellipse([box[0] + pad, box[1] + pad, box[2] - pad, box[3] - pad], fill=fill)
    else:
        draw.ellipse(box, fill=fill)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_pt(p1, p2, t):
    return (lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t))


BASE = {
    "hip": (78, 98),
    "chest": (80, 66),
    "neck": (81, 54),
    "head": (82, 38),
    "sh_f": (94, 66),
    "el_f": (100, 84),
    "ha_f": (103, 103),
    "sh_b": (66, 66),
    "el_b": (60, 85),
    "ha_b": (57, 103),
    "hip_f": (88, 99),
    "kn_f": (94, 123),
    "ft_f": (96, 148),
    "hip_b": (68, 99),
    "kn_b": (62, 123),
    "ft_b": (60, 148),
    "scarf": [(72, 56), (60, 62), (47, 57), (36, 64)],
    "coat": [(70, 96), (58, 116), (54, 140), (64, 144)],
    "lean": 0.0,
}


def P(**kw):
    d = dict(BASE)
    d.update(kw)
    return d


def draw_fighter(pose, pal, variant, frame_kind="normal"):
    """Devuelve una imagen RGBA de 160x160 con supersampling."""
    size = FW * S
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    gd = ImageDraw.Draw(glow)
    d = ImageDraw.Draw(img)

    accent = pal["accent"]
    accent2 = pal["accent2"]
    suit, suit2, suit3 = pal["suit"], pal["suit2"], pal["suit3"]
    skin, hair = pal["skin"], pal["hair"]
    metal = pal["metal"]

    # ---------- capa de brillo ----------
    # piernas
    for hip, kn, ft in (
        (pose["hip_b"], pose["kn_b"], pose["ft_b"]),
        (pose["hip_f"], pose["kn_f"], pose["ft_f"]),
    ):
        capsule(gd, hip, kn, 11, accent)
        capsule(gd, kn, ft, 9, accent)
    # torso
    poly(gd, [pose["sh_b"], pose["sh_f"], pose["hip_f"], pose["hip_b"]], accent)
    # brazos
    for sh, el, ha in (
        (pose["sh_b"], pose["el_b"], pose["ha_b"]),
        (pose["sh_f"], pose["el_f"], pose["ha_f"]),
    ):
        capsule(gd, sh, el, 9, accent)
        capsule(gd, el, ha, 8, accent)
    # cabeza
    hx, hy = pose["head"]
    ellipse(gd, [hx - 15, hy - 16, hx + 15, hy + 16], accent)

    glow = glow.filter(ImageFilter.GaussianBlur(sc(5)))
    # segundo halo más cerrado
    glow2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd2 = ImageDraw.Draw(glow2)
    hx, hy = pose["head"]
    ellipse(gd2, [hx - 12, hy - 13, hx + 12, hy + 13], accent)
    capsule(gd2, pose["sh_f"], pose["el_f"], 7, accent)
    capsule(gd2, pose["el_f"], pose["ha_f"], 7, accent)
    glow2 = glow2.filter(ImageFilter.GaussianBlur(sc(2)))
    glow.putalpha(glow.getchannel("A").point(lambda a: int(a * 0.55)))
    glow2.putalpha(glow2.getchannel("A").point(lambda a: int(a * 0.75)))
    img.alpha_composite(glow)
    img.alpha_composite(glow2)
    d = ImageDraw.Draw(img)

    outline = (3, 4, 10)

    # ---------- pierna trasera ----------
    capsule(d, pose["hip_b"], pose["kn_b"], 10, suit3, outline, 2)
    capsule(d, pose["kn_b"], pose["ft_b"], 8, suit3, outline, 2)
    rim(d, pose["hip_b"], pose["kn_b"], suit2, 1.1)
    rim(d, pose["kn_b"], pose["ft_b"], suit2, 1.0)
    # bota trasera
    bx, by = pose["ft_b"]
    poly(d, [(bx - 7, by - 10), (bx + 6, by - 10), (bx + 11, by - 1), (bx + 11, by + 2), (bx - 9, by + 2)], suit3, outline, 2)
    d.line([sc((bx + 2, by - 2)), sc((bx + 11, by - 2))], fill=accent2, width=sc(1.6))

    # ---------- brazo trasero ----------
    capsule(d, pose["sh_b"], pose["el_b"], 8, suit3, outline, 2)
    capsule(d, pose["el_b"], pose["ha_b"], 7, suit3, outline, 2)
    rim(d, pose["sh_b"], pose["el_b"], accent2, 0.9)
    rim(d, pose["el_b"], pose["ha_b"], accent2, 0.8)
    ellipse(d, [pose["ha_b"][0] - 6, pose["ha_b"][1] - 6, pose["ha_b"][0] + 6, pose["ha_b"][1] + 6], suit2, outline, 2)

    # ---------- accesorios traseros ----------
    if variant == "kai":
        # bufanda
        pts = pose["scarf"]
        poly(d, [pts[0], pts[1], pts[2], pts[3]], accent2, outline, 2)
        for i in range(len(pts) - 1):
            d.line([sc(pts[i]), sc(pts[i + 1])], fill=accent, width=sc(1.4))
    else:
        # faldón del abrigo
        pts = pose["coat"]
        poly(d, [pose["hip_b"], pose["hip_f"], pts[3], pts[2], pts[1]], suit3, outline, 2)
        d.line([sc(pts[1]), sc(pts[2])], fill=accent, width=sc(1.6))

    # ---------- torso ----------
    torso = [pose["sh_b"], pose["sh_f"], pose["hip_f"], pose["hip_b"]]
    poly(d, torso, suit, outline, 3)
    rim(d, pose["sh_f"], pose["hip_f"], accent, 1.3)
    rim(d, pose["sh_b"], pose["hip_b"], accent2, 0.9)
    # placa pectoral
    sx = pose["chest"][0]
    sy = pose["chest"][1]
    poly(d, [(sx - 13, sy - 8), (sx + 13, sy - 8), (sx + 10, sy + 13), (sx - 10, sy + 13)], suit2, None)
    # líneas de energía del pecho
    d.line([sc((sx - 8, sy - 4)), sc((sx + 8, sy - 4))], fill=accent, width=sc(1.6))
    d.line([sc((sx - 6, sy + 2)), sc((sx + 4, sy + 2))], fill=accent2, width=sc(1.4))
    # cinturón
    hip = pose["hip"]
    d.line([sc((hip[0] - 15, hip[1] - 1)), sc((hip[0] + 14, hip[1] - 1))], fill=suit3, width=sc(5))
    d.line([sc((hip[0] - 15, hip[1] - 2)), sc((hip[0] + 14, hip[1] - 2))], fill=accent, width=sc(1.4))
    ellipse(d, [hip[0] - 4, hip[1] - 5, hip[0] + 4, hip[1] + 3], accent2, outline, 1)

    # ---------- pierna delantera ----------
    capsule(d, pose["hip_f"], pose["kn_f"], 11, suit, outline, 2)
    capsule(d, pose["kn_f"], pose["ft_f"], 9, suit, outline, 2)
    rim(d, pose["hip_f"], pose["kn_f"], accent, 1.2)
    rim(d, pose["kn_f"], pose["ft_f"], accent, 1.0)
    # rodillera
    kx, ky = pose["kn_f"]
    ellipse(d, [kx - 6, ky - 6, kx + 6, ky + 6], suit2, outline, 2)
    d.line([sc((kx - 3, ky - 1)), sc((kx + 3, ky - 1))], fill=accent, width=sc(1.2))
    # bota delantera
    fx, fy = pose["ft_f"]
    poly(d, [(fx - 8, fy - 12), (fx + 7, fy - 12), (fx + 12, fy - 2), (fx + 12, fy + 2), (fx - 10, fy + 2)], suit3, outline, 2)
    d.line([sc((fx + 2, fy - 3)), sc((fx + 12, fy - 3))], fill=accent2, width=sc(1.8))

    # ---------- brazo delantero ----------
    capsule(d, pose["sh_f"], pose["el_f"], 9, suit, outline, 2)
    capsule(d, pose["el_f"], pose["ha_f"], 8, suit, outline, 2)
    rim(d, pose["sh_f"], pose["el_f"], accent, 1.1)
    rim(d, pose["el_f"], pose["ha_f"], accent, 0.9)
    # guante
    hx2, hy2 = pose["ha_f"]
    ellipse(d, [hx2 - 7, hy2 - 7, hx2 + 7, hy2 + 7], suit2, outline, 2)
    d.line([sc((hx2 - 4, hy2 - 1)), sc((hx2 + 4, hy2 - 1))], fill=accent, width=sc(1.4))

    # ---------- cabeza ----------
    hx, hy = pose["head"]
    # cuello
    capsule(d, pose["neck"], (pose["chest"][0], pose["chest"][1] - 4), 7, suit3, outline, 1)
    # casco / cara
    ellipse(d, [hx - 14, hy - 16, hx + 14, hy + 16], suit2, outline, 3)
    # mandíbula / máscara
    poly(d, [(hx - 12, hy + 1), (hx + 12, hy + 1), (hx + 9, hy + 13), (hx - 9, hy + 13)], suit3, None)
    d.line([sc((hx - 7, hy + 8)), sc((hx + 7, hy + 8))], fill=accent2, width=sc(1.3))
    # visor
    visor = pal["visor"]
    d.rounded_rectangle(
        [sc(hx - 11), sc(hy - 7), sc(hx + 10), sc(hy + 1)],
        radius=sc(2.2),
        fill=(6, 10, 18),
        outline=outline,
        width=sc(1.2),
    )
    d.line([sc((hx - 8, hy - 3)), sc((hx + 7, hy - 3))], fill=visor, width=sc(2.2))
    d.line([sc((hx - 3, hy - 3)), sc((hx + 2, hy - 3))], fill=(255, 255, 255), width=sc(0.9))

    # pelo / cresta
    if variant == "kai":
        # pelo puntiagudo hacia atrás
        poly(d, [(hx - 13, hy - 12), (hx - 4, hy - 22), (hx + 1, hy - 13), (hx + 8, hy - 24), (hx + 12, hy - 12), (hx + 14, hy - 2), (hx + 8, hy - 9), (hx + 2, hy - 7), (hx - 6, hy - 8), (hx - 13, hy - 3)], hair, outline, 2)
        # cinta
        d.line([sc((hx - 15, hy - 7)), sc((hx + 14, hy - 8))], fill=accent, width=sc(2.2))
        # cola de cinta
        poly(d, [(hx - 13, hy - 8), (hx - 24, hy - 2), (hx - 20, hy + 3), (hx - 11, hy - 3)], accent2, outline, 1)
    else:
        # mohawk
        poly(d, [(hx - 4, hy - 14), (hx - 1, hy - 27), (hx + 4, hy - 18), (hx + 8, hy - 28), (hx + 9, hy - 12), (hx + 12, hy - 5), (hx + 6, hy - 9), (hx - 1, hy - 9), (hx - 6, hy - 5)], hair, outline, 2)
        # implante lateral
        d.line([sc((hx + 10, hy - 10)), sc((hx + 13, hy + 1))], fill=accent2, width=sc(1.8))

    # hombrera delantera
    shx, shy = pose["sh_f"]
    poly(d, [(shx - 8, shy - 5), (shx + 9, shy - 6), (shx + 10, shy + 5), (shx - 5, shy + 7)], suit2, outline, 2)
    d.line([sc((shx - 4, shy - 1)), sc((shx + 7, shy - 2))], fill=accent, width=sc(1.3))

    # destello del puño cuando golpea
    if frame_kind in ("punch", "special", "kick"):
        tip = pose["ha_f"] if frame_kind != "kick" else pose["ft_f"]
        r = 10 if frame_kind != "kick" else 8
        d.ellipse([sc(tip[0] - r), sc(tip[1] - r), sc(tip[0] + r), sc(tip[1] + r)], fill=(255, 255, 255, 70))

    return img.resize((FW, FH), Image.LANCZOS)


# ---------------------------------------------------------------------------
# POSES
# ---------------------------------------------------------------------------

def idle_pose(t):
    bob = math.sin(t * math.pi * 2) * 1.4
    sway = math.sin(t * math.pi * 2) * 1.2
    return P(
        hip=(78, 98 + bob), chest=(80, 66 + bob), neck=(81, 54 + bob), head=(82, 38 + bob),
        sh_f=(94, 66 + bob), sh_b=(66, 66 + bob),
        el_f=(101 + sway, 84 + bob), ha_f=(104 + sway, 102 + bob),
        el_b=(59 - sway, 85 + bob), ha_b=(56 - sway, 103 + bob),
        scarf=[(72, 56 + bob), (60 - sway, 62 + bob), (47 - sway * 2, 56 + bob), (36 - sway * 2, 63 + bob)],
        coat=[(70, 96 + bob), (57 - sway, 116 + bob), (53 - sway, 139 + bob), (64 - sway, 143 + bob)],
    )


def walk_pose(t):
    ph = t * math.pi * 2
    bob = abs(math.sin(ph)) * 2.2
    swing = math.sin(ph)
    # pierna delantera y trasera se alternan
    fft = (96 + swing * 17, 148 - max(0, swing) * 11)
    bft = (60 - swing * 17, 148 - max(0, -swing) * 11)
    fkn = (lerp(88, fft[0], 0.45), lerp(99, fft[1], 0.5) - 2)
    bkn = (lerp(68, bft[0], 0.45), lerp(99, bft[1], 0.5) - 2)
    return P(
        hip=(78, 98 - bob * 0.3), chest=(80, 66 - bob * 0.3), neck=(81, 54 - bob * 0.3), head=(82, 38 - bob * 0.3),
        hip_f=(88, 99 - bob * 0.3), hip_b=(68, 99 - bob * 0.3),
        kn_f=fkn, ft_f=fft, kn_b=bkn, ft_b=bft,
        sh_f=(94, 66 - bob * 0.3), sh_b=(66, 66 - bob * 0.3),
        el_f=(101 - swing * 8, 84 - bob * 0.3), ha_f=(104 - swing * 12, 102 - bob * 0.3),
        el_b=(59 + swing * 8, 85 - bob * 0.3), ha_b=(56 + swing * 12, 103 - bob * 0.3),
        scarf=[(72, 56 - bob * 0.3), (60 - swing * 4, 62), (47 - swing * 6, 56), (36 - swing * 8, 63)],
        coat=[(70, 96), (58 - swing * 3, 116), (54 - swing * 5, 139), (64 - swing * 5, 143)],
    )


def jump_pose(t):
    # t=0 subida, t=1 caída
    return P(
        hip=(78, 94), chest=(80, 62), neck=(81, 50), head=(82, 34),
        hip_f=(88, 95), kn_f=(100, 112), ft_f=(94, 128),
        hip_b=(68, 95), kn_b=(58, 112), ft_b=(64, 128),
        sh_f=(94, 62), sh_b=(66, 62),
        el_f=(104, 76), ha_f=(108, 90),
        el_b=(56, 76), ha_b=(52, 90),
        scarf=[(72, 52), (58, 50), (45, 44), (34, 47)],
        coat=[(70, 92), (56, 108), (50, 130), (61, 133)],
    )


def crouch_pose(t):
    b = 1.5 * math.sin(t * math.pi * 2)
    return P(
        hip=(78, 118), chest=(80, 88 + b), neck=(81, 76 + b), head=(82, 60 + b),
        hip_f=(88, 119), kn_f=(101, 131), ft_f=(98, 148),
        hip_b=(68, 119), kn_b=(55, 131), ft_b=(58, 148),
        sh_f=(94, 88 + b), sh_b=(66, 88 + b),
        el_f=(100, 101 + b), ha_f=(100, 114 + b),
        el_b=(60, 101 + b), ha_b=(58, 114 + b),
        scarf=[(72, 78 + b), (60, 84 + b), (48, 78 + b), (37, 85 + b)],
        coat=[(70, 116), (55, 132), (51, 146), (62, 147)],
    )


def punch_pose(stage):
    if stage == 0:  # windup
        return P(
            hip=(76, 98), chest=(77, 66), neck=(78, 54), head=(79, 38),
            sh_f=(91, 66), el_f=(84, 82), ha_f=(76, 88),
            sh_b=(64, 66), el_b=(58, 82), ha_b=(63, 92),
            hip_f=(86, 99), kn_f=(92, 123), ft_f=(96, 148),
            hip_b=(66, 99), kn_b=(60, 123), ft_b=(58, 148),
            scarf=[(69, 56), (57, 62), (44, 57), (33, 64)],
            coat=[(67, 96), (54, 116), (50, 139), (61, 143)],
        )
    if stage == 1:  # impacto
        return P(
            hip=(82, 98), chest=(84, 66), neck=(85, 54), head=(86, 38),
            sh_f=(98, 66), el_f=(117, 65), ha_f=(139, 64),
            sh_b=(70, 66), el_b=(63, 84), ha_b=(69, 96),
            hip_f=(92, 99), kn_f=(99, 123), ft_f=(103, 148),
            hip_b=(70, 99), kn_b=(63, 123), ft_b=(60, 148),
            scarf=[(75, 56), (64, 61), (52, 55), (41, 61)],
            coat=[(74, 96), (62, 116), (58, 139), (69, 143)],
        )
    # recuperación
    return P(
        hip=(79, 98), chest=(81, 66), neck=(82, 54), head=(83, 38),
        sh_f=(95, 66), el_f=(105, 80), ha_f=(111, 93),
        sh_b=(67, 66), el_b=(61, 84), ha_b=(64, 98),
        hip_f=(89, 99), kn_f=(95, 123), ft_f=(98, 148),
        hip_b=(68, 99), kn_b=(62, 123), ft_b=(59, 148),
        scarf=[(72, 56), (61, 62), (49, 57), (38, 64)],
        coat=[(71, 96), (59, 116), (55, 139), (66, 143)],
    )


def kick_pose(stage):
    if stage == 0:  # windup
        return P(
            hip=(76, 98), chest=(77, 66), neck=(78, 54), head=(79, 38),
            hip_f=(88, 99), kn_f=(102, 112), ft_f=(94, 130),
            hip_b=(68, 99), kn_b=(63, 123), ft_b=(61, 148),
            sh_f=(91, 66), el_f=(96, 80), ha_f=(90, 92),
            sh_b=(63, 66), el_b=(56, 82), ha_b=(62, 94),
            scarf=[(69, 56), (57, 62), (44, 57), (33, 64)],
            coat=[(67, 96), (54, 116), (50, 139), (61, 143)],
        )
    if stage in (1, 2):  # patada extendida
        drop = 0 if stage == 1 else 5
        return P(
            hip=(76, 96), chest=(76, 64), neck=(77, 52), head=(78, 36),
            hip_f=(86, 97), kn_f=(112, 99 + drop), ft_f=(144, 100 + drop),
            hip_b=(66, 97), kn_b=(62, 120), ft_b=(60, 146),
            sh_f=(91, 64), el_f=(96, 78), ha_f=(90, 90),
            sh_b=(63, 64), el_b=(56, 80), ha_b=(62, 92),
            scarf=[(68, 54), (55, 60), (42, 55), (31, 62)],
            coat=[(67, 94), (52, 112), (48, 134), (59, 138)],
        )
    # recuperación
    return P(
        hip=(77, 98), chest=(78, 66), neck=(79, 54), head=(80, 38),
        hip_f=(87, 99), kn_f=(100, 114), ft_f=(98, 136),
        hip_b=(67, 99), kn_b=(62, 123), ft_b=(60, 148),
        sh_f=(92, 66), el_f=(97, 81), ha_f=(92, 94),
        sh_b=(64, 66), el_b=(57, 82), ha_b=(63, 94),
        scarf=[(70, 56), (58, 62), (45, 57), (34, 64)],
        coat=[(68, 96), (55, 116), (51, 139), (62, 143)],
    )


def block_pose(t):
    b = 1.0 * math.sin(t * math.pi * 2)
    return P(
        hip=(75, 101), chest=(77, 69 + b), neck=(78, 57 + b), head=(79, 41 + b),
        hip_f=(85, 102), kn_f=(95, 125), ft_f=(98, 148),
        hip_b=(65, 102), kn_b=(58, 125), ft_b=(58, 148),
        sh_f=(91, 69 + b), el_f=(88, 78 + b), ha_f=(96, 58 + b),
        sh_b=(63, 69 + b), el_b=(70, 78 + b), ha_b=(91, 66 + b),
        scarf=[(69, 59 + b), (57, 65), (44, 60), (33, 67)],
        coat=[(67, 99), (54, 118), (50, 140), (61, 144)],
    )


def hurt_pose(stage):
    if stage == 0:
        return P(
            hip=(73, 100), chest=(71, 69), neck=(70, 57), head=(66, 41),
            sh_f=(85, 69), el_f=(91, 82), ha_f=(86, 96),
            sh_b=(57, 69), el_b=(49, 84), ha_b=(53, 100),
            hip_f=(83, 101), kn_f=(89, 125), ft_f=(94, 148),
            hip_b=(63, 101), kn_b=(57, 125), ft_b=(55, 148),
            scarf=[(60, 59), (47, 64), (35, 58), (24, 65)],
            coat=[(65, 98), (51, 117), (46, 139), (57, 143)],
        )
    return P(
        hip=(75, 102), chest=(73, 71), neck=(72, 59), head=(69, 44),
        sh_f=(87, 71), el_f=(94, 86), ha_f=(89, 101),
        sh_b=(59, 71), el_b=(51, 87), ha_b=(56, 103),
        hip_f=(85, 103), kn_f=(91, 126), ft_f=(95, 148),
        hip_b=(65, 103), kn_b=(59, 126), ft_b=(56, 148),
        scarf=[(62, 61), (49, 66), (37, 60), (26, 67)],
        coat=[(67, 100), (53, 119), (48, 141), (59, 145)],
    )


def ko_pose():
    return P(
        hip=(80, 141), chest=(56, 137), neck=(45, 136), head=(31, 134),
        sh_f=(57, 129), el_f=(70, 123), ha_f=(84, 124),
        sh_b=(57, 145), el_b=(71, 149), ha_b=(86, 147),
        hip_f=(97, 142), kn_f=(116, 143), ft_f=(140, 146),
        hip_b=(96, 147), kn_b=(116, 151), ft_b=(136, 154),
        scarf=[(40, 133), (28, 127), (16, 131), (8, 126)],
        coat=[(78, 139), (92, 151), (112, 154), (120, 146)],
    )


def special_pose(stage):
    if stage == 0:  # carga
        return P(
            hip=(75, 104), chest=(76, 73), neck=(77, 61), head=(78, 45),
            hip_f=(85, 105), kn_f=(96, 127), ft_f=(99, 148),
            hip_b=(65, 105), kn_b=(57, 127), ft_b=(57, 148),
            sh_f=(90, 73), el_f=(81, 89), ha_f=(72, 99),
            sh_b=(62, 73), el_b=(68, 89), ha_b=(77, 99),
            scarf=[(68, 63), (55, 69), (42, 64), (31, 71)],
            coat=[(67, 102), (53, 121), (49, 142), (60, 146)],
        )
    if stage == 1:  # manos al frente cargando
        return P(
            hip=(78, 100), chest=(80, 69), neck=(81, 57), head=(82, 41),
            hip_f=(88, 101), kn_f=(97, 124), ft_f=(101, 148),
            hip_b=(68, 101), kn_b=(61, 124), ft_b=(60, 148),
            sh_f=(94, 69), el_f=(111, 80), ha_f=(126, 74),
            sh_b=(66, 69), el_b=(72, 83), ha_b=(84, 82),
            scarf=[(71, 59), (59, 65), (46, 60), (35, 67)],
            coat=[(70, 98), (57, 118), (53, 140), (64, 144)],
        )
    if stage == 2:  # descarga
        return P(
            hip=(84, 98), chest=(86, 67), neck=(87, 55), head=(88, 39),
            sh_f=(100, 67), el_f=(120, 72), ha_f=(139, 70),
            sh_b=(72, 67), el_b=(80, 82), ha_b=(92, 78),
            hip_f=(94, 99), kn_f=(102, 123), ft_f=(106, 148),
            hip_b=(72, 99), kn_b=(64, 123), ft_b=(61, 148),
            scarf=[(77, 57), (66, 63), (54, 58), (43, 65)],
            coat=[(76, 96), (64, 116), (60, 139), (71, 143)],
        )
    return P(
        hip=(80, 99), chest=(82, 67), neck=(83, 55), head=(84, 39),
        sh_f=(96, 67), el_f=(108, 82), ha_f=(114, 96),
        sh_b=(68, 67), el_b=(62, 84), ha_b=(67, 98),
        hip_f=(90, 100), kn_f=(97, 123), ft_f=(100, 148),
        hip_b=(69, 100), kn_b=(63, 123), ft_b=(60, 148),
        scarf=[(73, 57), (62, 63), (50, 58), (39, 65)],
        coat=[(72, 97), (60, 117), (56, 140), (67, 144)],
    )


def win_pose(stage):
    if stage == 0:
        return P(
            hip=(78, 96), chest=(80, 64), neck=(81, 52), head=(82, 36),
            sh_f=(94, 64), el_f=(105, 47), ha_f=(111, 30),
            sh_b=(66, 64), el_b=(57, 80), ha_b=(64, 94),
            hip_f=(88, 97), kn_f=(94, 121), ft_f=(96, 148),
            hip_b=(68, 97), kn_b=(62, 121), ft_b=(60, 148),
            scarf=[(72, 54), (60, 60), (47, 55), (36, 62)],
            coat=[(70, 94), (58, 114), (54, 137), (65, 141)],
        )
    return P(
        hip=(78, 94), chest=(80, 62), neck=(81, 50), head=(82, 34),
        sh_f=(94, 62), el_f=(107, 46), ha_f=(115, 28),
        sh_b=(66, 62), el_b=(54, 48), ha_b=(48, 31),
        hip_f=(88, 95), kn_f=(94, 119), ft_f=(96, 148),
        hip_b=(68, 95), kn_b=(62, 119), ft_b=(60, 148),
        scarf=[(72, 52), (60, 58), (47, 53), (36, 60)],
        coat=[(70, 92), (58, 112), (54, 135), (65, 139)],
    )


def build_sheet(pal, variant):
    sheet = Image.new("RGBA", (FW * 8, FH * 4), (0, 0, 0, 0))
    frames = []

    for i in range(4):
        frames.append((draw_fighter(idle_pose(i / 4), pal, variant), "idle"))
    for i in range(6):
        frames.append((draw_fighter(walk_pose(i / 6), pal, variant), "walk"))
    frames.append((draw_fighter(jump_pose(0), pal, variant), "jump"))
    frames.append((draw_fighter(jump_pose(1), pal, variant), "jump"))
    for i in range(2):
        frames.append((draw_fighter(crouch_pose(i / 2), pal, variant), "crouch"))
    for i in range(3):
        frames.append((draw_fighter(punch_pose(i), pal, variant), "punch"))
    for i in range(4):
        frames.append((draw_fighter(kick_pose(i), pal, variant), "kick"))
    for i in range(2):
        frames.append((draw_fighter(block_pose(i / 2), pal, variant), "block"))
    for i in range(2):
        frames.append((draw_fighter(hurt_pose(i), pal, variant), "hurt"))
    frames.append((draw_fighter(ko_pose(), pal, variant), "ko"))
    for i in range(4):
        frames.append((draw_fighter(special_pose(i), pal, variant), "special"))
    for i in range(2):
        frames.append((draw_fighter(win_pose(i), pal, variant), "win"))

    assert len(frames) == 32, len(frames)
    for idx, (im, _) in enumerate(frames):
        x = (idx % 8) * FW
        y = (idx // 8) * FH
        sheet.alpha_composite(im, (x, y))
    return sheet, frames


def portrait(frames, pal, name):
    """Retrato 256x256 a partir del frame idle, con fondo neón."""
    im = frames[0][0]
    canvas = Image.new("RGBA", (256, 256), (8, 10, 22, 255))
    d = ImageDraw.Draw(canvas)
    accent = pal["accent"]
    # fondo diagonal
    for y in range(256):
        t = y / 255
        col = (
            int(8 + accent[0] * 0.06 * (1 - t)),
            int(10 + accent[1] * 0.05 * (1 - t)),
            int(22 + accent[2] * 0.08 * (1 - t)),
            255,
        )
        d.line([(0, y), (256, y)], fill=col)
    # rejilla
    for x in range(-256, 512, 32):
        d.line([(x, 0), (x - 128, 256)], fill=(*accent, 18), width=1)
    for y in range(0, 256, 32):
        d.line([(0, y), (256, y)], fill=(*accent, 18), width=1)
    # halo
    halo = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hd.ellipse([48, 40, 208, 220], fill=(*accent, 90))
    halo = halo.filter(ImageFilter.GaussianBlur(26))
    canvas.alpha_composite(halo)
    # personaje grande
    big = im.resize((272, 272), Image.LANCZOS)
    canvas.alpha_composite(big, (-6, -10))
    # marco
    d = ImageDraw.Draw(canvas)
    d.rectangle([0, 0, 255, 255], outline=(*accent, 220), width=2)
    d.line([(0, 236), (256, 236)], fill=(*accent, 160), width=1)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        d.text((10, 237), name.upper(), font=f, fill=(255, 255, 255, 235))
    except Exception:
        d.text((10, 238), name.upper(), fill=(255, 255, 255, 235))
    return canvas


# ---------------------------------------------------------------------------
# FONDO
# ---------------------------------------------------------------------------

def vgrad(draw, box, top, bottom):
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1)
        col = tuple(int(lerp(top[i], bottom[i], t)) for i in range(3))
        draw.line([(x0, y), (x1, y)], fill=col)


def glow_circle(base, center, radius, color, blur=20, alpha=180):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = center
    d.ellipse([x - radius, y - radius, x + radius, y + radius], fill=(*color, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def make_background():
    random.seed(7)
    img = Image.new("RGBA", (W, H), (5, 4, 14, 255))
    d = ImageDraw.Draw(img)
    vgrad(d, (0, 0, W, 560), (4, 4, 14), (32, 10, 48))

    # estrellas
    for _ in range(260):
        x = random.randint(0, W)
        y = random.randint(0, 380)
        a = random.randint(30, 160)
        r = random.choice([0, 0, 0, 1])
        d.ellipse([x, y, x + r, y + r], fill=(210, 225, 255, a))

    # luna
    glow_circle(img, (1020, 150), 95, (60, 220, 255), blur=45, alpha=110)
    glow_circle(img, (1020, 150), 60, (150, 240, 255), blur=22, alpha=90)
    d = ImageDraw.Draw(img)
    d.ellipse([960, 90, 1080, 210], fill=(205, 235, 240, 255))
    d.ellipse([978, 108, 1008, 138], fill=(178, 214, 224, 255))
    d.ellipse([1022, 150, 1054, 182], fill=(180, 216, 226, 255))
    d.ellipse([998, 162, 1014, 178], fill=(188, 222, 230, 255))

    # nubes altas
    clouds = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(clouds)
    for i in range(9):
        cx = random.randint(-100, W + 100)
        cy = random.randint(90, 260)
        cw = random.randint(140, 360)
        ch = random.randint(20, 46)
        cd.ellipse([cx, cy, cx + cw, cy + ch], fill=(70, 40, 100, 55))
    clouds = clouds.filter(ImageFilter.GaussianBlur(16))
    img.alpha_composite(clouds)
    d = ImageDraw.Draw(img)

    # skyline lejano
    x = -20
    while x < W + 40:
        bw = random.randint(28, 80)
        bh = random.randint(50, 180)
        top = 520 - bh
        col = (16, 10, 32, 255)
        d.rectangle([x, top, x + bw, 570], fill=col)
        if random.random() < 0.35:
            d.line([x + bw // 2, top, x + bw // 2, top - random.randint(10, 40)], fill=col, width=2)
        # ventanas
        for wy in range(top + 10, 540, 14):
            for wx in range(x + 5, x + bw - 4, 12):
                if random.random() < 0.22:
                    c = random.choice([(50, 210, 240), (255, 70, 150), (255, 190, 90)])
                    d.rectangle([wx, wy, wx + 2, wy + 3], fill=(*c, random.randint(70, 170)))
        x += bw + random.randint(2, 16)

    # skyline medio
    for side in ("left", "right"):
        x = 0 if side == "left" else 1030
        end = 330 if side == "left" else W
        while x < end:
            bw = random.randint(50, 110)
            bh = random.randint(140, 320)
            top = 560 - bh
            col = (10, 7, 24, 255)
            d.rectangle([x, top, x + bw, 580], fill=col)
            # borde neón
            if random.random() < 0.55:
                c = random.choice([(35, 220, 250), (255, 55, 140)])
                d.line([x, top, x + bw, top], fill=(*c, 180), width=2)
            for wy in range(top + 14, 560, 18):
                for wx in range(x + 7, x + bw - 6, 15):
                    if random.random() < 0.15:
                        c = random.choice([(50, 210, 240), (255, 70, 150), (255, 190, 90)])
                        d.rectangle([wx, wy, wx + 3, wy + 5], fill=(*c, random.randint(40, 120)))
            x += bw + random.randint(4, 20)

    # letreros de neón (izquierda)
    signs = [
        (48, 250, 18, 150, (255, 55, 140), "vertical"),
        (112, 315, 90, 26, (35, 230, 255), "NEO"),
        (1195, 230, 16, 120, (35, 230, 255), "vertical"),
    ]
    for sx, sy, sw, sh, c, kind in signs:
        glow_circle(img, (sx + sw // 2, sy + sh // 2), max(sw, sh) // 2 + 16, c, blur=18, alpha=80)
        d = ImageDraw.Draw(img)
        d.rectangle([sx, sy, sx + sw, sy + sh], fill=(10, 8, 20, 235), outline=(*c, 200), width=2)
        if kind == "vertical":
            for i in range(4):
                yy = sy + 14 + i * (sh - 28) // 4
                d.rectangle([sx + sw // 2 - 4, yy, sx + sw // 2 + 4, yy + 10], outline=(*c, 210), width=1)
        else:
            # texto simple con fuente del sistema
            try:
                f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 17)
                d.text((sx + 8, sy + 4), "NEO", font=f, fill=(*c, 255))
            except Exception:
                d.rectangle([sx + 8, sy + 7, sx + sw - 8, sy + sh - 7], outline=(*c, 255), width=1)

    # cartel grande derecha
    bx, by, bw, bh = 850, 300, 250, 92
    glow_circle(img, (bx + bw // 2, by + bh // 2), 130, (35, 230, 255), blur=35, alpha=55)
    d = ImageDraw.Draw(img)
    d.rectangle([bx, by, bx + bw, by + bh], fill=(8, 10, 24, 210), outline=(35, 230, 255, 200), width=2)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
        d.text((bx + 18, by + 12), "CLASH", font=f, fill=(210, 250, 255, 240))
        f2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 12)
        d.text((bx + 20, by + 58), "SECTOR 07 // NIGHT CITY", font=f2, fill=(255, 60, 150, 230))
    except Exception:
        pass
    # líneas decorativas del cartel
    d.line([bx + 18, by + 52, bx + bw - 18, by + 52], fill=(35, 230, 255, 110), width=1)

    # cables
    for i in range(3):
        y0 = 300 + i * 26
        pts = [(0, y0)]
        for xx in range(0, W + 1, 40):
            pts.append((xx, y0 + int(math.sin(xx / 180 + i) * 12)))
        d.line(pts, fill=(6, 6, 14, 255), width=2)

    # techo / suelo
    vgrad(d, (0, 556, W, H), (14, 11, 28), (4, 4, 12))
    # línea de borde del techo
    d.line([(0, 558), (W, 558)], fill=(35, 230, 255, 160), width=2)
    d.line([(0, 561), (W, 561)], fill=(255, 55, 140, 90), width=1)

    # rejilla de perspectiva
    vp = (640, 556)
    for i in range(-14, 15):
        x_end = 640 + i * 110
        d.line([vp, (x_end, H)], fill=(35, 230, 255, 22), width=1)
    for i in range(1, 8):
        t = (i / 8) ** 1.8
        y = 556 + t * (H - 556)
        d.line([(0, y), (W, y)], fill=(35, 230, 255, 18), width=1)

    # plataforma circular central
    glow_circle(img, (640, 650), 240, (35, 230, 255), blur=55, alpha=30)
    d = ImageDraw.Draw(img)
    d.ellipse([330, 590, 950, 710], outline=(35, 230, 255, 60), width=2)
    d.ellipse([380, 606, 900, 694], outline=(255, 55, 140, 45), width=1)
    # marcas
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        x1 = 640 + math.cos(rad) * 300
        y1 = 650 + math.sin(rad) * 58
        x2 = 640 + math.cos(rad) * 320
        y2 = 650 + math.sin(rad) * 64
        d.line([(x1, y1), (x2, y2)], fill=(35, 230, 255, 60), width=2)

    # charcos / reflejos
    for _ in range(14):
        px = random.randint(80, W - 80)
        py = random.randint(600, 710)
        pw = random.randint(30, 110)
        ph = random.randint(4, 14)
        c = random.choice([(35, 230, 255), (255, 55, 140)])
        d.ellipse([px, py, px + pw, py + ph], fill=(*c, random.randint(8, 24)))

    # niebla baja
    fog = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fog)
    for i in range(10):
        fx = random.randint(-100, W)
        fy = random.randint(520, 650)
        fd.ellipse([fx, fy, fx + random.randint(180, 420), fy + random.randint(30, 80)], fill=(70, 60, 120, 20))
    fog = fog.filter(ImageFilter.GaussianBlur(22))
    img.alpha_composite(fog)

    # estructura lateral izquierda (antena / AC)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 500, 70, 720], fill=(7, 8, 18, 255))
    d.rectangle([70, 540, 92, 720], fill=(10, 12, 26, 255))
    d.line([88, 540, 88, 500], fill=(35, 230, 255, 90), width=2)
    d.rectangle([18, 520, 52, 560], fill=(12, 16, 34, 255), outline=(35, 230, 255, 60), width=1)
    for i in range(4):
        d.line([22, 528 + i * 8, 48, 528 + i * 8], fill=(35, 230, 255, 45), width=1)
    # caja derecha
    d.rectangle([1200, 500, 1280, 720], fill=(7, 8, 18, 255))
    d.rectangle([1180, 560, 1220, 620], fill=(12, 16, 34, 255), outline=(255, 55, 140, 70), width=1)
    d.line([1210, 560, 1210, 520], fill=(255, 55, 140, 100), width=2)

    # scanlines
    scan = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scan)
    for y in range(0, H, 4):
        sd.line([(0, y), (W, y)], fill=(0, 0, 0, 14))
    img.alpha_composite(scan)

    # viñeta
    grad = Image.radial_gradient("L").resize((W, H), Image.BILINEAR)
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vig.putalpha(grad.point(lambda v: int(v * 0.55)))
    # radial_gradient es blanco en el centro; invertimos para oscurecer bordes
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    inv = grad.point(lambda v: int((255 - v) * 0.55))
    vig.putalpha(inv)
    img.alpha_composite(vig)

    return img.convert("RGB")


def make_favicon():
    im = Image.new("RGBA", (64, 64), (8, 10, 24, 255))
    d = ImageDraw.Draw(im)
    d.polygon([(32, 6), (58, 20), (58, 44), (32, 58), (6, 44), (6, 20)], outline=(35, 230, 255, 255), width=2)
    d.line([(20, 32), (44, 32)], fill=(255, 55, 140, 255), width=3)
    d.line([(32, 20), (32, 44)], fill=(35, 230, 255, 255), width=3)
    return im


def main():
    bg = make_background()
    bg.save(os.path.join(OUT_BG, "neon-rooftop.png"), optimize=True)
    print("background ok")

    all_frames = {}
    for name in ("kai", "raze"):
        sheet, frames = build_sheet(PALETTES[name], name)
        sheet.save(os.path.join(OUT_SP, f"{name}.png"), optimize=True)
        all_frames[name] = frames
        portrait(frames, PALETTES[name], name).save(os.path.join(OUT_SP, f"portrait-{name}.png"), optimize=True)
        print(name, "sheet ok", sheet.size)

    # hoja de contacto para revisión
    contact = Image.new("RGB", (FW * 8, FH * 4 * 2 + 20), (20, 20, 30))
    contact.paste(all_frames["kai"][0][0].resize((FW * 8, FH * 4), Image.NEAREST), (0, 0))
    contact.save("/tmp/opencode/contact-kai.png")
    contact2 = Image.new("RGB", (FW * 8, FH * 4), (20, 20, 30))
    for i, (im, _) in enumerate(all_frames["raze"]):
        contact2.paste(im, ((i % 8) * FW, (i // 8) * FH), im)
    contact2.save("/tmp/opencode/contact-raze.png")

    make_favicon().save(os.path.join(ROOT, "assets", "favicon.png"), optimize=True)
    print("done")


if __name__ == "__main__":
    main()
