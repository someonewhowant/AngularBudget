import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { Transaction } from '../../models/budget.models';
import { TransactionAmountPipe } from '../../pipes/transaction-amount.pipe';

@Component({
  selector: 'app-transactions',
  imports: [ReactiveFormsModule, SidebarComponent, TransactionAmountPipe],
  templateUrl: './transactions.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsComponent {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);

  summary = this.store.summary;

  searchQuery = signal('');
  filterCategory = signal('all');

  filteredTransactions = computed(() => {
    const transactions = this.store.transactions();
    const query = this.searchQuery().toLowerCase();
    const category = this.filterCategory();

    return transactions.filter(t => {
      const matchesSearch = t.vendor.toLowerCase().includes(query) || 
                            t.category.toLowerCase().includes(query);
      const matchesCategory = category === 'all' || t.category === category;
      return matchesSearch && matchesCategory;
    });
  });

  progress = computed(() => {
    const s = this.store.summary();
    return s.income > 0 ? (s.expense / s.income) * 100 : 0;
  });

  isModalOpen = signal(false);
  
  transactionForm: FormGroup = this.fb.group({
    vendor: ['', Validators.required],
    category: ['Food', Validators.required],
    account: ['Visa Card', Validators.required],
    date: [new Date().toISOString().split('T')[0], Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['expense', Validators.required]
  });

  handleSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  handleFilter(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterCategory.set(select.value);
  }

  toggleModal() {
    this.isModalOpen.update(open => !open);
    if (!this.isModalOpen()) {
      this.transactionForm.reset({
        category: 'Food',
        account: 'Visa Card',
        date: new Date().toISOString().split('T')[0],
        type: 'expense'
      });
    }
  }

  handleSubmit() {
    if (this.transactionForm.valid) {
      const formValue = this.transactionForm.value;
      const newTransaction: Transaction = {
        id: Date.now(),
        ...formValue
      };
      
      this.store.addTransaction(newTransaction);
      this.toggleModal();
    }
  }

  handleDelete(id: number) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.store.deleteTransaction(id);
    }
  }
}
