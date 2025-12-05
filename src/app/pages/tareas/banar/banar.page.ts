import { Component, ElementRef, QueryList, ViewChildren, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-banar',
  templateUrl: './banar.page.html',
  styleUrls: ['./banar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class BanarPage implements OnInit {

  progress = 0;
  completed = false;

  // Steps:
  // 0 = not started, 1 = baby clicked into tub (BebeTina),
  // 2 = shampoo, 3 = jabon, 4 = regadera, 5 = baby clicked out (BebeMojado), 6 = toalla (complete)
  step = 0;

  babyImage = 'assets/imgs/banar/BebeSucio.png';

  // actividadId (optional) passed as query param ?actividadId=123
  actividadId: number | null = null;
  private actividadCompletedPosted = false;
  // show/hide inline info overlay (fallback for Popover on APK)
  showInfo = false;
  infoSteps: string[] = [
    'Paso 1: Toca al bebé para meterlo a la tina.',
    'Paso 2: Usa el shampoo con el bebé por 4 segundos.',
    'Paso 3: Usa el jabón con el bebé por 4 segundos.',
    'Paso 4: Enjuaga al bebé con agua por 4 segundos.',
    'Paso 5: Seca al bebé con la toalla por 4 segundos.'
  ];

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('actividadId');
    if (idParam) {
      const n = Number(idParam);
      if (!Number.isNaN(n)) this.actividadId = n;
    }
    console.log('[Banar] ngOnInit actividadId=', this.actividadId);
  }

  @ViewChildren('draggable') draggableItems!: QueryList<ElementRef>;
  originalPositions = new Map<string, { x: number; y: number }>();

  activeItem: HTMLElement | null = null;
  offsetX = 0;
  offsetY = 0;
  busy = false; // when an activity is showing on baby for the duration
  // hold timer state: user must keep the item over baby for this duration
  holdTimer: any = null;
  holdCounted = false; // whether the current activeItem hold already counted

  // Fallback info overlay: show inline HTML overlay instead of Popover
  openInfo(_ev?: Event) {
    this.showInfo = true;
  }

  closeInfo() {
    this.showInfo = false;
  }

  ngAfterViewInit() {
    this.draggableItems.forEach(item => {
      const el: HTMLElement = item.nativeElement;
      el.style.position = 'absolute';

      const cs = window.getComputedStyle(el);
      let left = parseFloat(cs.left as string);
      let top = parseFloat(cs.top as string);

      if (Number.isNaN(left)) left = el.offsetLeft;
      if (Number.isNaN(top)) top = el.offsetTop;

      const name = el.getAttribute('data-name') || '';
      if (name) this.originalPositions.set(name, { x: left, y: top });
      if (!el.style.left) el.style.left = left + 'px';
      if (!el.style.top) el.style.top = top + 'px';
    });
  }

  onBabyClick() {
    if (this.completed) return;
    if (this.step === 0) {
      this.step = 1;
      this.babyImage = 'assets/imgs/banar/BebeTina.png';
      this.incrementProgress();
    } else if (this.step === 4) {
      // after regadera step, clicking baby exits tub
      this.step = 5;
      this.babyImage = 'assets/imgs/banar/BebeMojado.png';
      this.incrementProgress();
    }
  }

  startDrag(event: any, item: EventTarget | null) {
    if (this.completed || this.busy) return;
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

    // reset hold tracking when a new drag starts
    this.clearHoldTimer();
    this.holdCounted = false;
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

    // Check overlap and start/stop hold timer accordingly
    const baby = document.getElementById('baby-area');
    if (!baby) return;
    const babyRect = baby.getBoundingClientRect();
    const itemRect = this.activeItem.getBoundingClientRect();

    const isOverlapping =
      !(itemRect.right < babyRect.left ||
        itemRect.left > babyRect.right ||
        itemRect.bottom < babyRect.top ||
        itemRect.top > babyRect.bottom);

    const name = this.activeItem.getAttribute('data-name');
    const expected = this.expectedStepForName(name || '');

    if (isOverlapping && !this.busy && !this.holdCounted && expected === this.step) {
      // start hold timer if not already started
      if (!this.holdTimer) this.startHoldTimer(this.activeItem);
    } else {
      // moved away or not the expected step -> cancel timer
      if (this.holdTimer) this.clearHoldTimer();
    }
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

    // If user releases while hold timer running, cancel it (they didn't keep it)
    if (this.holdTimer) {
      this.clearHoldTimer();
    }

    try { (this.activeItem as any).releasePointerCapture((event as any).pointerId); } catch (e) { }

    // restore original position by data-name (only if not busy and element isn't currently placed on baby)
    const name = this.activeItem.getAttribute('data-name');
    if (name && !this.busy) {
      const original = this.originalPositions.get(name);
      if (original) {
        this.activeItem.style.position = 'absolute';
        this.activeItem.style.left = original.x + 'px';
        this.activeItem.style.top = original.y + 'px';
        this.activeItem.style.zIndex = '';
      }
    }

    this.activeItem.classList.remove('dragging');
    this.activeItem = null;
  }

  handleDropOnBaby(el: HTMLElement) {
    if (this.completed) return;
    const name = el.getAttribute('data-name');
    // With the new flow, dropping isn't what counts — holding does. Keep backward compatibility: if a drop happens and hold already counted, ignore.
    console.debug('[Bañar] drop ignored - use hold-to-apply flow', this.step, name);
  }

  expectedStepForName(name: string) {
    switch (name) {
      case 'shampoo': return 1;
      case 'jabon': return 2;
      case 'regadera': return 3;
      case 'toalla': return 5;
      default: return -1;
    }
  }

  startHoldTimer(el: HTMLElement) {
    this.clearHoldTimer();
    this.holdTimer = window.setTimeout(() => {
      this.onHoldComplete(el);
    }, 4000);
  }

  clearHoldTimer() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  onHoldComplete(el: HTMLElement) {
    // mark counted so it doesn't retrigger
    this.holdCounted = true;
    this.holdTimer = null;

    const name = el.getAttribute('data-name');
    const expected = this.expectedStepForName(name || '');
    if (expected !== this.step) return;

    // determine next step and whether final
    let nextStep = this.step + 1;
    const final = (name === 'toalla' && this.step === 5);

    // visual feedback on baby
    const baby = document.getElementById('baby-area');
    if (baby) {
      baby.classList.add('success');
      setTimeout(() => baby.classList.remove('success'), 600);
    }

    // advance state
    this.step = nextStep;
    if (final) {
      this.babyImage = 'assets/imgs/banar/Bebe.png';
      this.incrementProgress(true);
      this.completed = true;
      // notify backend that actividad completed
      this.completarActividad();
    } else {
      this.incrementProgress();
    }
  }

  placeTemporarilyOnBaby(el: HTMLElement, nextStep: number, final: boolean) {
    // show the element over the baby for 4 seconds, then restore and advance
    const name = el.getAttribute('data-name') || '';
    const original = name ? this.originalPositions.get(name) : null;
    const baby = document.getElementById('baby-area');
    if (!baby) return;

    const babyRect = baby.getBoundingClientRect();

    // compute center position for the element
    const elW = el.offsetWidth;
    const elH = el.offsetHeight;
    const left = babyRect.left + (babyRect.width - elW) / 2;
    const top = babyRect.top + (babyRect.height - elH) / 2;

    // set fixed positioning so it overlays baby regardless of parent
    this.busy = true;
    // save current inline styles to restore later
    const prevPosition = el.style.position;
    const prevLeft = el.style.left;
    const prevTop = el.style.top;
    const prevZ = el.style.zIndex;

    el.style.position = 'fixed';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.zIndex = '2000';

    // keep it on baby for 4 seconds
    setTimeout(() => {
      // restore
      el.style.position = 'absolute';
      if (original) {
        el.style.left = original.x + 'px';
        el.style.top = original.y + 'px';
      } else {
        el.style.left = prevLeft;
        el.style.top = prevTop;
      }
      el.style.zIndex = prevZ || '';

      // advance step and progress
      this.step = nextStep;
      if (final) {
        this.babyImage = 'assets/imgs/banar/Bebe.png';
        this.incrementProgress(true);
        this.completed = true;
        // notify backend that actividad completed
        this.completarActividad();
      } else {
        this.incrementProgress();
      }

      this.busy = false;
    }, 4000);
  }

  incrementProgress(final = false) {
    if (final) { this.progress = 100; return; }
    // 6 steps total -> use fractional increment
    this.progress = Math.min(100, Number((this.progress + 100 / 6).toFixed(2)));
  }

  // made public for debug/manual trigger from template
  public async completarActividad() {
    if (this.actividadCompletedPosted) return;
    if (!this.actividadId) {
      console.warn('[Banar] No actividadId disponible; no se enviará la petición de completar.');
      try { window.alert('No se encontró el id de la actividad. ¿Abriste la tarea desde el modal de actividades?'); } catch(e){}
      return;
    }

    const url = `${environment.API_URL}/actividades/completar`;
    const payload = { id: this.actividadId };
    try {
      console.log('[Banar] POST ->', url, payload);
      //try { window.alert('Enviando petición de completar actividad ' + this.actividadId); } catch(e){}
      const res: any = await this.http.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        observe: 'response' as 'response'
      }).toPromise();

      console.log('[Banar] completarActividad HTTP status:', res?.status, 'body:', res?.body);
      try { window.alert('Tarea completada con exito'); } catch(e){}
      if (res && res.status >= 200 && res.status < 300) {
        this.actividadCompletedPosted = true;
        try {
          this.router.navigateByUrl('/home').then(() => { try { window.location.reload(); } catch(e){} });
        } catch(e) { console.warn('[Banar] Navigation/reload failed', e); }
      } else {
        console.warn('[Banar] completarActividad no devolvió 2xx', res);
      }
    } catch (err) {
      console.error('[Banar] Error al marcar actividad como completada', err);
      try { window.alert('Error al notificar al servidor. Revisa la consola (DevTools) y Network.'); } catch(e){}
    }
  }
}
