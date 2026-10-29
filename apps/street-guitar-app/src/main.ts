import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// The app used hash URLs (/#/learn?x=1). Referral links and Stripe redirects in the wild still
// do, so rewrite them to the path URL (/learn?x=1) before the router reads the address.
if (location.hash.startsWith('#/')) {
  history.replaceState(null, '', new URL(location.hash.slice(2), document.baseURI).href);
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
