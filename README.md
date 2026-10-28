# NEON CLASH — Cyber Fighting

Juego de peleas 2D desarrollado con **Phaser 3** para el Taller Práctico de despliegue en GitHub Pages.

**Jugar en línea:** https://2026b-sof-jueg-gr1.github.io/LLUGCHA-CEPEDA-KEVIN-ALEXANDER-jueg-gr3/

![NEON CLASH](https://img.shields.io/badge/Phaser-3.90.0-22e6ff?style=flat-square)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-ff3c8c?style=flat-square)
![Licencia](https://img.shields.io/badge/Uso-Académico-ffe066?style=flat-square)

## Descripción

**NEON CLASH** es un combate uno contra uno ambientado en una azotea cyberpunk del Sector 07. Elige entre **KAI**, el ninja de neón, y **RAZE**, el fugitivo del sector, y pelea al mejor de 3 rondas.

Incluye modo de un jugador contra la CPU con tres dificultades y modo de dos jugadores en el mismo teclado.

## Características

- Combate 2D con físicas Arcade de Phaser 3.
- Modo 1 jugador con IA ajustable: Fácil, Normal y Difícil.
- Modo 2 jugadores local.
- Barra de vida, medidor de energía y especial con proyectil.
- Combos, hit stop, sacudida de cámara, partículas y daño flotante.
- Mejor de 3 rondas con temporizador de 60 segundos.
- Pausa, revancha, menú principal y pantalla completa.
- Controles táctiles en dispositivos móviles.
- Música synthwave y efectos de sonido sintetizados.
- Arte, retratos, fondo y audio generados proceduralmente para el proyecto.
- Diseño responsive con Phaser Scale FIT.

## Controles

### Jugador 1

| Acción | Tecla |
| --- | --- |
| Mover | `A` / `D` |
| Saltar | `W` o `Espacio` |
| Agacharse | `S` |
| Puñetazo | `J` |
| Patada | `K` |
| Bloquear | `L` o `Shift` |
| Especial | `U` |

En el modo de 1 jugador, el Jugador 1 también puede moverse con las flechas y saltar con `↑`.

### Jugador 2

| Acción | Tecla |
| --- | --- |
| Mover | `←` / `→` |
| Saltar | `↑` |
| Agacharse | `↓` |
| Puñetazo | `1` |
| Patada | `2` |
| Bloquear | `3` |
| Especial | `4` |

### Generales

| Acción | Tecla |
| --- | --- |
| Pausa | `P` o `Esc` |
| Silencio | `M` |
| Pantalla completa | `F` |
| Revancha | `R` o `Enter` |

## Tecnologías

- **Phaser 3.90.0** (incluido localmente en `vendor/phaser.min.js`).
- JavaScript clásico, sin bundler ni paso de compilación.
- HTML5 Canvas / WebGL.
- CSS responsive.
- Python + Pillow y el módulo `wave` para generar los assets.
- GitHub Actions para desplegar en GitHub Pages.

## Estructura del repositorio

```text
.
├── .github/workflows/deploy.yml   # Despliegue automático a GitHub Pages
├── primeraPractica/               # Juego completo
│   ├── index.html
│   ├── game.js
│   ├── css/
│   ├── js/
│   ├── assets/
│   ├── vendor/
│   ├── tools/
│   └── .nojekyll
└── README.md
```

## Ejecución local

No se necesita Node.js ni npm. Como el juego carga fuentes y audio, conviene servirlo con un servidor HTTP local:

```bash
cd primeraPractica
python3 -m http.server 8000
```

Abrir `http://localhost:8000`.

## Despliegue

El workflow `.github/workflows/deploy.yml` se ejecuta al hacer push a `main`. Publica el contenido de `primeraPractica/` como artefacto de GitHub Pages, por lo que la URL pública sirve el juego directamente.

## Créditos

Proyecto individual desarrollado por **Kevin Alexander Llugcha Cepeda** para la asignatura de Juegos, 2026-B.

Todos los recursos gráficos y sonoros fueron generados para este proyecto. Phaser 3 se distribuye bajo su licencia MIT.
