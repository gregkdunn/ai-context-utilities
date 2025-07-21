import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';
import { WebviewService } from './app/services/webview.service';
import { ToastNotificationService } from './app/components/toast-notification/toast-notification.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    WebviewService,
    ToastNotificationService
  ]
}).catch(err => console.error(err));
