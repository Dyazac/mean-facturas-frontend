import { bootstrapApplication } from '@angular/platform-browser'; //Arranca la app standlone sin un appmodule
import { provideHttpClient } from '@angular/common/http'; //enciende el HttpClient
import { AppComponent } from './app/app.component';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth'; //Arranca el autentificador de firebase

// Registro de ng2-charts / Chart.js
import { provideCharts, withDefaultRegisterables } from 'ng2-charts'; //Importador de graficos

import { environment } from './environments/firebase';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(), // Permite que los servicios realicen peticiones web
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),    
    provideCharts(withDefaultRegisterables()),
  ],
}).catch(console.error);