import { Component, ElementRef, QueryList, ViewChildren, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { SoundService } from '../../../services/sound.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dormir',
  templateUrl: './dormir.page.html',
  styleUrls: ['./dormir.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class DormirPage implements OnInit, OnDestroy {
  progress = 0;
  completed = false;

  step = 0;
  // 0 = click bebé
  // 1 = cobija
  // 2 = chupon
  // 3 = apagar luz (debe apagarse antes de arrullar)
  // 4 = arrullo

  // Inline overlay state (replaces Popover)
  showInfo = false;
  infoSteps: string[] = [
    'Paso 1: Da clic al bebe.',
    'Paso 1: Pon la cobija sobre el bebé.',
    'Paso 2: Dale su chupón para calmarlo.',
    'Paso 3: Apaga la luz para crear un ambiente tranquilo.',
    'Paso 4: Arrulla (Da clic al bebé) con movimientos suaves hasta que duerma.'
  ];

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router, private sound: SoundService) { }

  // actividadId (opcional) desde query params
  actividadId: number | null = null;
  private actividadCompletedPosted = false;
  // ensure completion sound plays only once
  playedCompletionSound = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('actividadId');
    if (idParam) {
      const n = Number(idParam);
      if (!Number.isNaN(n)) this.actividadId = n;
    }
    console.log('[Dormir] ngOnInit actividadId=', this.actividadId);
    // start looping baby cry while on activity
    try { this.sound.playLoop('assets/sounds/LlantoBebe.mp3'); } catch (e) {}
  }

  // Show inline HTML overlay (works reliably in APK)
  openInfo(_ev?: Event) {
    this.showInfo = true;
  }

  closeInfo() {
    this.showInfo = false;
  }

  lightOff = false;

  isRocking = false;
  babyImg = 'assets/imgs/dormir/BebeCuna.png';

  activeItem: HTMLElement | null = null;
  offsetX = 0;
  offsetY = 0;

  @ViewChildren('draggable') draggableItems!: QueryList<ElementRef>;
  originalPositions = new Map<string, { x: number; y: number }>();

  ngAfterViewInit() {
    // Wait for a frame so layout (parent widths) are stable, avoiding 0px measurements
    requestAnimationFrame(() => {
      this.draggableItems.forEach(item => {
        const el = item.nativeElement as HTMLElement;

        const cs = window.getComputedStyle(el);
        const leftRaw = cs.left as string;
        const topRaw = cs.top as string;

        let left: number;
        let top: number;

        // If computed style uses percentages (e.g., "8%"), convert to pixels relative to parent
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

        // take into account any computed transform (matrix tx) so we can clamp
        let tx = 0;
        try {
          const transform = cs.transform;
          if (transform && transform !== 'none') {
            const m = transform.match(/matrix\(([^)]+)\)/);
            if (m) {
              const parts = m[1].split(',').map(p => parseFloat(p));
              // matrix(a, b, c, d, tx, ty)
              if (parts.length >= 6 && !Number.isNaN(parts[4])) tx = parts[4];
            }
          }
        } catch (e) { tx = 0; }

        // clamp so final visual position (left + tx) stays within [0, parentWidth - elWidth]
        const elW = el.offsetWidth;
        const elH = el.offsetHeight;

        const minLeft = -tx; // L >= -T
        const maxLeft = parentRect.width - elW - tx; // L <= P - W - T
        const minTop = 0;
        const maxTop = Math.max(0, parentRect.height - elH);

        if (Number.isFinite(minLeft) && Number.isFinite(maxLeft)) {
          left = Math.min(Math.max(left, minLeft), maxLeft);
        }
        if (Number.isFinite(minTop) && Number.isFinite(maxTop)) {
          top = Math.min(Math.max(top, minTop), maxTop);
        }

        // ensure absolute positioning after measurements
        el.style.position = 'absolute';

        const name = el.getAttribute('data-name') || '';
        if (name) this.originalPositions.set(name, { x: left, y: top });

        // write computed pixel values as inline style so dragging uses correct positions
        el.style.left = left + 'px';
        el.style.top = top + 'px';
      });
    });
  }

  onBabyClick() {
    if (this.step === 0) {
      this.step = 1;
    }
  }

  startDrag(event: any, item: EventTarget | null) {
    if (this.completed) return;

    event.preventDefault();

    let el: HTMLElement | null = null;

    if (item instanceof HTMLElement) el = item;
    else if (event.currentTarget instanceof HTMLElement) el = event.currentTarget;
    else if (event.target instanceof HTMLElement) el = event.target;

    if (!el) return;

    this.activeItem = el;

    const rect = el.getBoundingClientRect();
    const clientX = event.touches?.[0]?.clientX ?? event.clientX;
    const clientY = event.touches?.[0]?.clientY ?? event.clientY;

    this.offsetX = clientX - rect.left;
    this.offsetY = clientY - rect.top;

    try { el.setPointerCapture(event.pointerId); } catch { }

    el.classList.add('dragging');
  }

  moveDrag(event: any) {
    if (!this.activeItem) return;

    const clientX = event.touches?.[0]?.clientX ?? event.clientX;
    const clientY = event.touches?.[0]?.clientY ?? event.clientY;

    const parent = this.activeItem.parentElement!;
    const parentRect = parent.getBoundingClientRect();

    const left = clientX - parentRect.left - this.offsetX;
    const top = clientY - parentRect.top - this.offsetY;

    this.activeItem.style.left = left + 'px';
    this.activeItem.style.top = top + 'px';
  }

  endDrag(event: any) {
    if (!this.activeItem) return;

    const baby = document.getElementById('baby-area')!;
    const babyRect = baby.getBoundingClientRect();
    const itemRect = this.activeItem.getBoundingClientRect();

    const isOverlapping = !(
      itemRect.right < babyRect.left ||
      itemRect.left > babyRect.right ||
      itemRect.bottom < babyRect.top ||
      itemRect.top > babyRect.bottom
    );

    if (isOverlapping) {
      this.handleDropOnBaby(this.activeItem);
    }

    try { this.activeItem.releasePointerCapture(event.pointerId); } catch { }

    const name = this.activeItem.getAttribute('data-name');
    if (name) {
      const pos = this.originalPositions.get(name);
      if (pos) {
        this.activeItem.style.left = pos.x + 'px';
        this.activeItem.style.top = pos.y + 'px';
      }
    }

    this.activeItem.classList.remove('dragging');
    this.activeItem = null;
  }

  handleDropOnBaby(el: HTMLElement) {
    const name = el.getAttribute('data-name');

    if (this.step === 1 && name === 'cobija') {
      this.babyImg = 'assets/imgs/dormir/BebeCobija.png';
      this.step = 2;
      this.incrementProgress(25);
      return;
    }

    // Después de la cobija, el usuario coloca el chupon. Tras esto deberá
    // apagar la luz (step=3) antes de poder arrullar.
    if (this.step === 2 && name === 'chupon') {
      this.babyImg = 'assets/imgs/dormir/BebeDormido.png';
      this.step = 3; // siguiente paso: apagar la luz
      this.incrementProgress(25);
      return;
    }
  }

  // ARRULLO DE SOLO 5 SEGUNDOS
  startRock(event: any) {
    // Ahora solo se puede arrullar después de apagar la luz (step === 4)
    if (this.step !== 4) return;

    this.isRocking = true;

    setTimeout(() => {
      this.isRocking = false;

      if (this.step === 4 && !this.completed) {
        // completar el flujo tras arrullo
        this.completed = true;
        this.incrementProgress(25);
      }

    }, 5000); // 5 segundos exactos
  }

  stopRock() {
    // no lo usamos más, pero lo dejamos vacío por si Ionic lo llama
  }

  toggleLight() {
    // Ahora la luz debe apagarse cuando el flujo esté en el paso 3 (después del chupon)
    if (this.step === 3 && !this.lightOff) {
      this.lightOff = true;
      // avanzar al siguiente paso que permite arrullar
      this.step = 4;
      this.incrementProgress(25);
    }
  }

  incrementProgress(amount: number) {
    this.progress = Math.min(100, this.progress + amount);
    console.log('[Dormir] progress ->', this.progress, 'actividadId=', this.actividadId);
    if (this.progress >= 100) {
      this.progress = 100;
      this.completed = true;
      // stop crying and play laugh immediately (attempt in current gesture/context)
      if (!this.playedCompletionSound) {
        try { this.sound.stopLoop(); this.sound.playOnce('assets/sounds/RisaBebe.mp3'); } catch(e){}
        this.playedCompletionSound = true;
      }
      // intentar notificar al backend
      this.completarActividad();
    }
  }

  public async completarActividad() {
    if (this.actividadCompletedPosted) return;
    if (!this.actividadId) {
      console.warn('[Dormir] No actividadId disponible; no se enviará la petición de completar.');
      try { window.alert('No fue posible registrar esta actividad como finalizada. Favor de contactar a la persona responsable en caso de que lo considere un error.'); } catch (e) { }
      return;
    }

    const url = `${environment.API_URL}/actividades/completar`;
    const payload = { id: this.actividadId };
    try {
      console.log('[Dormir] POST ->', url, payload);
      //try { window.alert('Enviando petición de completar actividad ' + this.actividadId); } catch (e) { }
      const res: any = await this.http.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        observe: 'response' as 'response'
      }).toPromise();

      console.log('[Dormir] completarActividad HTTP status:', res?.status, 'body:', res?.body);
      try { window.alert('Tarea completada con exito'); } catch (e) { }
      if (res && res.status >= 200 && res.status < 300) {
        this.actividadCompletedPosted = true;
        // stop crying loop and play laugh once
        if (!this.playedCompletionSound) {
          try { this.sound.stopLoop(); this.sound.playOnce('assets/sounds/RisaBebe.mp3'); } catch(e){}
          this.playedCompletionSound = true;
        }
        try {
          this.router.navigateByUrl('/home').then(() => { try { window.location.reload(); } catch (e) { } });
        } catch (e) { console.warn('[Dormir] Navigation/reload failed', e); }
      } else {
        console.warn('[Dormir] completarActividad no devolvió 2xx', res);
      }
    } catch (err) {
      console.error('[Dormir] Error al marcar actividad como completada', err);
      try { window.alert('Error al notificar al servidor. Revisa la consola (DevTools) y Network.'); } catch (e) { }
    }
  }

  ngOnDestroy(): void {
    try { this.sound.stopAll(); } catch (e) {}
  }
}
