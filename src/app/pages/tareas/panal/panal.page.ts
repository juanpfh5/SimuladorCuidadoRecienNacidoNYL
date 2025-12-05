import { Component, ElementRef, QueryList, ViewChildren, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-panal',
  templateUrl: './panal.page.html',
  styleUrls: ['./panal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class PanalPage implements OnInit {

  progress = 0;
  completed = false;

  // 0 = not started, 1 = baby clicked, 2 = toallas, 3 = talco, 4 = panal (complete)
  step = 0;

  @ViewChildren('draggable') draggableItems!: QueryList<ElementRef>;
  // store original positions keyed by data-name to reliably restore positions
  originalPositions = new Map<string, { x: number; y: number }>();

  activeItem: HTMLElement | null = null;
  offsetX = 0;
  offsetY = 0;

  // actividadId (opcional) tomada de query param: ?actividadId=123
  actividadId: number | null = null;
  private actividadCompletedPosted = false;

  // Inline HTML overlay state (replace Popover)
  showInfo = false;
  infoSteps: string[] = [
    'Paso 1: Limpia la zona con las toallas húmedas.',
    'Paso 2: Aplica talco y con suavidad.',
    'Paso 3: Coloca el pañal nuevo junto al pliegue correcto.'
  ];

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('actividadId');
    if (idParam) {
      const n = Number(idParam);
      if (!Number.isNaN(n)) this.actividadId = n;
    }
    console.log('[Panal] ngOnInit actividadId=', this.actividadId);
  }

  async openInfo(ev: Event) {
    // show inline overlay like Bañar (popover fallback for APK)
    this.showInfo = true;
  }

  closeInfo() {
    this.showInfo = false;
  }

  ngAfterViewInit() {
    // mirror Dormir/Medicina: wait a frame, convert % to px and clamp so tools don't overflow
    requestAnimationFrame(() => {
      this.draggableItems.forEach(item => {
        const el: HTMLElement = item.nativeElement;

        const cs = window.getComputedStyle(el);
        const leftRaw = cs.left as string;
        const topRaw = cs.top as string;

        let left: number;
        let top: number;

        const parent = el.parentElement as HTMLElement | null;
        const parentRect = parent ? parent.getBoundingClientRect() : { width: 0, height: 0 } as DOMRect;

        if (leftRaw && leftRaw.includes('%')) {
          const pct = parseFloat(leftRaw);
          left = parentRect.width * (pct / 100);
        } else {
          left = parseFloat(leftRaw as string);
        }

        if (topRaw && topRaw.includes('%')) {
          const pct = parseFloat(topRaw);
          top = parentRect.height * (pct / 100);
        } else {
          top = parseFloat(topRaw as string);
        }

        if (Number.isNaN(left)) left = el.offsetLeft;
        if (Number.isNaN(top)) top = el.offsetTop;

        let tx = 0;
        try {
          const transform = cs.transform;
          if (transform && transform !== 'none') {
            const m = transform.match(/matrix\(([^)]+)\)/);
            if (m) {
              const parts = m[1].split(',').map(p => parseFloat(p));
              if (parts.length >= 6 && !Number.isNaN(parts[4])) tx = parts[4];
            }
          }
        } catch (e) { tx = 0; }

        const elW = el.offsetWidth;
        const elH = el.offsetHeight;

        const minLeft = -tx;
        const maxLeft = parentRect.width - elW - tx;
        const minTop = 0;
        const maxTop = Math.max(0, parentRect.height - elH);

        if (Number.isFinite(minLeft) && Number.isFinite(maxLeft)) left = Math.min(Math.max(left, minLeft), maxLeft);
        if (Number.isFinite(minTop) && Number.isFinite(maxTop)) top = Math.min(Math.max(top, minTop), maxTop);

        el.style.position = 'absolute';

        const name = el.getAttribute('data-name') || '';
        if (name) this.originalPositions.set(name, { x: left, y: top });

        el.style.left = left + 'px';
        el.style.top = top + 'px';
      });
    });
  }

  onBabyClick() {
    if (this.completed) return;
    if (this.step === 0) {
      this.step = 1;
      this.incrementProgress();
    }
  }

  startDrag(event: any, item: EventTarget | null) {
    if (this.completed) return;
    event.preventDefault();
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

    try { (el as any).setPointerCapture((event as any).pointerId); } catch (e) { }

    el.classList.add('dragging');
  }

  moveDrag(event: any) {
    if (!this.activeItem) return;

    const clientX = event.touches && event.touches[0] ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches && event.touches[0] ? event.touches[0].clientY : event.clientY;

    const parent = this.activeItem.parentElement as HTMLElement;
    const parentRect = parent.getBoundingClientRect();

    const left = clientX - parentRect.left - this.offsetX;
    const top = clientY - parentRect.top - this.offsetY;

    this.activeItem.style.left = left + 'px';
    this.activeItem.style.top = top + 'px';
  }

  endDrag(event: any) {
    if (!this.activeItem) return;

    const baby = document.getElementById('baby-area');
    const babyRect = baby!.getBoundingClientRect();
    const itemRect = this.activeItem.getBoundingClientRect();

    const isOverlapping =
      !(itemRect.right < babyRect.left ||
        itemRect.left > babyRect.right ||
        itemRect.bottom < babyRect.top ||
        itemRect.top > babyRect.bottom);

    if (isOverlapping) {
      this.handleDropOnBaby(this.activeItem);
    }

    try { (this.activeItem as any).releasePointerCapture((event as any).pointerId); } catch (e) { }

    // restore by data-name (robust if element refs change)
    const name = this.activeItem.getAttribute('data-name');
    if (name) {
      const original = this.originalPositions.get(name);
      if (original) {
        this.activeItem.style.left = original.x + 'px';
        this.activeItem.style.top = original.y + 'px';
      }
    }

    this.activeItem.classList.remove('dragging');
    this.activeItem = null;
  }

  handleDropOnBaby(el: HTMLElement) {
    if (this.completed) return;

    const name = el.getAttribute('data-name');

    // Order: after baby click (step 1) -> toallas (data-name='toallas') -> talco ('talco') -> panal ('panal')
    if (this.step === 1 && name === 'toallas') {
      this.step = 2;
      this.incrementProgress();
    } else if (this.step === 2 && name === 'talco') {
      this.step = 3;
      this.incrementProgress();
    } else if (this.step === 3 && name === 'panal') {
      this.step = 4;
      this.incrementProgress();
      this.completed = true;
      // notify backend that actividad completed
      this.completarActividad();
    } else {
      // incorrect order: do nothing
      console.debug('[PanalPage] drop ignored - incorrect order or step', this.step, name);
    }
  }

  incrementProgress() {
    // 4 steps to complete (baby click + 3 drags) => 25% each
    this.progress = Math.min(100, this.progress + 25);
  }

  // made public for debug/manual trigger from template
  public async completarActividad() {
    if (this.actividadCompletedPosted) return;
    if (!this.actividadId) {
      console.warn('[Panal] No actividadId disponible; no se enviará la petición de completar.');
      try { window.alert('No se encontró el id de la actividad. ¿Abriste la tarea desde el modal de actividades?'); } catch(e){}
      return;
    }

    const url = `${environment.API_URL}/actividades/completar`;
    const payload = { id: this.actividadId };
    try {
      console.log('[Panal] POST ->', url, payload);
      //try { window.alert('Enviando petición de completar actividad ' + this.actividadId); } catch(e){}
      const res: any = await this.http.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        observe: 'response' as 'response'
      }).toPromise();

      console.log('[Panal] completarActividad HTTP status:', res?.status, 'body:', res?.body);
      try { window.alert('Tarea completada con exito'); } catch(e){}
      if (res && res.status >= 200 && res.status < 300) {
        this.actividadCompletedPosted = true;
        try {
          this.router.navigateByUrl('/home').then(() => { try { window.location.reload(); } catch(e){} });
        } catch(e) { console.warn('[Panal] Navigation/reload failed', e); }
      } else {
        console.warn('[Panal] completarActividad no devolvió 2xx', res);
      }
    } catch (err) {
      console.error('[Panal] Error al marcar actividad como completada', err);
      try { window.alert('Error al notificar al servidor. Revisa la consola (DevTools) y Network.'); } catch(e){}
    }
  }
}
// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

// @Component({
//   selector: 'app-panal',
//   templateUrl: './panal.page.html',
//   styleUrls: ['./panal.page.scss'],
//   standalone: true,
//   imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
// })
// export class PanalPage implements OnInit {

//   constructor() { }

//   ngOnInit() {
//   }

// }
