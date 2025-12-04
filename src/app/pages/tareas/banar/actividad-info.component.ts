import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-actividad-info',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Título</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item> Paso 1 </ion-item>
        <ion-item> Paso 2 </ion-item>
        <ion-item> Paso 3 </ion-item>
      </ion-list>
    </ion-content>
  `
})
export class ActividadInfoComponent {}
