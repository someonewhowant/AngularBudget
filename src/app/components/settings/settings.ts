import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { map } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent],
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
    { id: 'blue', name: 'Cyber Ocean (Blue)', color: '#0a192f' }
  ];

  ngOnInit(): void {
    this.state$.subscribe(state => {
      this.profileForm.patchValue({ name: state.user.name }, { emitEvent: false });
    });
  }

  handleProfileSubmit() {
    if (this.profileForm.valid) {
      this.store.updateProfile({ name: this.profileForm.value.name });
      alert('Profile updated successfully!');
    }
  }

  handleThemeChange(themeId: string) {
    this.store.setTheme(themeId);
  }

  handleReset() {
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      this.store.resetData();
    }
  }
}
