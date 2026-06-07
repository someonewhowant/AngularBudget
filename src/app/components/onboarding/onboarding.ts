import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-onboarding',
  imports: [CommonModule],
  template: `
    @if (isVisible()) {
      <div class="modal-overlay active" style="z-index: 10000; align-items: center; justify-content: center; display: flex; backdrop-filter: blur(15px);">
        <div class="modal-container" style="max-width: 500px; width: 100%; position: relative; overflow: hidden; padding: 0; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <div class="onboarding-header" style="background: var(--accent-gradient); padding: 50px 30px 40px; text-align: center;">
            <i [class]="'fas ' + currentStep().icon" style="font-size: 4rem; color: white; margin-bottom: 20px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));"></i>
            <h2 style="color: white; font-size: 1.8rem; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">{{ currentStep().title }}</h2>
          </div>

          <div style="padding: 40px 30px;">
            <p style="font-size: 1.05rem; color: var(--text-dim); line-height: 1.6; margin-bottom: 40px; text-align: center; min-height: 75px;">
              {{ currentStep().description }}
            </p>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="step-indicators" style="display: flex; gap: 8px;">
                @for (step of steps; track $index; let idx = $index) {
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--border-glass); transition: var(--transition); display: flex; align-items: center; justify-content: center; cursor: pointer;" (click)="goToStep(idx)">
                    @if (currentStepIndex() === idx) {
                      <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--primary-blue); box-shadow: 0 0 8px var(--primary-blue);"></div>
                    }
                  </div>
                }
              </div>
              
              <div style="display: flex; gap: 10px;">
                @if (currentStepIndex() > 0) {
                  <button class="btn-primary" (click)="prevStep()" style="background: rgba(255,255,255,0.05); color: var(--text-main); border: 1px solid var(--border-glass); box-shadow: none;">Back</button>
                }
                @if (currentStepIndex() < steps.length - 1) {
                  <button class="btn-primary" (click)="nextStep()">Next</button>
                } @else {
                  <button class="btn-primary" (click)="finishOnboarding()" style="background: var(--success-green); color: #fff;">Get Started</button>
                }
              </div>
            </div>
          </div>
          
          <button (click)="finishOnboarding()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: rgba(255,255,255,0.6); font-size: 1.5rem; cursor: pointer; transition: color 0.3s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">&times;</button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingComponent {
  private store = inject(StoreService);

  steps: OnboardingStep[] = [
    {
      title: "Welcome to Angular Budget!",
      description: "Your premium, privacy-first personal finance manager. Let's take a quick tour to see how to get the most out of your money.",
      icon: "fa-rocket"
    },
    {
      title: "Smart Dashboard Insights",
      description: "The dashboard gives you a bird's-eye view of your finances. Our AI-like insights engine will automatically analyze your spending and warn you about low balances or over-budget categories.",
      icon: "fa-robot"
    },
    {
      title: 'Track Transactions Easily',
      description: 'Log your income and expenses instantly. You can now edit any past transactions directly—our reactive store will instantly recalculate all your balances.',
      icon: 'fa-exchange-alt'
    },
    {
      title: 'Budgets & Savings Goals',
      description: 'Create strict spending limits for categories, and set long-term savings goals. You can directly fund your goals and watch the progress bar fill up!',
      icon: 'fa-bullseye'
    },
    {
      title: 'Interactive Reports',
      description: 'Dive deep into your data using dynamic charts. Filter by any custom date range, specific account, or category to see exactly where your money is going.',
      icon: 'fa-chart-pie'
    },
    {
      title: 'Advanced Settings & Backups',
      description: 'Customize your default currency, switch between premium glassmorphic themes (like Cyber Ocean or Sleek Obsidian), and easily export your data as a backup JSON file.',
      icon: 'fa-cogs'
    }
  ];

  currentStepIndex = signal(0);
  
  isVisible = computed(() => {
    return !this.store.user().hasCompletedOnboarding;
  });

  currentStep = computed(() => this.steps[this.currentStepIndex()]);

  nextStep() {
    if (this.currentStepIndex() < this.steps.length - 1) {
      this.currentStepIndex.update(i => i + 1);
    }
  }

  prevStep() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(i => i - 1);
    }
  }

  goToStep(index: number) {
    this.currentStepIndex.set(index);
  }

  finishOnboarding() {
    this.store.updateProfile({ hasCompletedOnboarding: true });
  }
}
