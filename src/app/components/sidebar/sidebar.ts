import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { 
  IonMenu, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonList, 
  IonItem, 
  IonIcon, 
  IonLabel,
  IonMenuToggle
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gridOutline, 
  walletOutline, 
  swapHorizontalOutline, 
  pieChartOutline, 
  settingsOutline,
  rocketOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink, 
    RouterLinkActive,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonMenuToggle
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  constructor() {
    addIcons({ 
      gridOutline, 
      walletOutline, 
      swapHorizontalOutline, 
      pieChartOutline, 
      settingsOutline,
      rocketOutline
    });
  }
}
