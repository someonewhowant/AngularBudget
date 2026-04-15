import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonButtons, 
  IonMenuButton, 
  IonModal, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonSelect, 
  IonSelectOption, 
  IonButton, 
  IonIcon, 
  IonList, 
  IonItemSliding, 
  IonItemOptions, 
  IonItemOption, 
  IonSearchbar, 
  IonRadioGroup, 
  IonRadio,
  IonNote,
  IonGrid,
  IonRow,
  IonCol,
  IonFab,
  IonFabButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, searchOutline, filterOutline } from 'ionicons/icons';
import { map, BehaviorSubject, combineLatest } from 'rxjs';
import { Transaction } from '../../models/budget.models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonMenuButton,
    IonModal,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonList,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSearchbar,
    IonRadioGroup,
    IonRadio,
    IonNote,
    IonGrid,
    IonRow,
    IonCol,
    IonFab,
    IonFabButton
  ],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css'
})
export class TransactionsComponent implements OnInit {
  public store = inject(StoreService);
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

  constructor() {
    addIcons({ addOutline, trashOutline, searchOutline, filterOutline });
  }

  ngOnInit(): void {}

  handleSearch(event: any) {
    this.searchQuery$.next(event.detail.value || '');
  }

  handleFilter(event: any) {
    this.filterCategory$.next(event.detail.value);
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (!isOpen) {
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
      this.setOpen(false);
    }
  }

  handleDelete(id: number) {
    this.store.deleteTransaction(id);
  }
}
