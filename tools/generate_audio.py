#!/usr/bin/env python3
"""
Generador de audio para NEON CLASH.
Sintetiza música synthwave y efectos con la librería estándar (sin dependencias).
Salida: assets/audio/*.wav  (22050 Hz, mono, 16 bit)
"""
import math
import os
import random
import struct
import wave
from array import array

SR = 22050
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "audio")
os.makedirs(OUT, exist_ok=True)

random.seed(11)


def save_wav(name, samples, peak=0.9):
    # normaliza
    mx = max(1e-9, max(abs(s) for s in samples))
    gain = peak / mx
    data = array("h")
    for s in samples:
        v = int(max(-1.0, min(1.0, s * gain)) * 32767)
        data.append(v)
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f"{name:18s} {len(samples)/SR:6.2f}s  {os.path.getsize(path)/1024:6.1f} KB")


def env(i, n, attack=0.01, release=0.08, sustain=1.0):
    t = i / SR
    dur = n / SR
    if t < attack:
        return t / max(1e-6, attack)
    if t > dur - release:
        return max(0.0, (dur - t) / max(1e-6, release)) * sustain
    return sustain


def osc(shape, phase):
    if shape == "sine":
        return math.sin(2 * math.pi * phase)
    if shape == "saw":
        return 2.0 * (phase - math.floor(phase + 0.5))
    if shape == "square":
        return 1.0 if (phase % 1.0) < 0.5 else -1.0
    if shape == "tri":
        return 2.0 * abs(2.0 * (phase - math.floor(phase + 0.5))) - 1.0
    return 0.0


def add_note(buf, start, freq, dur, shape="saw", vol=0.2, attack=0.01, release=0.08, detune=0.0, lowpass=0.0):
    n = int(dur * SR)
    s0 = int(start * SR)
    y = 0.0
    for i in range(n):
        idx = s0 + i
        if idx >= len(buf):
            break
        t = i / SR
        ph = freq * t + detune * t * t
        v = osc(shape, ph)
        if lowpass > 0:
            y += lowpass * (v - y)
            v = y
        e = env(i, n, attack, release)
        buf[idx] += v * vol * e


def add_noise(buf, start, dur, vol=0.2, attack=0.002, release=0.08, color="white"):
    n = int(dur * SR)
    s0 = int(start * SR)
    prev = 0.0
    for i in range(n):
        idx = s0 + i
        if idx >= len(buf):
            break
        w = random.uniform(-1.0, 1.0)
        if color == "high":
            v = w - prev
            prev = w
        elif color == "low":
            prev += 0.08 * (w - prev)
            v = prev
        else:
            v = w
        e = env(i, n, attack, release)
        buf[idx] += v * vol * e


def add_kick(buf, start, vol=0.55):
    n = int(0.22 * SR)
    s0 = int(start * SR)
    ph = 0.0
    for i in range(n):
        idx = s0 + i
        if idx >= len(buf):
            break
        t = i / SR
        f = 52 + 90 * math.exp(-t * 30)
        ph += f / SR
        v = math.sin(2 * math.pi * ph) * math.exp(-t * 15)
        click = random.uniform(-1, 1) * math.exp(-t * 90) * 0.25
        buf[idx] += (v + click) * vol


def add_snare(buf, start, vol=0.3):
    n = int(0.18 * SR)
    s0 = int(start * SR)
    for i in range(n):
        idx = s0 + i
        if idx >= len(buf):
            break
        t = i / SR
        e = math.exp(-t * 22)
        noise = random.uniform(-1, 1) * 0.8
        tone = math.sin(2 * math.pi * 185 * t) * 0.45
        buf[idx] += (noise + tone) * e * vol


def add_hat(buf, start, vol=0.12, open_hat=False):
    dur = 0.16 if open_hat else 0.055
    n = int(dur * SR)
    s0 = int(start * SR)
    prev = 0.0
    for i in range(n):
        idx = s0 + i
        if idx >= len(buf):
            break
        t = i / SR
        w = random.uniform(-1, 1)
        v = w - prev
        prev = w
        e = math.exp(-t * (14 if open_hat else 55))
        buf[idx] += v * e * vol


def add_bell(buf, start, freq=880, dur=0.5, vol=0.25):
    n = int(dur * SR)
    s0 = int(start * SR)
    for i in range(n):
        idx = s0 + i
        if idx >= len(buf):
            break
        t = i / SR
        e = math.exp(-t * 6)
        v = math.sin(2 * math.pi * freq * t) + 0.5 * math.sin(2 * math.pi * freq * 2.01 * t)
        buf[idx] += v * e * vol


# ---------------------------------------------------------------------------
# MÚSICA
# ---------------------------------------------------------------------------

def make_music():
    bpm = 100.0
    beat = 60.0 / bpm
    bar = beat * 4
    bars = 8
    total = bar * bars
    buf = [0.0] * int(total * SR)

    # Am - F - C - G (2 compases cada uno)
    chords = [
        (55.00, [220.00, 261.63, 329.63]),   # A1 / Am
        (43.65, [174.61, 220.00, 261.63]),   # F1 / F
        (65.41, [261.63, 329.63, 392.00]),   # C2 / C
        (49.00, [196.00, 246.94, 293.66]),   # G1 / G
    ]

    for b in range(bars):
        t0 = b * bar
        root, chord = chords[(b // 2) % 4]

        # bajo: corcheas con octava y quinta
        pattern = [0, 0, 12, 0, 7, 0, 12, 7]
        for k, semi in enumerate(pattern):
            f = root * (2 ** (semi / 12.0))
            add_note(buf, t0 + k * beat / 2, f, beat / 2 * 0.92, "saw", 0.17,
                     attack=0.005, release=0.03, lowpass=0.12)

        # pad: acorde sostenido
        for f in chord:
            add_note(buf, t0, f, bar * 0.98, "saw", 0.055, attack=0.25, release=0.4)
            add_note(buf, t0, f * 1.005, bar * 0.98, "sine", 0.035, attack=0.25, release=0.4)

        # arpegio de 16avos
        tones = chord + [chord[0] * 2]
        for k in range(16):
            f = tones[k % len(tones)] * (2 if (k // 8) % 2 else 1)
            add_note(buf, t0 + k * beat / 4, f, beat / 4 * 0.8, "square", 0.045,
                     attack=0.004, release=0.04)

        # batería
        add_kick(buf, t0 + 0 * beat, 0.6)
        add_kick(buf, t0 + 2 * beat, 0.55)
        if b % 2 == 1:
            add_kick(buf, t0 + 2.5 * beat, 0.4)
        add_snare(buf, t0 + 1 * beat, 0.28)
        add_snare(buf, t0 + 3 * beat, 0.3)
        for k in range(8):
            add_hat(buf, t0 + k * beat / 2, 0.09 if k % 2 == 0 else 0.06, open_hat=(k == 7))

    # melodía principal (últimos 4 compases)
    melody = [
        (0, 440.00, 1.0), (1.0, 523.25, 0.5), (1.5, 659.25, 0.5),
        (2.0, 587.33, 1.0), (3.0, 523.25, 0.5), (3.5, 440.00, 0.5),
        (4.0, 349.23, 1.0), (5.0, 440.00, 0.5), (5.5, 523.25, 0.5),
        (6.0, 493.88, 1.0), (7.0, 392.00, 1.0),
        (8.0, 440.00, 1.0), (9.0, 523.25, 0.5), (9.5, 659.25, 0.5),
        (10.0, 783.99, 1.0), (11.0, 659.25, 0.5), (11.5, 587.33, 0.5),
        (12.0, 523.25, 1.5), (13.5, 493.88, 0.5),
        (14.0, 440.00, 1.0), (15.0, 392.00, 1.0),
    ]
    for beat_pos, f, dur_beats in melody:
        add_note(buf, bar * 4 + beat_pos * beat, f, dur_beats * beat * 0.9, "saw", 0.07,
                 attack=0.02, release=0.15)
        add_note(buf, bar * 4 + beat_pos * beat + 0.01, f, dur_beats * beat * 0.9, "square", 0.02,
                 attack=0.02, release=0.15)

    # barrido de ruido al final de cada 4 compases
    for b in (3, 7):
        add_noise(buf, b * bar + 2 * beat, 2 * beat, 0.05, attack=0.4, release=0.1, color="high")

    # fade mínimo para evitar clicks
    fade = int(0.01 * SR)
    for i in range(fade):
        g = i / fade
        buf[i] *= g
        buf[-1 - i] *= g
    save_wav("music.wav", buf, 0.72)


# ---------------------------------------------------------------------------
# SFX
# ---------------------------------------------------------------------------

def make_sfx():
    # puñetazo: whoosh corto + impacto
    n = int(0.16 * SR)
    buf = [0.0] * n
    add_noise(buf, 0, 0.1, 0.5, attack=0.002, release=0.06, color="high")
    add_kick(buf, 0.035, 0.5)
    save_wav("punch.wav", buf, 0.8)

    # patada: más grave y larga
    n = int(0.24 * SR)
    buf = [0.0] * n
    add_noise(buf, 0, 0.15, 0.45, attack=0.004, release=0.1, color="low")
    add_kick(buf, 0.04, 0.75)
    add_note(buf, 0.02, 120, 0.12, "sine", 0.3, attack=0.002, release=0.08)
    save_wav("kick.wav", buf, 0.85)

    # impacto
    n = int(0.28 * SR)
    buf = [0.0] * n
    add_noise(buf, 0, 0.16, 0.6, attack=0.001, release=0.12)
    add_note(buf, 0, 82, 0.22, "sine", 0.55, attack=0.001, release=0.15)
    add_note(buf, 0, 160, 0.12, "square", 0.15, attack=0.001, release=0.08)
    save_wav("hit.wav", buf, 0.95)

    # bloqueo metálico
    n = int(0.2 * SR)
    buf = [0.0] * n
    add_note(buf, 0, 740, 0.14, "square", 0.16, attack=0.001, release=0.12)
    add_note(buf, 0, 1110, 0.1, "square", 0.1, attack=0.001, release=0.09)
    add_noise(buf, 0, 0.08, 0.3, attack=0.001, release=0.06, color="high")
    save_wav("block.wav", buf, 0.8)

    # salto
    n = int(0.18 * SR)
    buf = [0.0] * n
    for i in range(n):
        t = i / SR
        f = 300 + 500 * (t / 0.18)
        e = math.exp(-t * 12)
        buf[i] = math.sin(2 * math.pi * f * t) * e * 0.3
    save_wav("jump.wav", buf, 0.65)

    # especial: carga + disparo
    n = int(0.65 * SR)
    buf = [0.0] * n
    add_note(buf, 0, 180, 0.32, "saw", 0.18, attack=0.12, release=0.05)
    add_note(buf, 0.05, 240, 0.28, "saw", 0.14, attack=0.12, release=0.05)
    add_noise(buf, 0.28, 0.3, 0.4, attack=0.002, release=0.2, color="high")
    add_note(buf, 0.3, 90, 0.3, "sine", 0.35, attack=0.002, release=0.2)
    save_wav("special.wav", buf, 0.9)

    # KO
    n = int(0.9 * SR)
    buf = [0.0] * n
    add_kick(buf, 0, 1.0)
    add_noise(buf, 0, 0.6, 0.35, attack=0.002, release=0.5, color="low")
    add_note(buf, 0.02, 55, 0.7, "sine", 0.5, attack=0.002, release=0.4)
    save_wav("ko.wav", buf, 0.95)

    # campana de round
    n = int(0.7 * SR)
    buf = [0.0] * n
    add_bell(buf, 0, 880, 0.7, 0.35)
    add_bell(buf, 0, 1320, 0.5, 0.12)
    save_wav("round.wav", buf, 0.7)

    # selección de menú
    n = int(0.1 * SR)
    buf = [0.0] * n
    add_note(buf, 0, 660, 0.08, "square", 0.22, attack=0.002, release=0.05)
    add_note(buf, 0.04, 990, 0.05, "square", 0.12, attack=0.002, release=0.04)
    save_wav("select.wav", buf, 0.6)

    # victoria
    n = int(0.9 * SR)
    buf = [0.0] * n
    for k, f in enumerate([523.25, 659.25, 783.99, 1046.50]):
        add_note(buf, k * 0.12, f, 0.35, "square", 0.15, attack=0.005, release=0.2)
    save_wav("win.wav", buf, 0.7)


if __name__ == "__main__":
    make_music()
    make_sfx()
