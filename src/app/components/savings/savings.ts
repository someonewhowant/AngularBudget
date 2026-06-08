import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { SavingsGoal } from '../../models/budget.models';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-savings',
  imports: [ReactiveFormsModule, SidebarComponent],
  templateUrl: './savings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingsComponent {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  savingsGoals = this.store.savingsGoals;
  currencySymbol = this.store.currencySymbol;
  expenseCategories = this.store.expenseCategories;

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
    category: ['General', Validators.required],
    deadline: ['']
  });

  isLinkModalOpen = signal(false);
  activeLinkGoal = signal<SavingsGoal | null>(null);
  linkForm: FormGroup = this.fb.group({
    linkedBudgetCategories: [[]]
  });

  toggleModal(goal?: SavingsGoal) {
    this.isModalOpen.update(open => !open);
    if (this.isModalOpen()) {
      if (goal) {
        this.editingGoal.set(goal);
        this.goalForm.patchValue({
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          category: goal.category,
          deadline: goal.deadline || ''
        });
      } else {
        this.editingGoal.set(null);
        this.goalForm.reset({
          name: '',
          targetAmount: 0,
          currentAmount: 0,
          category: 'General',
          deadline: ''
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
        this.toastService.show('Savings goal updated successfully!', 'success');
      } else {
        this.store.addSavingsGoal(goalData);
        this.toastService.show('Savings goal created successfully!', 'success');
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
      this.toastService.show('Savings goal deleted successfully!', 'success');
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
      this.toastService.show(`Successfully added ${this.currencySymbol()}${amount} to ${goal.name}!`, 'success');
    }
  }

  handleFundsInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.fundsAmount.set(parseFloat(input.value) || 0);
  }

  openLinkModal(goal: SavingsGoal) {
    this.activeLinkGoal.set(goal);
    this.linkForm.patchValue({
      linkedBudgetCategories: goal.linkedBudgetCategories || []
    });
    this.isLinkModalOpen.set(true);
  }

  closeLinkModal() {
    this.isLinkModalOpen.set(false);
    this.activeLinkGoal.set(null);
  }

  submitLinkModal() {
    const goal = this.activeLinkGoal();
    if (goal) {
      const linkedBudgetCategories = this.linkForm.value.linkedBudgetCategories || [];
      this.store.updateSavingsGoal({ ...goal, linkedBudgetCategories });
      this.closeLinkModal();
      this.toastService.show('Auto-fund rules updated successfully!', 'success');
    }
  }

  getProgress(goal: SavingsGoal): number {
    return Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
  }

  getGoalDeadlineInfo(goal: SavingsGoal) {
    if (!goal.deadline) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(goal.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (goal.currentAmount >= goal.targetAmount) {
      return { status: 'completed', text: 'Goal achieved! 🎉', alert: false, monthlyRate: 0, weeklyRate: 0 };
    }
    
    if (daysDiff < 0) {
      return { status: 'overdue', text: 'Deadline passed', alert: true, monthlyRate: 0, weeklyRate: 0 };
    }
    
    if (daysDiff === 0) {
      return { status: 'due-today', text: 'Due today! ⚠️', alert: true, monthlyRate: 0, weeklyRate: 0 };
    }
    
    const needed = goal.targetAmount - goal.currentAmount;
    const monthsRemaining = daysDiff / 30.436875;
    const weeksRemaining = daysDiff / 7;
    
    const monthlyRate = monthsRemaining > 0 ? needed / monthsRemaining : needed;
    const weeklyRate = weeksRemaining > 0 ? needed / weeksRemaining : needed;
    
    let timeText = '';
    if (daysDiff > 30) {
      const months = Math.floor(daysDiff / 30.436875);
      const remainingDays = Math.round(daysDiff % 30.436875);
      if (months > 0) {
        timeText = `${months}m ${remainingDays}d left`;
      } else {
        timeText = `${daysDiff} days left`;
      }
    } else {
      timeText = `${daysDiff} days left`;
    }
    
    return {
      status: 'active',
      text: timeText,
      monthlyRate,
      weeklyRate,
      daysLeft: daysDiff,
      alert: daysDiff <= 14
    };
  }
}
