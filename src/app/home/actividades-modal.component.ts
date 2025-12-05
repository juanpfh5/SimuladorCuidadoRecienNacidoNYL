import { Component, Input } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../services/auth';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

// PDF libs (install with npm): jspdf and jspdf-autotable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-actividades-modal',
  template: `
  <ion-header>
    <ion-toolbar>
      <ion-title>Actividades de hoy</ion-title>
      <ion-buttons slot="end">
        <ion-button (click)="close()">Cerrar</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

    <ion-content>
    <ion-list *ngIf="actividades && actividades.length > 0">
      <ion-item button detail lines="full" *ngFor="let a of actividades" (click)="openActividad(a)">
        <ion-label>
          <div class="actividad-title">{{ a.actividad }}</div>
          <div class="actividad-date">{{ a.fecha_inicial | date:'short' }}
            <span class="sep">·</span>
            {{ a.fecha_limite | date:'short' }}</div>
        </ion-label>
        <ion-icon slot="end" [name]="a.completada ? 'checkmark-circle' : 'ellipse'" [color]="a.completada ? 'success' : 'medium'"></ion-icon>
      </ion-item>
    </ion-list>

    <div *ngIf="!actividades || actividades.length === 0" class="empty">No hay actividades para hoy</div>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <ion-button expand="block" (click)="generateReport()">Generar reporte (PDF)</ion-button>
    </ion-toolbar>
  </ion-footer>
  `,
  styles: [
    `.actividad-title { font-weight: 600; font-size: 1rem; }
     .actividad-date { font-size: 0.82rem; color: #666; margin-top: 6px; }
     .empty { text-align: center; margin-top: 20px; color: #666; }
     .sep { margin: 0 6px; color: #999; }
    `
  ],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ActividadesModalComponent {
  @Input() actividades: any[] = [];

  constructor(
    private modalCtrl: ModalController,
    private http: HttpClient,
    private auth: Auth,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  close() {
    this.modalCtrl.dismiss();
  }

  async openActividad(a: any) {
    // Dismiss modal first, then navegar a la página de la tarea con el id en query params
    await this.modalCtrl.dismiss();

    const nombre = (a.actividad || '').toLowerCase();
    let ruta = '/home';
    if (nombre.includes('aliment')) ruta = '/tareas/alimentar';
    else if (nombre.includes('bañ') || nombre.includes('banar')) ruta = '/tareas/banar';
    else if (nombre.includes('dorm')) ruta = '/tareas/dormir';
    else if (nombre.includes('curar') || nombre.includes('medic')) ruta = '/tareas/medicina';
    else if (nombre.includes('pañal') || nombre.includes('panal')) ruta = '/tareas/panal';

    try {
      await this.router.navigate([ruta], { queryParams: { actividadId: a.id } });
    } catch (err) {
      console.error('[ActividadesModal] Error navegando a tarea', err);
    }
  }

  async generateReport() {
    const curp = this.auth.getCurp();
    if (!curp) {
      const t = await this.toastCtrl.create({ message: 'CURP no encontrada', duration: 2000 });
      await t.present();
      return;
    }

    const url = `${environment.API_URL}/actividades/reporte/${curp}`;
    try {
      const res: any = await this.http.get(url).toPromise();
      const actividades = res?.actividades || [];
      if (!actividades.length) {
        const t = await this.toastCtrl.create({ message: 'No hay actividades para generar reporte', duration: 2000 });
        await t.present();
        return;
      }

      this.createPdf(actividades, curp);
    } catch (err) {
      console.error('Error fetching report data', err);
      const t = await this.toastCtrl.create({ message: 'Error al obtener reporte', duration: 2500 });
      await t.present();
    }
  }

  createPdf(actividades: any[], curp: string) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const title = 'Reporte de actividades';
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(18);
    doc.text(title, 40, 50);
    doc.setFontSize(10);
    doc.text(`Usuario: ${curp}`, 40, 70);
    doc.text(`Generado: ${dateStr}`, 40, 85);

    const body = actividades.map(a => [
      a.actividad,
      this.formatDate(a.fecha_inicial),
      this.formatDate(a.fecha_limite),
      a.completada ? 'Sí' : 'No',
      a.curp || ''
    ]);

    autoTable(doc as any, {
      startY: 110,
      head: [['Actividad', 'Fecha inicial', 'Fecha límite', 'Completada', 'CURP']],
      body,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [60, 141, 188] }
    });

    const fileName = `reporte_actividades_${curp}_${(new Date()).toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
  }

  formatDate(val: string) {
    try { return new Date(val).toLocaleString(); } catch(e) { return val; }
  }
}
