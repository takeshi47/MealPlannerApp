import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  private csrfToken = '';

  form = this.fb.group({
    email: ['admin_test01@example.com', [Validators.required]],
    password: ['adminadmin', [Validators.required]],
  });

  ngOnInit(): void {
    this.authService.fetchCsrfToken().subscribe((csrfToken) => (this.csrfToken = csrfToken.token));
  }

  login(): void {
    if (this.form.invalid) {
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.authService
      .login({ email: email ?? '', password: password ?? '', csrfToken: this.csrfToken })
      .subscribe({
        error: (error) => {
          console.error(error);

          alert(error.error.message);
        },
      });
  }
}
