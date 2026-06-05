import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
    
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div class="toast-card" [class]="toast.type" (click)="removeToast(toast.id)">
          <div class="toast-icon">
            @if (toast.type === 'success') {
              <i class="fas fa-check-circle"></i>
            } @else if (toast.type === 'error') {
              <i class="fas fa-exclamation-circle"></i>
            } @else {
              <i class="fas fa-info-circle"></i>
            }
          </div>
          <div class="toast-message">{{toast.message}}</div>
          <button class="toast-close" (click)="$event.stopPropagation(); removeToast(toast.id)">&times;</button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private toastService = inject(ToastService);
  toasts = this.toastService.toasts;

  removeToast(id: number) {
    this.toastService.remove(id);
  }
}
