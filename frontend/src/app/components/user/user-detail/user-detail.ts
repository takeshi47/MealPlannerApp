import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { UserService } from '../../../services/user-service';
import { Observable, switchMap, tap } from 'rxjs';
import { User } from '../../../models/user';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
})
export class UserDetail implements OnInit {
  private activatedRouter = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);

  private _csrfTokenDelete: string | null = null;

  user$!: Observable<User>;

  ngOnInit(): void {
    this.user$ = this.activatedRouter.paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        return this.userService.getUser(id);
      }),
      tap((user) => {
        if (user.id) {
          this.userService.fetchCsrfTokenDelete(user.id).subscribe((token) => {
            this._csrfTokenDelete = token;
            this.cdr.markForCheck();
          });
        }
      }),
    );
  }

  protected deleteUser(id: number): void {
    if (!this.csrfTokenDelete) {
      return;
    }

    if (!confirm('本当に削除していいですか？')) {
      return;
    }

    this.userService.delete(id, this.csrfTokenDelete).subscribe({
      next: () => {
        alert('削除したよ！');
        this.router.navigate(['user/list']);
      },
      error: (error) => {
        console.error(error);
        alert(error.message);
      },
    });
  }

  protected get csrfTokenDelete(): string | null {
    return this._csrfTokenDelete;
  }
}
