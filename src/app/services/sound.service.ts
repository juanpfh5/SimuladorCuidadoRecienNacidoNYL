import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
  private loopAudio: HTMLAudioElement | null = null;
  private onceAudio: HTMLAudioElement | null = null;
  // map audio element -> gesture handler so we can remove listeners when playback succeeds or is stopped
  private gestureHandlers = new Map<HTMLAudioElement, EventListener>();

  private _bindGestureForPlayback(audio: HTMLAudioElement) {
    if (this.gestureHandlers.has(audio)) return;
    const handler = () => {
      try {
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => this._removeGestureForAudio(audio)).catch(() => { /* still blocked, keep listener */ });
        } else {
          // no promise => assume success
          this._removeGestureForAudio(audio);
        }
      } catch (e) {
        // ignore and keep listening
      }
    };

    this.gestureHandlers.set(audio, handler);
    document.addEventListener('pointerdown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('click', handler);
  }

  private _removeGestureForAudio(audio: HTMLAudioElement) {
    const handler = this.gestureHandlers.get(audio);
    if (!handler) return;
    document.removeEventListener('pointerdown', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('click', handler);
    this.gestureHandlers.delete(audio);
  }

  playLoop(path: string) {
    try {
      const same = this.loopAudio && this.loopAudio.src && this.loopAudio.src.indexOf(path) !== -1;
      if (!this.loopAudio || !same) {
        this.stopLoop();
        this.loopAudio = new Audio(path);
        this.loopAudio.loop = true;
        this.loopAudio.preload = 'auto';
        try { this.loopAudio.load(); } catch (e) { /* ignore */ }

        const p = this.loopAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // autoplay blocked; wait for a user gesture then try again
            this._bindGestureForPlayback(this.loopAudio!);
          });
        }
      } else {
        const p = this.loopAudio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => this._bindGestureForPlayback(this.loopAudio!));
        }
      }
    } catch (e) {
      console.warn('[SoundService] playLoop error', e);
    }
  }

  stopLoop() {
    try {
      if (this.loopAudio) {
        try { this.loopAudio.pause(); } catch (e) { }
        try { this.loopAudio.currentTime = 0; } catch (e) { }
        this._removeGestureForAudio(this.loopAudio);
        this.loopAudio = null;
      }
    } catch (e) {
      console.warn('[SoundService] stopLoop error', e);
    }
  }

  playOnce(path: string) {
    try {
      if (this.onceAudio) {
        try { this.onceAudio.pause(); } catch (e) { }
        this._removeGestureForAudio(this.onceAudio);
        this.onceAudio = null;
      }
      this.onceAudio = new Audio(path);
      this.onceAudio.loop = false;
      this.onceAudio.preload = 'auto';
      try { this.onceAudio.load(); } catch (e) { }
      const p = this.onceAudio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => this._bindGestureForPlayback(this.onceAudio!));
      }
    } catch (e) {
      console.warn('[SoundService] playOnce error', e);
    }
  }

  stopAll() {
    this.stopLoop();
    try {
      if (this.onceAudio) {
        try { this.onceAudio.pause(); } catch (e) { }
        this._removeGestureForAudio(this.onceAudio);
        this.onceAudio = null;
      }
    } catch (e) { /* ignore */ }
  }
}
