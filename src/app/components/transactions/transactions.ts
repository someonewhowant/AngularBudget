import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { map, BehaviorSubject, combineLatest } from 'rxjs';
import { Transaction } from '../../models/budget.models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './transactions.html',
})
export class TransactionsComponent implements OnInit {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);
  
  state$ = this.store.getState();
  summary$ = this.store.getSummary$();
  
  private searchQuery$ = new BehaviorSubject<string>('');
  private filterCategory$ = new BehaviorSubject<string>('all');
  
  filteredTransactions$ = combineLatest([
    this.state$.pipe(map(s => s.transactions)),
    this.searchQuery$,
    this.filterCategory$
  ]).pipe(
    map(([transactions, query, category]) => {
      return transactions.filter(t => {
        const matchesSearch = t.vendor.toLowerCase().includes(query.toLowerCase()) || 
                              t.category.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === 'all' || t.category === category;
        return matchesSearch && matchesCategory;
      });
    })
  );

  progress$ = this.summary$.pipe(
    map(summary => summary.income > 0 ? (summary.expense / summary.income) * 100 : 0)
  );

  isModalOpen = false;
  transactionForm: FormGroup = this.fb.group({
    vendor: ['', Validators.required],
    category: ['Food', Validators.required],
    account: ['Visa Card', Validators.required],
    date: [new Date().toISOString().split('T')[0], Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    type: ['expense', Validators.required]
  });

  ngOnInit(): void {}

  handleSearch(event: any) {
    this.searchQuery$.next(event.target.value);
  }

  handleFilter(event: any) {
    this.filterCategory$.next(event.target.value);
  }

  toggleModal() {
    this.isModalOpen = !this.isModalOpen;
    if (!this.isModalOpen) {
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
