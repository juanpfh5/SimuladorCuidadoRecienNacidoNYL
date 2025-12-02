import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class RegistroPage implements OnInit {

  nombre = '';
  edad: number | null = null;
  curp = '';

  // Cambia aquí la URL si tu backend corre en otro puerto/host
  private API_URL = 'http://localhost:3000';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {}

  registrar() {
    if (!this.nombre || !this.edad || !this.curp) {
      alert('Por favor completa todos los campos.');
      return;
    }

    const payload = {
      curp: this.curp,
      nombre: this.nombre,
      edad: this.edad,
      bebe_vivo: true
    };

    this.http.post(`${this.API_URL}/registro`, payload)
      .subscribe({
        next: () => {
          alert('Registro exitoso');
          this.router.navigate(['/login']);
        },
        error: err => {
          console.error('Error al registrar:', err);
          alert('Error al registrar. CURP ya existente o datos inválidos');
        }
      });
  }
}
