/* import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-alimentar',
  templateUrl: './alimentar.page.html',
  styleUrls: ['./alimentar.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class AlimentarPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

} */

import { Component, ElementRef, QueryList, ViewChildren, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-alimentar',
  templateUrl: './alimentar.page.html',
  styleUrls: ['./alimentar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class AlimentarPage implements OnInit {

  progress = 0;

  @ViewChildren('foodItem') foodItems!: QueryList<ElementRef>;
  originalPositions = new Map<HTMLElement, { x: number; y: number }>();

  activeItem: HTMLElement | null = null;
  offsetX = 0;
  offsetY = 0;

  // actividadId (opcional) tomada de query param: ?actividadId=123
  actividadId: number | null = null;
  private actividadCompletedPosted = false;

  // Inline overlay state (replaces Popover)
  showInfo = false;
  infoSteps: string[] = [
    'Paso 1: Dale su biberon.',
    'Paso 2: Dale su Gerber.',
    'Paso 3: Dale mas comida hasta que se llene'
  ];

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) { }

  ngAfterViewInit() {
    // Guardar posiciones iniciales relativas al contenedor (.food-items)
    // Usar getComputedStyle(left/top) cuando esté disponible para evitar valores 0 antes de que las imágenes carguen
    this.foodItems.forEach(item => {
      const el: HTMLElement = item.nativeElement;
      el.style.position = 'absolute';

      const cs = window.getComputedStyle(el);
      let left = parseFloat(cs.left as string);
      let top = parseFloat(cs.top as string);

      if (Number.isNaN(left)) left = el.offsetLeft;
      if (Number.isNaN(top)) top = el.offsetTop;

      this.originalPositions.set(el, { x: left, y: top });
      // Aplicar left/top inicial si no están ya definidos inline
      if (!el.style.left) el.style.left = left + 'px';
      if (!el.style.top) el.style.top = top + 'px';
    });
  }

  // Show inline HTML overlay instead of Popover (works reliably in APK)
  openInfo(_ev?: Event) {
    this.showInfo = true;
  }

  closeInfo() {
    this.showInfo = false;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('actividadId');
    if (idParam) {
      const n = Number(idParam);
      if (!Number.isNaN(n)) this.actividadId = n;
    }
    console.log('[Alimentar] ngOnInit actividadId=', this.actividadId);
  }

  startDrag(event: any, item: EventTarget | null) {
    event.preventDefault();
    // Resolver elemento HTMLElement de forma segura
    let el: HTMLElement | null = null;
    if (item instanceof HTMLElement) {
      el = item as HTMLElement;
    } else if (event.currentTarget && event.currentTarget instanceof HTMLElement) {
      el = event.currentTarget as HTMLElement;
    } else if (event.target && event.target instanceof HTMLElement) {
      el = event.target as HTMLElement;
    }

    if (!el) return;

    this.activeItem = el;

    const rect = el.getBoundingClientRect();

    const clientX = (event.touches && event.touches[0]) ? event.touches[0].clientX : event.clientX;
    const clientY = (event.touches && event.touches[0]) ? event.touches[0].clientY : event.clientY;

    this.offsetX = clientX - rect.left;
    this.offsetY = clientY - rect.top;

    // Capturar el pointer para recibir eventos aunque el puntero salga del elemento
    try { (el as any).setPointerCapture((event as any).pointerId); } catch (e) { }

    el.classList.add('dragging');
  }

  moveDrag(event: any) {
    if (!this.activeItem) return;

    const clientX = event.touches && event.touches[0] ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches && event.touches[0] ? event.touches[0].clientY : event.clientY;

    // Posición relativa al contenedor padre (.food-items)
    const parent = this.activeItem.parentElement as HTMLElement;
    const parentRect = parent.getBoundingClientRect();

    const left = clientX - parentRect.left - this.offsetX;
    const top = clientY - parentRect.top - this.offsetY;

    this.activeItem.style.left = left + 'px';
    this.activeItem.style.top = top + 'px';
  }

  endDrag(event: any) {
    if (!this.activeItem) return;

    const baby = document.getElementById("baby-area");
    const babyRect = baby!.getBoundingClientRect();
    const itemRect = this.activeItem.getBoundingClientRect();

    const isOverlapping =
      !(itemRect.right < babyRect.left ||
        itemRect.left > babyRect.right ||
        itemRect.bottom < babyRect.top ||
        itemRect.top > babyRect.bottom);

    if (isOverlapping) {
      this.feedBaby();
    }

    // Regresar el objeto a su posición original
    // Liberar pointer capture si es posible
    try { (this.activeItem as any).releasePointerCapture((event as any).pointerId); } catch (e) { }

    const original = this.originalPositions.get(this.activeItem);
    if (original) {
      this.activeItem.style.left = original.x + 'px';
      this.activeItem.style.top = original.y + 'px';
    }

    this.activeItem.classList.remove('dragging');
    this.activeItem = null;
  }

  feedBaby() {
    if (this.progress < 100) {
      this.progress += 20;
      console.log('[Alimentar] progress ->', this.progress, 'actividadId=', this.actividadId);
      // show a visible notice in case console isn't visible on device
      try { window.dispatchEvent(new CustomEvent('app-log', { detail: { msg: '[Alimentar] progress ->' + this.progress } })); } catch(e){}
      if (this.progress >= 100) {
        this.progress = 100;
        // enviar al backend que la actividad se completó (si tenemos id)
        this.completarActividad();
      }
    }
  }

  // made public for debug/manual trigger from template
  public async completarActividad() {
    if (this.actividadCompletedPosted) return;
    if (!this.actividadId) {
      console.warn('[Alimentar] No actividadId disponible; no se enviará la petición de completar.');
      // inform the user visibly
      try { window.alert('No se encontró el id de la actividad. ¿Abriste la tarea desde el modal de actividades?'); } catch(e){}
      return;
    }

    const url = `${environment.API_URL}/actividades/completar`;
    const payload = { id: this.actividadId };
    try {
      console.log('[Alimentar] POST ->', url, payload);
      //try { window.alert('Enviando petición de completar actividad ' + this.actividadId); } catch(e){}
      // Enviar con headers explícitos y observar la respuesta para depuración
      const res: any = await this.http.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        observe: 'response' as 'response'
      }).toPromise();

      console.log('[Alimentar] completarActividad HTTP status:', res?.status, 'body:', res?.body);
      try { window.alert('Tarea completada con exito'); } catch(e){}
      if (res && res.status >= 200 && res.status < 300) {
        this.actividadCompletedPosted = true;
        // navigate back to home and reload so Home refreshes activity buttons
        try {
          this.router.navigateByUrl('/home').then(() => { try { window.location.reload(); } catch(e){} });
        } catch(e) { console.warn('[Alimentar] Navigation/reload failed', e); }
      } else {
        console.warn('[Alimentar] completarActividad no devolvió 2xx', res);
      }
    } catch (err) {
      console.error('[Alimentar] Error al marcar actividad como completada', err);
      try { window.alert('Error al notificar al servidor. Revisa la consola (DevTools) y Network.'); } catch(e){}
    }
  }
}
