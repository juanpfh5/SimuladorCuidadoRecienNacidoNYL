import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Auth } from 'src/app/services/auth';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// PDF libs (ensure installed): jspdf and jspdf-autotable
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
    private toastCtrl: ToastController
  ) { }

  goBack() {
    this.router.navigate(['/home']);
  }

  ngOnInit(): void {
    this.loadActividades();
  }

  async ionViewWillEnter() {
    // refresh each time the page becomes active
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

    try {
      await this.router.navigate([ruta], { queryParams: { actividadId: a.id } });
    } catch (err) {
      console.error('[Listado] Error navegando a tarea', err);
    }
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

      this.createPdf(actividades, curp);
    } catch (err) {
      console.error('Error fetching report data', err);
      const t = await this.toastCtrl.create({ message: 'Error al obtener reporte', duration: 2500 });
      await t.present();
    }
  }

  // createPdf(actividades: any[], curp: string) {
  //   const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  //   const title = 'Reporte de actividades';
  //   const dateStr = new Date().toLocaleString();
  //   doc.setFontSize(18);
  //   doc.text(title, 40, 50);
  //   doc.setFontSize(10);
  //   doc.text(`Usuario: ${curp}`, 40, 70);
  //   doc.text(`Generado: ${dateStr}`, 40, 85);

  //   const body = actividades.map(a => [
  //     a.actividad,
  //     this.formatDate(a.fecha_inicial),
  //     this.formatDate(a.fecha_limite),
  //     a.completada ? 'Sí' : 'No',
  //     a.curp || ''
  //   ]);

  //   autoTable(doc as any, {
  //     startY: 110,
  //     head: [['Actividad', 'Fecha inicial', 'Fecha límite', 'Completada', 'CURP']],
  //     body,
  //     styles: { fontSize: 10 },
  //     headStyles: { fillColor: [60, 141, 188] }
  //   });

  //   const fileName = `reporte_actividades_${curp}_${(new Date()).toISOString().slice(0,10)}.pdf`;
  //   doc.save(fileName);
  // }

  async createPdf(actividades: any[], curp: string) {
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

    // Generar PDF en base64
    const pdfOutput = doc.output('datauristring');
    const base64Pdf = pdfOutput.split(',')[1];

    const fileName = `reporte_${curp}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Guardar archivo en el sistema
    await Filesystem.writeFile({
      path: fileName,
      data: base64Pdf,
      directory: Directory.Documents
    });

    // EXTRA: Abrir el PDF directamente en visor nativo
    const uriResult = await Filesystem.getUri({
      directory: Directory.Documents,
      path: fileName,
    });

    const nativeUrl = uriResult.uri;

    // Abrir el PDF con el visor nativo de Android
    window.open(nativeUrl, '_system');
  }

  formatDate(val: string) {
    try { return new Date(val).toLocaleString(); } catch (e) { return val; }
  }
}
