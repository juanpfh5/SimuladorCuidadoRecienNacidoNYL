import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Auth } from 'src/app/services/auth';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Actividad {
  id: number;
  actividad: string;
  fecha_inicial: string;
  fecha_limite: string;
  completada: number;
  curp?: string;
}

@Component({
  selector: 'app-listado',
  templateUrl: './listado.page.html',
  styleUrls: ['./listado.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ListadoPage implements OnInit {

  actividades: Actividad[] = [];
  private API_URL = environment.API_URL;

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  goBack() {
    this.router.navigate(['/home']);
  }

  ngOnInit(): void {
    this.loadActividades();
  }

  async ionViewWillEnter() {
    await this.loadActividades();
  }

  async loadActividades() {
    const curp = this.auth.getCurp();
    if (!curp) {
      const t = await this.toastCtrl.create({ message: 'CURP no encontrada', duration: 2000 });
      await t.present();
      return;
    }

    const url = `${this.API_URL}/actividades/dia/${curp}`;

    try {
      const res: any = await this.http.get(url).toPromise();
      this.actividades = res?.actividades || [];
    } catch (err) {
      console.error('[Listado] Error fetching actividades', err);
      const t = await this.toastCtrl.create({ message: 'Error al obtener actividades', duration: 2000 });
      await t.present();
    }
  }

  async openActividad(a: Actividad) {
    const nombre = (a.actividad || '').toLowerCase();
    let ruta = '/home';

    if (nombre.includes('aliment')) ruta = '/tareas/alimentar';
    else if (nombre.includes('bañ') || nombre.includes('banar')) ruta = '/tareas/banar';
    else if (nombre.includes('dorm')) ruta = '/tareas/dormir';
    else if (nombre.includes('curar') || nombre.includes('medic')) ruta = '/tareas/medicina';
    else if (nombre.includes('pañal') || nombre.includes('panal')) ruta = '/tareas/panal';

    await this.router.navigate([ruta], { queryParams: { actividadId: a.id } });
  }

  async generateReport() {
    const curp = this.auth.getCurp();

    if (!curp) {
      const t = await this.toastCtrl.create({ message: 'CURP no encontrada', duration: 2000 });
      await t.present();
      return;
    }

    const url = `${this.API_URL}/actividades/reporte/${curp}`;

    try {
      const res: any = await this.http.get(url).toPromise();
      const actividades = res?.actividades || [];

      if (!actividades.length) {
        const t = await this.toastCtrl.create({ message: 'No hay actividades para generar reporte', duration: 2000 });
        await t.present();
        return;
      }

      await this.createPdf(actividades, curp);
    } catch (err) {
      console.error('Error fetching report data', err);
      const t = await this.toastCtrl.create({ message: 'Error al obtener reporte', duration: 2500 });
      await t.present();
    }
  }

  async createPdf(actividades: any[], curp: string) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    doc.setFontSize(18);
    doc.text('Reporte de actividades', 40, 50);

    doc.setFontSize(10);
    doc.text(`Usuario: ${curp}`, 40, 70);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 40, 85);

    autoTable(doc as any, {
      startY: 110,
      head: [['Actividad', 'Fecha inicial', 'Fecha límite', 'Completada', 'CURP']],
      body: actividades.map(a => [
        a.actividad,
        this.formatDate(a.fecha_inicial),
        this.formatDate(a.fecha_limite),
        a.completada ? 'Sí' : 'No',
        a.curp || ''
      ])
    });

    const pdfBase64 = doc.output('datauristring').split(',')[1];

    const fileName = `reporte_${curp}_${new Date().toISOString().slice(0, 10)}.pdf`;

    await Filesystem.requestPermissions();

    const saved = await Filesystem.writeFile({
      path: fileName,
      data: pdfBase64,
      directory: Directory.Documents
    });

    const fileUri = (await Filesystem.getUri({
      directory: Directory.Documents,
      path: fileName
    })).uri;

    console.log('PDF guardado en:', fileUri);

    // === ALERTA EMERGENTE ===
    const alert = await this.alertCtrl.create({
      header: 'Éxito',
      message: 'PDF generado con éxito.',
      buttons: [
        {
          text: 'Abrir PDF',
          handler: () => this.openPdf(fileUri)
        },
        {
          text: 'Aceptar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();

    // Notificación local
    try {
      await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 99999),
          title: 'Reporte generado',
          body: fileName
        }]
      });
    } catch (e) {
      console.warn('Notif error', e);
    }
  }

  async openPdf(uri: string) {
    try {
      await Share.share({
        title: 'Reporte PDF',
        url: uri,
        text: 'Aquí está tu reporte en PDF'
      });
    } catch (err) {
      console.warn('Share fallo', err);
      try {
        window.open(uri, '_system');
      } catch (e) {
        console.error('No se pudo abrir el PDF', e);
      }
    }
  }

  formatDate(val: string) {
    try { return new Date(val).toLocaleString(); }
    catch { return val; }
  }
}
