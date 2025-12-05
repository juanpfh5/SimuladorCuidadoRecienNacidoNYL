import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { RouterModule } from '@angular/router';

// @Component({
//   selector: 'app-login',
//   templateUrl: './login.page.html',
//   styleUrls: ['./login.page.scss'],
//   standalone: true,
//   imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
// })
// export class LoginPage implements OnInit {

//   constructor() { }

//   ngOnInit() {
//   }

// }



import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class LoginPage implements OnInit {
  curp = '';

  constructor(private http: HttpClient, private router: Router, private auth: Auth) { }

  private API_URL = environment.API_URL;

  login() {
    if (!this.curp || !this.curp.trim()) {
      alert('Por favor ingresa la CURP');
      return;
    }

    const url = `${this.API_URL}/login`;

    this.http.post(url, { curp: this.curp })
      .subscribe({
        next: (res: any) => {
          console.log('Login correcto', res);
          this.auth.setCurp(this.curp);
          console.log('res.bebe_vivo: ', res.usuario?.bebe_vivo);
          // Blur active element to avoid accessibility warnings when navigating
          try { (document.activeElement as HTMLElement)?.blur(); } catch (e) { }

          // Si el backend indica que el bebé no está vivo, ir a /morir
          if (res && (res.usuario?.bebe_vivo === false || res.usuario?.bebe_vivo === 0 || res.usuario?.bebe_vivo === '0')) {
            this.router.navigate(['/morir']);
            return;
          }

          this.router.navigate(['/home']);
        },
        error: (err: any) => {
          console.error('[Login] error response:', err);
          const serverMsg = err?.error?.msg || err?.error || err?.message || JSON.stringify(err);
          alert('Error al iniciar sesión: ' + serverMsg + '\nURL: ' + url);
        }
      });
  }

  ngOnInit() { }
  
}
