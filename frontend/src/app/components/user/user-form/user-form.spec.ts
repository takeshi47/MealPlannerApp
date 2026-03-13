import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserForm } from './user-form';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { UserService } from '../../../services/user-service';
import { Observable, of, Subscriber } from 'rxjs';
import { FormControl } from '@angular/forms';

describe('UserForm', () => {
  let component: UserForm;
  let fixture: ComponentFixture<UserForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(UserForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('コンポーネントが作成されること', () => {
    expect(component).toBeTruthy();
  });

  describe('初期化テスト', () => {
    it('フォームが初期化されること', () => {
      expect(component.form).toBeDefined();
      expect(component.form.get('email')).toBeDefined();
      expect(component.form.get('role')).toBeDefined();
    });

    it('role のデフォルト値が ROLE_USER であること', () => {
      expect(component.form.get('role')?.value).toBe('ROLE_USER');
    });

    it('新規作成モード（URLにIDがない場合）で正しく初期化されること', () => {
      const userService = TestBed.inject(UserService);

      const fetchCsrfSpy = spyOn(userService, 'fetchCsrfToken').and.returnValue(
        of({ token: 'test-token' }),
      );
      const getUserSpy = spyOn(userService, 'getUser');

      component.ngOnInit();

      expect(component['userId']).toBeNull();
      expect(component['isEditMode']).toBeFalsy();

      expect(fetchCsrfSpy).toHaveBeenCalled(); // トークン取得は呼ばれていること
      expect(getUserSpy).not.toHaveBeenCalled(); // ユーザー取得は呼ばれていないこと

      expect(component.form.get('email')?.value).toBe('');
      expect(component.form.get('displayName')?.value).toBe('');
    });
    it('編集モード（URLにIDがある場合）で既存データがフォームにセットされること', () => {
      const userService = TestBed.inject(UserService);
      const route = TestBed.inject(ActivatedRoute);

      spyOnProperty(route, 'paramMap', 'get').and.returnValue(of(convertToParamMap({ id: '123' })));

      const mockUser = {
        id: 123,
        email: 'edit-test@example.com',
        displayName: '',
        role: 'ROLE_ADMIN',
        lastLoggedInAt: null,
      };

      const getUserSpy = spyOn(userService, 'getUser').and.returnValue(of(mockUser));
      spyOn(userService, 'fetchCsrfToken').and.returnValue(of({ token: 'test-token' }));

      component.ngOnInit();

      expect(component['userId']).toBe(123);
      expect(component['isEditMode']).toBeTrue();
      expect(getUserSpy).toHaveBeenCalledWith(123);

      const form = component.form;

      expect(form.get('email')?.value).toBe(mockUser.email);
      expect(form.get('displayName')?.value).toBe(mockUser.displayName);
      expect(form.get('role')?.value).toBe(mockUser.role);

      expect(form.valid);
    });

    it('初期化時にCSRFトークンが取得されること', () => {
      const userService = TestBed.inject(UserService);

      const testToken = 'test-csrf-token-12345';
      const mockResponse = { token: testToken };
      const fetchCsrfSpy = spyOn(userService, 'fetchCsrfToken').and.returnValue(of(mockResponse));

      component.ngOnInit();

      expect(fetchCsrfSpy).toHaveBeenCalled();
      expect(component['csrfToken']).toBe(testToken);
    });
  });

  fdescribe('バリデーションテスト', () => {
    it('email が空の場合、required エラーになること', () => {
      const email = component.form.get('email');
      email?.setValue('');
      expect(email?.valid).toBeFalsy();
      expect(email?.errors?.['required']).toBeTruthy();
    });

    it('email に不正な形式を入力した場合、email エラーになること', () => {
      // TODO: 実装
    });

    it('パスワード（first）が空の場合、required エラーになること', () => {
      // TODO: 実装
    });

    it('パスワード（first）と確認用（second）が一致しない場合、フォーム全体が不正になること', () => {
      // TODO: 実装
    });

    it('role が選択されていない場合、required エラーになること', () => {
      // TODO: 実装
    });
  });

  describe('アクションテスト', () => {
    it('フォームが不正な状態で onSubmit が呼ばれた場合、保存処理が実行されないこと', () => {
      spyOn(window, 'alert');
      component.form.get('email')?.setValue('');
      component.onSubmit();
      expect(window.alert).not.toHaveBeenCalled();
      expect(component.form.invalid).toBeTruthy();
    });

    it('新規作成時に有効な入力があれば UserService.create が呼ばれること', () => {
      // TODO: 実装
    });

    it('編集時に有効な入力があれば UserService.update が呼ばれること', () => {
      // TODO: 実装
    });

    it('保存成功後、ユーザー一覧画面へ遷移すること', () => {
      // TODO: 実装
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('サーバーエラー時に errorMessages が表示されること', () => {
      const userService = TestBed.inject(UserService);
      const mockError = { error: { email: { error: 'このメールアドレスは既に使用されています' } } };
      spyOn(userService, 'create').and.returnValue(
        new Observable((subscriber: Subscriber<Record<string, string[]>>) =>
          subscriber.error(mockError),
        ),
      );

      (component.form.get('email') as FormControl<string | null>).setValue('test@example.com');
      (component.form.get('plainPassword')?.get('first') as FormControl<string | null>).setValue(
        'password',
      );
      (component.form.get('plainPassword')?.get('second') as FormControl<string | null>).setValue(
        'password',
      );
      component.onSubmit();
      fixture.detectChanges();

      expect(component['errorMessages']).not.toBeNull();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('このメールアドレスは既に使用されています');
    });

    it('パスワード以外のエラーメッセージもテンプレート上に正しく表示されること', () => {
      // TODO: 実装
    });
  });
});
