import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';

// Initialize Firebase before any service uses it
initializeApp(environment.firebase);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withHashLocation()),
  ],
};
