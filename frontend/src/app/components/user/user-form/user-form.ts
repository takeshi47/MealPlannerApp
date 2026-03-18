import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { UserService } from '../../../services/user-service';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';

function passwordMatcher(control: AbstractControl): ValidationErrors | null {
  const plainPassword = control.get('first');
  const confirmPassword = control.get('second');

  if (!plainPassword || !confirmPassword || plainPassword.value === confirmPassword.value) {
    return null;
  }

  return { passwordsMismatch: true };
}

export type BackendFormErrors = Record<string, string[]>;

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
})
export class UserForm implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private activatedRouter = inject(ActivatedRoute);
  private router = inject(Router);

  private csrfToken = '';
  private userId: number | null = null;

  protected isLoading = true;
  protected errorMessages: BackendFormErrors | null = null;
  protected allRoles = ['ROLE_USER', 'ROLE_ADMIN'];

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    plainPassword: this.fb.group(
      {
        first: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(16)]],
        second: [''],
      },
      { validators: passwordMatcher },
    ),
    displayName: [''],
    role: ['ROLE_USER', Validators.required],
  });

  ngOnInit(): void {
    this.userService.fetchCsrfToken().subscribe((csrfToken) => (this.csrfToken = csrfToken.token));
    this.activatedRouter.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');

          if (id) {
            this.userId = Number(id);

            return this.userService.getUser(this.userId);
          }

          return of(null);
        }),
      )
      .subscribe((user) => {
        this.isLoading = false;
        if (!user) {
          return;
        }

        // ★編集モードの場合、パスワードは必須でなくする
        this.form.get('plainPassword')?.get('first')?.clearValidators();
        this.form.get('plainPassword')?.get('first')?.updateValueAndValidity();

        this.form.patchValue(user);
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();

      return;
    }

    this.isLoading = true;
    this.errorMessages = null;

    if (this.userId) {
      this.update();
    } else {
      this.create();
    }
  }

  private create(): void {
    const payload = {
      ...this.form.getRawValue(),
      _token: this.csrfToken,
    };

    this.userService
      .create(payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['user/list']);
        },
        error: (error) => {
          this.errorMessages = error.error;
          this.cdr.markForCheck();
        },
      });
  }

  private update(): void {
    if (!this.isEditMode || !this.userId) {
      throw new Error('comatta');
    }

    const payload = {
      ...this.form.getRawValue(),
      _token: this.csrfToken,
    };

    this.userService
      .update(this.userId, payload)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['user/list']);
        },
        error: (error) => {
          this.errorMessages = error.error;
          this.cdr.markForCheck();
        },
      });
  }

  protected get isEditMode(): boolean {
    return this.userId !== null;
  }

  protected isInvalid(type: string): boolean {
    const targetForm = this.form.get(type) as FormControl;

    if (targetForm.invalid && (targetForm.dirty || targetForm.touched)) {
      return true;
    }
    if (this.errorMessages && this.errorMessages[type]) {
      return true;
    }

    return false;
  }
}
