/* =========================================================================
   NEON CLASH — gestor de audio
   La música y los efectos son WAV sintetizados incluidos en assets/audio.
   ========================================================================= */
'use strict';

class AudioManager {
  constructor() {
    this.scene = null;
    this.music = null;
    this.muted = false;
    this.musicWanted = true;
    this.musicVolume = 0.22;
  }

  attach(scene) {
    this.scene = scene;
    if (scene.sound) {
      scene.sound.mute = this.muted;
    }
    if (this.musicWanted) {
      this.startMusic();
    }
  }

  unlockAndStart() {
    if (!this.scene || !this.scene.sound) return;
    if (this.scene.sound.locked) {
      this.scene.sound.unlock();
    }
    this.startMusic();
  }

  play(key, volume, rate) {
    if (!this.scene || !this.scene.sound || this.muted) return;
    if (!this.scene.cache.audio.exists(key)) return;
    try {
      this.scene.sound.play(key, {
        volume: volume === undefined ? 0.5 : volume,
        rate: rate === undefined ? 1 : rate,
      });
    } catch (e) {
      // El audio no está disponible (por ejemplo, autoplay bloqueado).
    }
  }

  startMusic() {
    if (!this.scene || !this.scene.sound) return;
    if (!this.music) {
      if (!this.scene.cache.audio.exists('music')) return;
      this.music = this.scene.sound.add('music', {
        loop: true,
        volume: this.musicVolume,
      });
    }
    if (!this.music.isPlaying) {
      try {
        this.music.play();
      } catch (e) {
        // Se reintentará en el primer gesto del usuario.
      }
    }
  }

  stopMusic() {
    if (this.music && this.music.isPlaying) {
      this.music.stop();
    }
  }

  duckMusic(ducked) {
    if (this.music) {
      this.music.setVolume(ducked ? 0.08 : this.musicVolume);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.scene && this.scene.sound) {
      this.scene.sound.mute = this.muted;
    }
    return this.muted;
  }
}

window.NCAudio = new AudioManager();
