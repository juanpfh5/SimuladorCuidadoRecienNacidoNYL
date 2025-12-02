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


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class LoginPage implements OnInit {
  curp = '';

  constructor(private http: HttpClient, private router: Router, private auth: Auth) {}

  login() {
    this.http.post('http://localhost:3000/login', { curp: this.curp })
      .subscribe({
        next: (res: any) => {
          console.log('Login correcto', res);
          this.auth.setCurp(this.curp);
          this.router.navigate(['/home']);
        },
        error: () => {
          alert('CURP incorrecta o no registrada');
        }
      });
  }

  ngOnInit() {}
}
