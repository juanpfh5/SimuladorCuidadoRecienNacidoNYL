import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-morir',
  templateUrl: './morir.page.html',
  styleUrls: ['./morir.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonButton, CommonModule, RouterModule]
})
export class MorirPage {
  constructor(private auth: Auth, private router: Router) {}

  logout() {
    this.auth.clear();
    this.router.navigate(['/login']);
  }
}
