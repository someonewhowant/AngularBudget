import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonMenuButton, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonIcon, 
  IonList, 
  IonRadioGroup, 
  IonRadio, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonAlert,
  IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, colorPaletteOutline, warningOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { map } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonList,
    IonRadioGroup,
    IonRadio,
    IonGrid,
    IonRow,
    IonCol,
    IonAlert,
    IonNote
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SettingsComponent implements OnInit {
  public store = inject(StoreService);
  private fb = inject(FormBuilder);
  
  state$ = this.store.getState();
  
  profileForm: FormGroup = this.fb.group({
    name: ['', Validators.required]
  });

  themes = [
    { id: 'dark', name: 'Deep Space (Dark)', color: '#050505' },
    { id: 'light', name: 'Arctic (Light)', color: '#f0f2f5' },
    { id: 'blue', name: 'Cyber Ocean (Blue)', color: '#0a192f' },
    { id: 'purple', name: 'Midnight Purple', color: '#1a0b2e' }
  ];


  public alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
    },
    {
      text: 'Reset Everything',
      role: 'destructive',
      handler: () => {
        this.store.resetData();
      },
    },
  ];

  constructor() {
    addIcons({ personOutline, colorPaletteOutline, warningOutline, saveOutline, trashOutline });
  }

  ngOnInit(): void {
    this.state$.subscribe(state => {
      this.profileForm.patchValue({ name: state.user.name }, { emitEvent: false });
    });
  }

  handleProfileSubmit() {
    if (this.profileForm.valid) {
      this.store.updateProfile({ name: this.profileForm.value.name });
    }
  }

  handleThemeChange(event: any) {
    this.store.setTheme(event.detail.value);
  }
}
