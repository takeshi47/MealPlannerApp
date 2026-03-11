import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Ingredient } from '../../../models/ingredient';
import { IngredientService } from '../../../services/ingredient-service';

export interface BackendFormErrors {
  [key: string]: BackendFormErrors;
}

@Component({
  selector: 'tr[app-ingredient-form]',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ingredient-form.html',
  styleUrl: './ingredient-form.scss',
})
export class IngredientForm implements OnInit {
  @Input() ingredient: Ingredient | null = null;
  @Input({ required: true }) csrfToken = '';

  @Output() cancelForm: EventEmitter<number | null> = new EventEmitter<number | null>();
  @Output() complete: EventEmitter<number | null> = new EventEmitter<number | null>();

  private ingredientService = inject(IngredientService);
  private fb = inject(NonNullableFormBuilder);
  private cdr = inject(ChangeDetectorRef);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(30)]],
    isStock: false,
  });

  protected errorMessages: BackendFormErrors | null = null;

  ngOnInit(): void {
    if (this.ingredient) {
      this.form.patchValue(this.ingredient);
    }
  }

  onSubmit(): void {
    const payload = {
      ...this.form.getRawValue(),
      _token: this.csrfToken,
    };

    if (this.ingredient?.id) {
      this.update(payload);
    } else {
      this.create(payload);
    }
  }

  cancel(): void {
    this.cancelForm.emit(this.ingredient?.id);
  }

  private create(payload: Partial<Ingredient> & { _token: string }): void {
    this.ingredientService.create(payload).subscribe({
      next: () => {
        this.complete.emit();
      },
      error: (error) => {
        this.errorMessages = error.error;
        this.cdr.markForCheck();
        console.log(this.errorMessages);
      },
    });
  }

  private update(payload: Partial<Ingredient> & { _token: string }): void {
    if (!this.ingredient?.id) {
      return;
    }

    this.ingredientService.edit(this.ingredient.id, payload).subscribe({
      next: () => {
        this.complete.emit(this.ingredient?.id);
      },
      error: (error) => {
        this.errorMessages = error.error;
        this.cdr.markForCheck();
        console.log(this.errorMessages);
      },
    });
  }
}
