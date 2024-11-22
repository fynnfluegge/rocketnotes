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
import { BasicRestService } from './service/basic-rest.service';
import { PlatformModule } from '@angular/cdk/platform';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatTreeModule } from '@angular/material/tree';
import { MarkdownModule } from 'ngx-markdown';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SidenavComponent } from './component/navigation/sidenav.component';
import { PublicDocumentViewerComponent } from './component/public-document-viewer/public-document-viewer.component';
import { LlmDialogComponent } from './component/dialog-llm/llm-dialog.component';
import { ConfigDialogComponent } from './component/dialog-config/config-dialog.component';
import { ZettelkastenComponent } from './component/zettelkasten/zettelkasten.component';
import { AudioRecordingService } from './service/audio-recording.service';

@NgModule({
  declarations: [
    AppComponent,
    EditorComponent,
    SidenavComponent,
    PublicDocumentViewerComponent,
    LlmDialogComponent,
    ConfigDialogComponent,
    ZettelkastenComponent,
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
    MatButtonModule,
    MatTreeModule,
    DragDropModule,
    MarkdownModule.forRoot(),
  ],
  providers: [
    AuthGuard,
    BasicRestService,
    AudioRecordingService,
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
