import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ActividadesModalComponent } from './actividades-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonicModule, RouterModule],
})
export class HomePage implements OnInit {
  private API_URL = environment.API_URL;

  constructor(private auth: Auth, private router: Router, private modalCtrl: ModalController, private http: HttpClient) {}

  ngOnInit(): void {
    const curp = this.auth.getCurp();
    console.log('[HomePage] curp=', curp);
    if (!this.auth.isLoggedIn()) {
      // fallback redirect if guard somehow didn't run
      this.router.navigate(['/login']);
    }
  }

  async openActivities() {
    const curp = this.auth.getCurp();
    if (!curp) {
      alert('No hay CURP registrada. Inicia sesión primero.');
      return;
    }

    const url = `${this.API_URL}/actividades/dia/${curp}`;
    try {
      const res: any = await this.http.get(url).toPromise();
      const actividades = res?.actividades || [];
      const modal = await this.modalCtrl.create({
        component: ActividadesModalComponent,
        componentProps: { actividades },
      });
      await modal.present();
    } catch (err) {
      console.error('[Home] error fetching activities', err);
      alert('Error al obtener actividades del día. Revisa la consola.');
    }
  }

  logout() {
    this.auth.clear();
    this.router.navigate(['/login']);
  }
}
