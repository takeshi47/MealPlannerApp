import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { IngredientService } from '../../../services/ingredient-service';
import { Ingredient } from '../../../models/ingredient';
import { CommonModule } from '@angular/common';
import { IngredientForm } from '../ingredient-form/ingredient-form';
import { IngredientListItem } from '../ingredient-list-item/ingredient-list-item';

@Component({
  selector: 'app-ingredient-list',
  imports: [CommonModule, IngredientForm, IngredientListItem],
  templateUrl: './ingredient-list.html',
  styleUrl: './ingredient-list.scss',
})
export class IngredientList implements OnInit {
  private ingredientService = inject(IngredientService);
  protected ingredients!: Ingredient[];
  private cdr = inject(ChangeDetectorRef);

  protected csrfToken = '';

  protected isAdd = false;
  protected editableIds: number[] = [];

  ngOnInit(): void {
    this.load();

    this.ingredientService.fetchCsrfToken().subscribe((token) => {
      this.csrfToken = token;
    });
  }

  protected load(): void {
    this.ingredientService.getIngredients().subscribe((i) => {
      this.ingredients = i;
      this.cdr.markForCheck();
    });
  }

  protected deleteIngredient(id: number): void {
    this.ingredients = this.ingredients.filter((i) => i.id !== id);
  }

  enableAdd(): void {
    this.isAdd = true;
  }

  cancelAdd(): void {
    this.isAdd = false;
  }

  completeEdit(id: number | null): void {
    if (!id) {
      return;
    }

    this.cancelEditing(id);
    this.load();
  }

  completeAdd(): void {
    this.cancelAdd();
    this.load();
  }

  cancelEditing(id: number | null): void {
    if (!id) {
      return;
    }

    this.editableIds = this.editableIds.filter((v) => v !== id);
  }

  enableEdit(id: number | null): void {
    if (!id) {
      return;
    }

    if (!this.editableIds.includes(id)) {
      this.editableIds.push(id);
    }
  }

  isEdit(targetId: number): boolean {
    return this.editableIds.includes(targetId);
  }
}
