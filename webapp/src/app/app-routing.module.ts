import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './component/auth/auth-guard.guard'
import { SidenavComponent } from './component/navigation/sidenav.component';
import { LandingComponent } from './component/landing/landing.component';

const routes: Routes = [
  { path: ':id', component: SidenavComponent, canActivate: [AuthGuard] },
  { path: '', component: SidenavComponent, canActivate: [AuthGuard] },
  { path: 'logout', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule { }
