import { Component, OnInit, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, SidebarComponent],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent implements OnInit {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  
  state = this.store.state;
  currencies = this.store.currencies;

  isConfirmResetOpen = signal(false);
  
  profileForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    currency: ['USD', Validators.required]
  });

  themes = [
    { id: 'dark', name: 'Deep Space (Dark)', color: '#050505' },
    { id: 'light', name: 'Arctic (Light)', color: '#f0f2f5' },
    { id: 'blue', name: 'Cyber Ocean (Blue)', color: '#0a192f' }
  ];

  ngOnInit(): void {
    const user = this.store.user();
    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        currency: user.currency || 'USD'
      }, { emitEvent: false });
    }
  }

  handleProfileSubmit() {
    if (this.profileForm.valid) {
      this.store.updateProfile({
        name: this.profileForm.value.name,
        currency: this.profileForm.value.currency
      });
      this.toastService.show('Profile updated successfully!', 'success');
    }
  }

  handleThemeChange(themeId: string) {
    this.store.setTheme(themeId);
    this.toastService.show(`Theme changed to ${themeId}!`, 'info');
  }

  confirmReset() {
    this.isConfirmResetOpen.set(true);
  }

  closeConfirmReset() {
    this.isConfirmResetOpen.set(false);
  }

  executeReset() {
    this.store.resetData();
    this.closeConfirmReset();
    this.toastService.show('All application data has been reset.', 'info');
  }
}
