import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActividadInfoComponent } from './actividad-info.component';

@Component({
  selector: 'app-panal',
  templateUrl: './panal.page.html',
  styleUrls: ['./panal.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule]
})
export class PanalPage {

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

  constructor(private popoverCtrl: PopoverController) { }

  async openInfo(ev: Event) {
    const pop = await this.popoverCtrl.create({
      component: ActividadInfoComponent,
      event: ev,
      translucent: true,
      backdropDismiss: true
    });
    await pop.present();
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
    } else {
      // incorrect order: do nothing
      console.debug('[PanalPage] drop ignored - incorrect order or step', this.step, name);
    }
  }

  incrementProgress() {
    // 4 steps to complete (baby click + 3 drags) => 25% each
    this.progress = Math.min(100, this.progress + 25);
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
