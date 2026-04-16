import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/angular/standalone';
import { SidebarComponent } from './components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, IonSplitPane, SidebarComponent],
  template: `
    <ion-app>
      <ion-split-pane contentId="main-content">
        <app-sidebar></app-sidebar>
        <ion-router-outlet id="main-content"></ion-router-outlet>
      </ion-split-pane>
    </ion-app>
  `,
})
export class AppComponent {}
