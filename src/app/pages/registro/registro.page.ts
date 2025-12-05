import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { arrowBackOutline } from 'ionicons/icons';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule]
})
export class RegistroPage implements OnInit {

  nombre = '';
  edad: number | null = null;
  curp = '';

  // Cambia aquí la URL si tu backend corre en otro puerto/host
  private API_URL = environment.API_URL;

  constructor(private http: HttpClient, private router: Router) {}

  // Expose the icon data to the template to avoid runtime asset URL resolution
  arrowBackIcon = arrowBackOutline;

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

  // Prevent entering '-' or scientific notation etc. Allow only digits in the age field
  onNumberKey(event: KeyboardEvent) {
    const forbidden = ['-', '+', 'e', 'E'];
    if (forbidden.includes(event.key)) {
      event.preventDefault();
    }
  }

  // Sanitize pasted content into the edad field: keep digits only
  onPasteNumber(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text') || '';
    const digits = text.replace(/\D+/g, '');
    if (!digits) {
      // If no digits, prevent the paste entirely
      event.preventDefault();
      this.edad = null;
    } else {
      event.preventDefault();
      this.edad = Number(digits);
    }
  }
}
