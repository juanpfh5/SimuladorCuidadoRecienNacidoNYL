import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Router, NavigationStart } from '@angular/router';
import { SoundService } from './services/sound.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private platform: Platform, private router: Router, private sound: SoundService) {
    this.initializeApp();
    // stop audio when navigation starts (prevents crying persisting when routing)
    try {
      this.router.events.subscribe(ev => {
        if (ev instanceof NavigationStart) {
          try { this.sound.stopAll(); } catch (e) { }
        }
      });
    } catch (e) { /* ignore */ }
    // also stop when page visibility changes (user backgrounds app)
    try {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          try { this.sound.stopAll(); } catch (e) { }
        }
      });
    } catch (e) { /* ignore */ }
  }

  private async initializeApp() {
    try {
      await this.platform.ready();

      // Attempt to get status bar height from Capacitor StatusBar plugin
      // and expose it as a CSS variable so CSS can respect the notch.
      try {
        const info: any = await StatusBar.getInfo();
        const h = info?.statusBarHeight ?? info?.statusBarHeightPx ?? 0;
        if (h && typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--safe-area-inset-top', `${h}px`);
        }
      } catch (e) {
        // Fallback: on Android webview there may be no StatusBar info.
        // If running on Android, set a reasonable default (24px) so header won't be under the notch.
        try {
          const platform = Capacitor.getPlatform ? Capacitor.getPlatform() : (navigator?.userAgent || 'web');
          if (platform === 'android' && typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--safe-area-inset-top', `24px`);
          }
        } catch (_) {
          // ignore
        }
      }
    } catch (e) {
      console.warn('[App] initializeApp error', e);
    }
  }
}
