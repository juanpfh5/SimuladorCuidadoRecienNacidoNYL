import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonicModule, RouterModule],
})
export class HomePage implements OnInit {
  constructor(private auth: Auth, private router: Router) {}

  ngOnInit(): void {
    const curp = this.auth.getCurp();
    console.log('[HomePage] curp=', curp);
    if (!this.auth.isLoggedIn()) {
      // fallback redirect if guard somehow didn't run
      this.router.navigate(['/login']);
    }
  }

  logout() {
    this.auth.clear();
    this.router.navigate(['/login']);
  }
}
