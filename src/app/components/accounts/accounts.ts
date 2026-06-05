import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { Account } from '../../models/budget.models';

@Component({
  selector: 'app-accounts',
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './accounts.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountsComponent {
  private store = inject(StoreService);
  private fb = inject(FormBuilder);

  accounts = this.store.accounts;
  accountsWithBalance = this.store.accountsWithBalance;

  isModalOpen = signal(false);
  editingAccount = signal<Account | null>(null);

  isConfirmDeleteOpen = signal(false);
  accountToDelete = signal<string | null>(null);

  accountForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    type: ['checking', Validators.required],
    initialBalance: [0, [Validators.required, Validators.min(0)]]
  });

  toggleModal(account?: Account) {
    this.isModalOpen.update(open => !open);
    if (this.isModalOpen()) {
      if (account) {
        this.editingAccount.set(account);
        this.accountForm.patchValue({
          name: account.name,
          type: account.type,
          initialBalance: account.initialBalance
        });
      } else {
        this.editingAccount.set(null);
        this.accountForm.reset({
          name: '',
          type: 'checking',
          initialBalance: 0
        });
      }
    }
  }

  handleAccountSubmit() {
    if (this.accountForm.valid) {
      const accountData = this.accountForm.value;
      const currentEditing = this.editingAccount();
      if (currentEditing) {
        this.store.updateAccount({ ...currentEditing, ...accountData });
      } else {
        this.store.addAccount(accountData);
      }
      this.toggleModal();
    }
  }

  confirmDeleteAccount(id: string) {
    this.accountToDelete.set(id);
    this.isConfirmDeleteOpen.set(true);
  }

  closeConfirmDelete() {
    this.isConfirmDeleteOpen.set(false);
    this.accountToDelete.set(null);
  }

  executeDeleteAccount() {
    const id = this.accountToDelete();
    if (id !== null) {
      this.store.deleteAccount(id);
      this.closeConfirmDelete();
    }
  }

  getAccountTypeIcon(type: string): string {
    switch (type) {
      case 'checking': return 'fa-university';
      case 'savings': return 'fa-piggy-bank';
      case 'credit': return 'fa-credit-card';
      case 'cash': return 'fa-coins';
      default: return 'fa-wallet';
    }
  }
}
