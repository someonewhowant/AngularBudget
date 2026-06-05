import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { SavingsGoal } from '../../models/budget.models';

@Component({
  selector: 'app-savings',
  imports: [ReactiveFormsModule, SidebarComponent],
  templateUrl: './savings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingsComponent {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);

  savingsGoals = this.store.savingsGoals;

  isModalOpen = signal(false);
  editingGoal = signal<SavingsGoal | null>(null);

  goalForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    targetAmount: [0, [Validators.required, Validators.min(1)]],
    currentAmount: [0, [Validators.required, Validators.min(0)]],
    category: ['General', Validators.required]
  });

  toggleModal(goal?: SavingsGoal) {
    this.isModalOpen.update(open => !open);
    if (this.isModalOpen()) {
      if (goal) {
        this.editingGoal.set(goal);
        this.goalForm.patchValue(goal);
      } else {
        this.editingGoal.set(null);
        this.goalForm.reset({
          name: '',
          targetAmount: 0,
          currentAmount: 0,
          category: 'General'
        });
      }
    }
  }

  handleGoalSubmit() {
    if (this.goalForm.valid) {
      const goalData = this.goalForm.value;
      const currentEditingGoal = this.editingGoal();
      if (currentEditingGoal) {
        this.store.updateSavingsGoal({ ...currentEditingGoal, ...goalData });
      } else {
        this.store.addSavingsGoal(goalData);
      }
      this.toggleModal();
    }
  }

  deleteGoal(id: number) {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      this.store.deleteSavingsGoal(id);
    }
  }

  addFunds(goal: SavingsGoal) {
    const amount = prompt(`How much would you like to add to "${goal.name}"?`);
    if (amount && !isNaN(parseFloat(amount))) {
      this.store.addToSavingsGoal(goal.id, parseFloat(amount));
    }
  }

  getProgress(goal: SavingsGoal): number {
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }
}
