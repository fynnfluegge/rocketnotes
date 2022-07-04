import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EditorComponent } from './component/editor/editor.component';
import { AuthGuard } from './component/auth/auth-guard.guard';
import { JwtInterceptor } from './component/auth/jwt-intercepter';
import { BasicRestService } from './service/rest/basic-rest.service';
import { PlatformModule } from '@angular/cdk/platform';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule } from '@angular/material/tree';
import { MarkdownModule } from 'ngx-markdown';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { SidenavComponent } from './component/navigation/sidenav.component';
import { LandingComponent } from './component/landing/landing.component';


@NgModule({
  declarations: [
    AppComponent,
    EditorComponent,
    SidenavComponent,
    LandingComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    PlatformModule,
    MatExpansionModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    MatButtonModule,
    MatTreeModule,
    DragDropModule,
    MarkdownModule.forRoot()
  ],
  providers: [
    AuthGuard,
    BasicRestService,
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
