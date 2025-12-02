import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'morir',
    loadComponent: () => import('./pages/morir/morir.page').then( m => m.MorirPage)
  },
  {
    path: 'tareas/alimentar',
    loadComponent: () => import('./pages/tareas/alimentar/alimentar.page').then( m => m.AlimentarPage)
  },
  {
    path: 'tareas/panal',
    loadComponent: () => import('./pages/tareas/panal/panal.page').then( m => m.PanalPage)
  },
  {
    path: 'tareas/banar',
    loadComponent: () => import('./pages/tareas/banar/banar.page').then( m => m.BanarPage)
  },
  {
    path: 'tareas/dormir',
    loadComponent: () => import('./pages/tareas/dormir/dormir.page').then( m => m.DormirPage)
  },
  {
    path: 'tareas/medicina',
    loadComponent: () => import('./pages/tareas/medicina/medicina.page').then( m => m.MedicinaPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then( m => m.RegistroPage)
  },
];
