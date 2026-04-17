import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { SavingsGoal } from '../../models/budget.models';
import { map } from 'rxjs';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './savings.html',
})
export class SavingsComponent implements OnInit {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);

  state$ = this.store.getState();
  savingsGoals$ = this.state$.pipe(map(s => s.savingsGoals));

  isModalOpen = false;
  editingGoal: SavingsGoal | null = null;

  goalForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    targetAmount: [0, [Validators.required, Validators.min(1)]],
    currentAmount: [0, [Validators.required, Validators.min(0)]],
    category: ['General', Validators.required]
  });

  ngOnInit(): void { }

  toggleModal(goal?: SavingsGoal) {
    this.isModalOpen = !this.isModalOpen;
    if (this.isModalOpen) {
      if (goal) {
        this.editingGoal = goal;
        this.goalForm.patchValue(goal);
      } else {
        this.editingGoal = null;
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
      if (this.editingGoal) {
        this.store.updateSavingsGoal({ ...this.editingGoal, ...goalData });
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
