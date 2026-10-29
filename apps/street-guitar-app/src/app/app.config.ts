import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';

// Initialize Firebase before any service uses it
initializeApp(environment.firebase);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // path URLs (no #/); fragments like /#pricing scroll to their section
    provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
  ],
};
