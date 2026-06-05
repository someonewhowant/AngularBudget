import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, SidebarComponent],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  
  state = this.store.state;
  
  profileForm: FormGroup = this.fb.group({
    name: ['', Validators.required]
  });

  themes = [
    { id: 'dark', name: 'Deep Space (Dark)', color: '#050505' },
    { id: 'light', name: 'Arctic (Light)', color: '#f0f2f5' },
    { id: 'blue', name: 'Cyber Ocean (Blue)', color: '#0a192f' }
  ];

  ngOnInit(): void {
    const user = this.store.user();
    if (user) {
      this.profileForm.patchValue({ name: user.name }, { emitEvent: false });
    }
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
