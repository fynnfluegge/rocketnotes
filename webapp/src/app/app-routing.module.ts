import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './component/dashboard/dashboard.component';
import { AuthGuard } from './component/auth/auth-guard.guard'
import { AppComponent } from './app.component';

const routes: Routes = [
  { path: 'dashboard/:id', component: DashboardComponent, canActivate: [AuthGuard] },
  // { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'logout', component: AppComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule { }
