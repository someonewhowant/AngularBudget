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

  // Custom modl signals
  isAddFundsOpen = signal(false);
  activeGoal = signal<SavingsGoal | null>(null);
  fundsAmount = signal<number>(0);

  isConfirmDeleteOpen = signal(false);
  goalToDelete = signal<number | null>(null);

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

  confirmDeleteGoal(id: number) {
    this.goalToDelete.set(id);
    this.isConfirmDeleteOpen.set(true);
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen.set(false);
    this.goalToDelete.set(null);
  }

  executeDeleteGoal() {
    const id = this.goalToDelete();
    if (id !== null) {
      this.store.deleteSavingsGoal(id);
      this.closeConfirmDelete();
    }
  }

  openAddFunds(goal: SavingsGoal) {
    this.activeGoal.set(goal);
    this.fundsAmount.set(0);
    this.isAddFundsOpen.set(true);
  }

  closeAddFunds() {
    this.isAddFundsOpen.set(false);
    this.activeGoal.set(null);
  }

  submitAddFunds() {
    const goal = this.activeGoal();
    const amount = this.fundsAmount();
    if (goal && amount > 0) {
      this.store.addToSavingsGoal(goal.id, amount);
      this.closeAddFunds();
    }
  }

  handleFundsInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fundsAmount.set(parseFloat(input.value) || 0);
  }

  getProgress(goal: SavingsGoal): number {
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }
}
