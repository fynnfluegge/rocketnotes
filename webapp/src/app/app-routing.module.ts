import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './component/auth/auth-guard.guard';
import { SidenavComponent } from './component/navigation/sidenav.component';
import { PublicDocumentViewerComponent } from './component/public-document-viewer/public-document-viewer.component';

const routes: Routes = [
  {
    path: 'zettelkasten',
    component: SidenavComponent,
    canActivate: [AuthGuard],
  },
  { path: ':id', component: SidenavComponent, canActivate: [AuthGuard] },
  { path: '', component: SidenavComponent, canActivate: [AuthGuard] },
  { path: 'shared/:id', component: PublicDocumentViewerComponent },
  { path: 'logout', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [],
})
export class AppRoutingModule {}
