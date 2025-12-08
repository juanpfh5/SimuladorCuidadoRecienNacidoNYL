import { Component, ElementRef, QueryList, ViewChildren, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { SoundService } from '../../../services/sound.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-medicina',
  templateUrl: './medicina.page.html',
  styleUrls: ['./medicina.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class MedicinaPage implements OnInit, OnDestroy {
  // Progress and state
  progress = 0;
  completed = false;

  // Steps: 0 = waiting, 1 = panuelo placed, 2 = pomada placed, 3 = trapo placed (complete)
  step = 0;

  // baby image path
  babyImage = 'assets/imgs/medicina/BebeMocos.png';

  // Inline HTML info overlay (replace popover)
  showInfo = false;
  infoSteps: string[] = [
    'Paso 1: Limpia suavemente la nariz y la cara del bebé con un pañuelo.',
    'Paso 2: Aplica con suavidad la pomada sobre la zona afectada del bebé.',
    'Paso 3: Cubre o seca al bebé con un trapo limpio y suave.'
  ];

  @ViewChildren('draggable') draggableItems!: QueryList<ElementRef>;
  originalPositions = new Map<string, { x: number; y: number }>();

  activeItem: HTMLElement | null = null;
  offsetX = 0;
  offsetY = 0;

  actividadId: number | null = null;
  private actividadCompletedPosted = false;
  // ensure completion sound plays only once
  playedCompletionSound = false;

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router, private sound: SoundService) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('actividadId');
    if (idParam) {
      const n = Number(idParam);
      if (!Number.isNaN(n)) this.actividadId = n;
    }
    console.log('[Medicina] ngOnInit actividadId=', this.actividadId);
    // start looping baby cry while on activity
    try { this.sound.playLoop('assets/sounds/LlantoBebe.mp3'); } catch (e) {}
  }

  // show inline overlay (works reliably in APK)
  openInfo(_ev?: Event) {
    this.showInfo = true;
  }

  closeInfo() {
    this.showInfo = false;
  }

  ngAfterViewInit() {
    // Wait a frame so layout is stable (parent widths computed), then convert % to px and clamp
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

        // account for any transform translateX (matrix tx)
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

        // ensure absolute positioning after measuring
        el.style.position = 'absolute';

        const name = el.getAttribute('data-name') || '';
        if (name) this.originalPositions.set(name, { x: left, y: top });

        el.style.left = left + 'px';
        el.style.top = top + 'px';
      });
    });
  }

  startDrag(event: any, item: EventTarget | null) {
    if (this.completed) return;
    event.preventDefault();
    let el: HTMLElement | null = null;
    if (item instanceof HTMLElement) el = item as HTMLElement;
    else if (event.currentTarget && event.currentTarget instanceof HTMLElement) el = event.currentTarget as HTMLElement;
    else if (event.target && event.target instanceof HTMLElement) el = event.target as HTMLElement;
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

    // restore original position by data-name
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

    if (this.step === 0 && name === 'panuelo') {
      this.step = 1;
      this.babyImage = 'assets/imgs/medicina/BebeEnfermo.png';
      this.incrementProgress();
    } else if (this.step === 1 && name === 'pomada') {
      this.step = 2;
      this.incrementProgress();
    } else if (this.step === 2 && name === 'trapo') {
      this.step = 3;
      this.babyImage = 'assets/imgs/medicina/Bebe.png';
      this.incrementProgress(true);
      this.completed = true;
      // stop crying and play laugh immediately (user action context), then notify backend
      if (!this.playedCompletionSound) {
        try { this.sound.stopLoop(); this.sound.playOnce('assets/sounds/RisaBebe.mp3'); } catch (e) {}
        this.playedCompletionSound = true;
      }
      this.completarActividad();
    } else {
      console.debug('[MedicinaPage] drop ignored - incorrect order', this.step, name);
    }
  }

  incrementProgress(final = false) {
    if (final) {
      this.progress = 100;
      return;
    }
    // three steps total -> distribute roughly equally
    this.progress = Math.min(100, this.progress + 33);
  }

  // made public for debug/manual trigger from template
  public async completarActividad() {
    if (this.actividadCompletedPosted) return;
    if (!this.actividadId) {
      console.warn('[Medicina] No actividadId disponible; no se enviará la petición de completar.');
      try { window.alert('No fue posible registrar esta actividad como finalizada. Favor de contactar a la persona responsable en caso de que lo considere un error.'); } catch(e){}
      return;
    }

    const url = `${environment.API_URL}/actividades/completar`;
    const payload = { id: this.actividadId };
    try {
      console.log('[Medicina] POST ->', url, payload);
      //try { window.alert('Enviando petición de completar actividad ' + this.actividadId); } catch(e){}
      const res: any = await this.http.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        observe: 'response' as 'response'
      }).toPromise();

      console.log('[Medicina] completarActividad HTTP status:', res?.status, 'body:', res?.body);
      try { window.alert('Tarea completada con exito'); } catch(e){}
      if (res && res.status >= 200 && res.status < 300) {
        this.actividadCompletedPosted = true;
        // stop crying loop and play laugh once
        if (!this.playedCompletionSound) {
          try { this.sound.stopLoop(); this.sound.playOnce('assets/sounds/RisaBebe.mp3'); } catch (e) {}
          this.playedCompletionSound = true;
        }
        try {
          this.router.navigateByUrl('/home').then(() => { try { window.location.reload(); } catch(e){} });
        } catch(e) { console.warn('[Medicina] Navigation/reload failed', e); }
      } else {
        console.warn('[Medicina] completarActividad no devolvió 2xx', res);
      }
    } catch (err) {
      console.error('[Medicina] Error al marcar actividad como completada', err);
      try { window.alert('Error al notificar al servidor. Revisa la consola (DevTools) y Network.'); } catch(e){}
    }
  }

  ngOnDestroy(): void {
    try { this.sound.stopAll(); } catch (e) {}
  }
}
