import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { environment } from 'src/environments/environment';
import { ActividadesModalComponent } from './actividades-modal.component';

// ----------------------------
// INTERFAZ PARA LAS ACTIVIDADES
// ----------------------------
interface Actividad {
  id: number;
  actividad: string;
  fecha_inicial: string;
  fecha_limite: string;
  completada: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonicModule, RouterModule],
})
export class HomePage implements OnInit {
  private API_URL = environment.API_URL;

  // Estado de botones
  actividadesHabilitadas = {
    alimentar: false,
    banar: false,
    dormir: false,
    medicina: false,
    panal: false
  };

  // Guardar el id de la actividad disponible para cada tipo (si existe)
  actividadesIds: { [key: string]: number | null } = {
    'alimentar': null,
    'banar': null,
    'dormir': null,
    'medicina': null,
    'panal': null
  };

  constructor(
    private auth: Auth,
    private router: Router,
    private modalCtrl: ModalController,
    private http: HttpClient
  ) {}

  // Expose login state to the template to enable/disable buttons
  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  ngOnInit(): void {
    const curp = this.auth.getCurp();
    console.log('[HomePage] curp=', curp);
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
    } else {
      // Cargar actividades y actualizar botones al iniciar
      this.cargarActividades();
    }
  }

  async cargarActividades() {
    const curp = this.auth.getCurp();
    if (!curp) return;

    const url = `${this.API_URL}/actividades/dia/${curp}`;
    try {
      const res: any = await this.http.get(url).toPromise();
      const actividades: Actividad[] = res?.actividades || [];
      console.log('[Home] cargarActividades -> actividades:', actividades);
      this.actualizarBotonesSegunActividades(actividades);
      // configurar notificaciones locales para actividades próximas
      try { this.setupNotificationsForActividades(actividades); } catch (e) { console.warn('[Home] setupNotifications error', e); }
    } catch (err) {
      console.error('[Home] Error al obtener actividades:', err);
    }
  }

  // Solicita permiso y programa notificaciones locales para actividades no completadas
  private async setupNotificationsForActividades(actividades: Actividad[]) {
    // Only attempt on native platforms or when LocalNotifications available
    const isWeb = Capacitor.getPlatform && Capacitor.getPlatform() === 'web';

    try {
      // Request permissions for local notifications
      if (!isWeb) {
        const perm = await LocalNotifications.requestPermissions();
        console.log('[Home] LocalNotifications permissions', perm);
        // permissive: if not granted, bail out
        const granted = (perm as any)?.display === 'granted' || (perm as any)?.receive === 'granted' || (perm as any)?.granted === true;
        if (!granted) return;
      } else {
        // On web, try Notification API permission
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
          await Notification.requestPermission();
        }
      }
    } catch (e) {
      console.warn('[Home] Error requesting notification permission', e);
    }

    const ahora = new Date();

    for (const act of actividades) {
      try {
        if (act.completada && Number(act.completada) === 1) continue; // skip completed

        const inicio = new Date(act.fecha_inicial);
        const fin = new Date(act.fecha_limite);

        // if now is already within window, show immediate notification
        if (ahora >= inicio && ahora < fin) {
          this.sendImmediateNotification(act);
          continue;
        }

        // if inicio is in the future, schedule at inicio
        if (inicio > ahora) {
          if (!isWeb) {
            await LocalNotifications.schedule({
              notifications: [{
                id: act.id,
                title: 'Actividad lista',
                body: `Es hora de: ${act.actividad}`,
                schedule: { at: inicio },
                extra: { actividadId: act.id }
              }]
            });
            console.log('[Home] Scheduled notification for', act.actividad, inicio);
          } else {
            // On web, use setTimeout as fallback (only while page is open)
            const delay = inicio.getTime() - ahora.getTime();
            setTimeout(() => this.sendImmediateNotification(act), Math.max(0, delay));
            console.log('[Home] Web fallback scheduled (setTimeout) for', act.actividad, inicio);
          }
        }
      } catch (e) {
        console.warn('[Home] Error scheduling notification for actividad', act, e);
      }
    }
  }

  private sendImmediateNotification(act: Actividad) {
    const isWeb = Capacitor.getPlatform && Capacitor.getPlatform() === 'web';
    try {
      if (!isWeb) {
        LocalNotifications.schedule({
          notifications: [
            {
              id: act.id,
              title: 'Actividad lista',
              body: `Es hora de: ${act.actividad}`,
              extra: { actividadId: act.id }
            }
          ]
        }).catch((e: any) => console.warn('[Home] LN schedule immediate error', e));
      } else {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Actividad lista', { body: `Es hora de: ${act.actividad}` });
        }
      }
    } catch (e) {
      console.warn('[Home] sendImmediateNotification error', e);
    }
  }

  actualizarBotonesSegunActividades(actividades: Actividad[]) {
    const ahora = new Date();

    // Reset estados antes de evaluar las actividades
    this.actividadesHabilitadas = {
      alimentar: false,
      banar: false,
      dormir: false,
      medicina: false,
      panal: false
    };
    this.actividadesIds = {
      'alimentar': null,
      'banar': null,
      'dormir': null,
      'medicina': null,
      'panal': null
    };

    actividades.forEach((act: Actividad) => {
      // Si ya está completada, se ignora para habilitar
      if (act.completada && Number(act.completada) === 1) {
        // asegurarse de dejar el id en null y el botón deshabilitado
        switch (act.actividad) {
          case "Alimentar":
            this.actividadesHabilitadas.alimentar = false;
            this.actividadesIds['alimentar'] = null;
            break;
          case "Bañar":
            this.actividadesHabilitadas.banar = false;
            this.actividadesIds['banar'] = null;
            break;
          case "Dormir":
            this.actividadesHabilitadas.dormir = false;
            this.actividadesIds['dormir'] = null;
            break;
          case "Curar":
          case "Medicina":
            this.actividadesHabilitadas.medicina = false;
            this.actividadesIds['medicina'] = null;
            break;
          case "Cambiar pañal":
            this.actividadesHabilitadas.panal = false;
            this.actividadesIds['panal'] = null;
            break;
        }
        // continuar con la siguiente actividad
        return;
      }

      // Convertir strings a Date
      const inicio = new Date(act.fecha_inicial);
      const fin = new Date(act.fecha_limite);

      // validar ventana de tiempo
      const habilitada = ahora >= inicio && ahora < fin;

      if (habilitada) {
        switch (act.actividad) {
          case "Alimentar":
            this.actividadesHabilitadas.alimentar = true;
            this.actividadesIds['alimentar'] = act.id;
            break;
          case "Bañar":
            this.actividadesHabilitadas.banar = true;
            this.actividadesIds['banar'] = act.id;
            break;
          case "Dormir":
            this.actividadesHabilitadas.dormir = true;
            this.actividadesIds['dormir'] = act.id;
            break;
          case "Curar":
          case "Medicina":
            this.actividadesHabilitadas.medicina = true;
            this.actividadesIds['medicina'] = act.id;
            break;
          case "Cambiar pañal":
            this.actividadesHabilitadas.panal = true;
            this.actividadesIds['panal'] = act.id;
            break;
        }
      }
    });
  }

  async openActivities() {
    const curp = this.auth.getCurp();
    if (!curp) {
      alert('No hay CURP registrada. Inicia sesión primero.');
      return;
    }

    const url = `${this.API_URL}/actividades/dia/${curp}`;
    try {
      const raw: string = (await this.http.get(url, { responseType: 'text' }).toPromise()) ?? '';
      const parsed: any = JSON.parse(raw);
      const actividades: Actividad[] = parsed?.actividades || [];

      // Actualizar botones cada vez que se abre el modal
      this.actualizarBotonesSegunActividades(actividades);

      const modal = await this.modalCtrl.create({
        component: ActividadesModalComponent,
        componentProps: { actividades },
      });
      await modal.present();
    } catch (err) {
      console.error('[Home] error fetching activities', err);
      alert('Error al obtener actividades del día. Revisa la consola para más detalles.');
    }
  }

  logout() {
    this.auth.clear();
    this.router.navigate(['/login']);
  }
}
