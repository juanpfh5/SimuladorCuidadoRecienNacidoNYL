import { Component, ElementRef, QueryList, ViewChildren, OnInit } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActividadInfoComponent } from './actividad-info.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dormir',
  templateUrl: './dormir.page.html',
  styleUrls: ['./dormir.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class DormirPage implements OnInit {
  progress = 0;
  completed = false;

  step = 0;
  // 0 = click bebé
  // 1 = cobija
  // 2 = chupon
  // 3 = apagar luz (debe apagarse antes de arrullar)
  // 4 = arrullo

  constructor(private popoverCtrl: PopoverController, private route: ActivatedRoute, private http: HttpClient, private router: Router) { }

  // actividadId (opcional) desde query params
  actividadId: number | null = null;
  private actividadCompletedPosted = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('actividadId');
    if (idParam) {
      const n = Number(idParam);
      if (!Number.isNaN(n)) this.actividadId = n;
    }
    console.log('[Dormir] ngOnInit actividadId=', this.actividadId);
  }

  async openInfo(ev: Event) {
    const pop = await this.popoverCtrl.create({
      component: ActividadInfoComponent,
      event: ev,
      translucent: true,
      backdropDismiss: true
    });
    await pop.present();
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
    this.draggableItems.forEach(item => {
      const el = item.nativeElement as HTMLElement;
      el.style.position = 'absolute';

      const cs = window.getComputedStyle(el);
      let left = parseFloat(cs.left);
      let top = parseFloat(cs.top);

      if (Number.isNaN(left)) left = el.offsetLeft;
      if (Number.isNaN(top)) top = el.offsetTop;

      const name = el.getAttribute('data-name') || '';
      if (name) this.originalPositions.set(name, { x: left, y: top });

      el.style.left = left + 'px';
      el.style.top = top + 'px';
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
      this.babyImg = 'assets/imgs/dormir/BebeChupon.png';
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
      // intentar notificar al backend
      this.completarActividad();
    }
  }

  public async completarActividad() {
    if (this.actividadCompletedPosted) return;
    if (!this.actividadId) {
      console.warn('[Dormir] No actividadId disponible; no se enviará la petición de completar.');
      try { window.alert('No se encontró el id de la actividad. ¿Abriste la tarea desde el modal de actividades?'); } catch(e){}
      return;
    }

    const url = `${environment.API_URL}/actividades/completar`;
    const payload = { id: this.actividadId };
    try {
      console.log('[Dormir] POST ->', url, payload);
      try { window.alert('Enviando petición de completar actividad ' + this.actividadId); } catch(e){}
      const res: any = await this.http.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        observe: 'response' as 'response'
      }).toPromise();

      console.log('[Dormir] completarActividad HTTP status:', res?.status, 'body:', res?.body);
      try { window.alert('Respuesta servidor: ' + (res?.status || 'n/a') + ' ' + JSON.stringify(res?.body)); } catch(e){}
      if (res && res.status >= 200 && res.status < 300) {
        this.actividadCompletedPosted = true;
        try {
          this.router.navigateByUrl('/home').then(() => { try { window.location.reload(); } catch(e){} });
        } catch(e) { console.warn('[Dormir] Navigation/reload failed', e); }
      } else {
        console.warn('[Dormir] completarActividad no devolvió 2xx', res);
      }
    } catch (err) {
      console.error('[Dormir] Error al marcar actividad como completada', err);
      try { window.alert('Error al notificar al servidor. Revisa la consola (DevTools) y Network.'); } catch(e){}
    }
  }
}
