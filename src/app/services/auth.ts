import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private CURP_KEY = 'curp';

  setCurp(curp: string | null) {
    if (curp) {
      localStorage.setItem(this.CURP_KEY, curp);
    } else {
      localStorage.removeItem(this.CURP_KEY);
    }
  }

  getCurp(): string | null {
    return localStorage.getItem(this.CURP_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getCurp();
  }

  clear() {
    this.setCurp(null);
  }
}
