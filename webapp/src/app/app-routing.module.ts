import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EditorComponent } from './component/editor/editor.component';
import { AuthGuard } from './component/auth/auth-guard.guard'
import { AppComponent } from './app.component';
import { SidenavComponent } from './component/sidenav/sidenav.component';
import { LandingComponent } from './component/landing/landing.component';

const routes: Routes = [
  { path: 'app/:id', component: SidenavComponent, canActivate: [AuthGuard] },
  { path: 'app', component: SidenavComponent, canActivate: [AuthGuard] },
  { path: 'logout', component: LandingComponent },
  { path: '', component: LandingComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule { }
