import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackendFormErrors, UserForm } from './user-form';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { UserService } from '../../../services/user-service';
import { of, throwError } from 'rxjs';
import { FormControl } from '@angular/forms';

/**
 * 要素が DOM 上に存在し、かつ display: none でないことを確認する
 */
const isVisible = (el: HTMLElement | null): boolean => {
  if (!el) return false;
  // ブラウザの計算済みスタイルを取得して display をチェックする
  return window.getComputedStyle(el).display !== 'none';
};

describe('UserForm', () => {
  let component: UserForm;
  let fixture: ComponentFixture<UserForm>;
  const errorMessageClass = '.invalid-feedback';

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

  describe('バリデーションテスト', () => {
    it('フォームが不正な場合、isInvalid() が true を返すこと', () => {
      const emailForm = component.form.get('email');
      const passwordForm = component.form.get('plainPassword.first');

      emailForm?.setValue('');
      emailForm?.markAsTouched();

      passwordForm?.setValue('');
      passwordForm?.markAsTouched();

      fixture.detectChanges();

      expect(component['isInvalid']('email')).toBeTrue();
      expect(component['isInvalid']('plainPassword.first')).toBeTrue();
    });

    it('email が空の場合、required エラーになること', () => {
      const email = component.form.get('email');
      email?.setValue('');
      expect(email?.valid).toBeFalsy();
      expect(email?.errors?.['required']).toBeTruthy();
    });

    it('email に不正な形式を入力した場合、email エラーになること', () => {
      const emailForm = component.form.get('email');
      const emailErrorClass = `#email ~ ${errorMessageClass}`;

      emailForm?.setValue('invalid-email');
      emailForm?.markAsTouched();
      fixture.detectChanges();

      expect(emailForm?.invalid).toBeTrue();
      expect(emailForm?.errors?.['email']).toBeTruthy();

      const compiled = fixture.nativeElement as HTMLElement;
      let errorMessage = compiled.querySelector(emailErrorClass);
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('メールアドレスの形式で入力してね！');

      emailForm?.setValue('test@example.com');
      fixture.detectChanges();

      expect(emailForm?.valid);
      expect(emailForm?.errors).toBeNull();

      errorMessage = compiled.querySelector(emailErrorClass);
      expect(errorMessage).toBeFalsy();
    });

    it('パスワード（first）が空の場合、required エラーになること', () => {
      const passwordForm = component.form.get('plainPassword.first') as FormControl;
      const passwordErrorClass = `#password_first ~ ${errorMessageClass}`;

      passwordForm?.setValue('');
      passwordForm?.markAsTouched();

      fixture.detectChanges();

      expect(passwordForm?.invalid).toBeTrue();
      expect(passwordForm?.errors?.['required']).toBeTruthy();

      const compiled = fixture.nativeElement as HTMLElement;
      let errorMessage = compiled.querySelector(passwordErrorClass);

      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('パスワードは必須だよ');

      passwordForm?.setValue('password123');
      fixture.detectChanges();

      errorMessage = compiled.querySelector(passwordErrorClass);

      expect(errorMessage).toBeFalsy();
    });

    it('パスワードが8文字未満の場合、minlength エラーになること', () => {
      const passwordForm = component.form.get('plainPassword.first') as FormControl;
      const passwordErrorClass = `#password_first ~ ${errorMessageClass}`;

      passwordForm?.setValue('1234567');
      passwordForm?.markAsTouched();
      fixture.detectChanges();

      expect(passwordForm?.errors?.['minlength']).toBeTruthy();

      const compiled = fixture.nativeElement as HTMLElement;
      let errorMessage = compiled.querySelector(passwordErrorClass);
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('パスワードは8文字以上で入力してね！');

      passwordForm?.setValue('12345678');
      passwordForm?.markAsTouched();

      fixture.detectChanges();

      expect(passwordForm?.valid).toBeTrue();

      errorMessage = compiled.querySelector(passwordErrorClass);
      expect(errorMessage).toBeFalsy();
    });

    it('パスワードが17文字以上の場合、maxLength エラーになること', () => {
      const passwordForm = component.form.get('plainPassword.first') as FormControl;
      const passwordErrorClass = `#password_first ~ ${errorMessageClass}`;

      passwordForm?.setValue('1234567890' + '12345667890');
      passwordForm?.markAsTouched();
      fixture.detectChanges();

      expect(passwordForm?.errors?.['maxlength']).toBeTruthy();

      const compiled = fixture.nativeElement as HTMLElement;
      let errorMessage = compiled.querySelector(passwordErrorClass);

      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('パスワードは17文字以下で入力してね！');

      passwordForm?.setValue('12345678');
      fixture.detectChanges();
      expect(passwordForm?.valid).toBeTrue();

      errorMessage = compiled.querySelector(passwordErrorClass);
      expect(errorMessage).toBeFalsy();
    });

    it('パスワード（first）と確認用（second）が一致しない場合、フォーム全体が不正になること', () => {
      const passwordErrorClass = `#password_second ~ ${errorMessageClass}`;

      const firstPassword = 'first1234';
      const secondPassword = 'second1234';

      const plainPasswordForm = component.form.get('plainPassword');
      const passwordFirstForm = component.form.get('plainPassword.first') as FormControl;
      const passwordSecondForm = component.form.get('plainPassword.second') as FormControl;

      passwordFirstForm.setValue(firstPassword);
      passwordSecondForm.setValue(secondPassword);
      plainPasswordForm?.markAsTouched();
      fixture.detectChanges();

      expect(plainPasswordForm?.errors?.['passwordsMismatch']).toBeTruthy();
      expect(plainPasswordForm?.invalid).toBeTrue();

      const compiled = fixture.nativeElement as HTMLElement;
      let errorMessage = compiled.querySelector(passwordErrorClass);

      expect(errorMessage).toBeTruthy();
      expect(isVisible(errorMessage as HTMLElement)).toBeTrue();
      expect(errorMessage?.textContent).toContain('パスワードが一致してないよ');

      passwordSecondForm.setValue(firstPassword);
      fixture.detectChanges();

      expect(plainPasswordForm?.errors?.['passwordsMismatch']).toBeFalsy();
      expect(plainPasswordForm?.valid).toBeTrue();

      errorMessage = compiled.querySelector(passwordErrorClass);
      expect(errorMessage).toBeFalsy();
    });

    it('role が選択されていない場合、required エラーになること', () => {
      const roleForm = component.form.get('role');
      const passwordErrorClass = `#role ~ ${errorMessageClass}`;

      roleForm?.setValue('');
      roleForm?.markAsTouched();
      fixture.detectChanges();

      expect(roleForm?.invalid).toBeTrue();
      expect(roleForm?.errors?.['required']).toBeTruthy();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorMessage = compiled.querySelector(passwordErrorClass);

      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toContain('権限を選んでね！');

      roleForm?.setValue('ROLE_USER');
      fixture.detectChanges();

      expect(roleForm?.valid).toBeTrue();

      expect(compiled.querySelector(passwordErrorClass)).toBeFalsy();
    });

    it('編集モードでの「パスワードバリデーション」の変化', () => {
      // TODO: 編集モード（URLにIDがある場合）は、パスワードが空でもフォームが有効であることを確認する
    });
  });

  describe('アクションテスト', () => {
    it('フォームが不正な状態で onSubmit が呼ばれた場合、保存処理が実行されないこと', () => {
      const userService = TestBed.inject(UserService);
      const createSpy = spyOn(userService, 'create');
      const updateSpy = spyOn(userService, 'update');
      spyOn(window, 'alert');

      component.form.get('email')?.setValue('');
      component.onSubmit();

      // 1. サービスが呼ばれてへんことを確認
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();

      // 2. フォームが invalid なことを確認
      expect(component.form.invalid).toBeTrue();

      // 3. 全項目がtouchedになってるか（エラー表示を出すため）
      expect(component.form.touched).toBeTrue();
    });

    it('新規作成時に有効な入力があれば UserService.create が呼ばれること', () => {
      expect(component['isEditMode']).toBeFalse();

      const userService = TestBed.inject(UserService);
      const createSpy = spyOn(userService, 'create').and.returnValue(of({}));
      const updateSpy = spyOn(userService, 'update');
      spyOn(window, 'alert');

      component.form.get('email')?.setValue('test@example.com');
      (component.form.get('plainPassword.first') as FormControl)?.setValue('password123');
      (component.form.get('plainPassword.second') as FormControl)?.setValue('password123');
      component.form.get('role')?.setValue('ROLE_USER');

      component.onSubmit();

      expect(component.form.valid).toBeTrue();

      // createが呼ばれること
      expect(createSpy).toHaveBeenCalled();
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('編集時に有効な入力があれば UserService.update が呼ばれること', () => {
      component['userId'] = 1;
      expect(component['isEditMode']).toBeTrue();

      const userService = TestBed.inject(UserService);
      const createSpy = spyOn(userService, 'create');
      const updateSpy = spyOn(userService, 'update').and.returnValue(of());
      spyOn(window, 'alert');

      component.form.get('email')?.setValue('test@example.com');
      (component.form.get('plainPassword.first') as FormControl)?.setValue('password123');
      (component.form.get('plainPassword.second') as FormControl)?.setValue('password123');
      component.form.get('role')?.setValue('ROLE_USER');

      component.onSubmit();

      expect(component.form.valid).toBeTrue();

      // updateが呼ばれること
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalled();
    });

    it('保存成功後、ユーザー一覧画面へ遷移すること', () => {
      const userService = TestBed.inject(UserService);
      const router = TestBed.inject(Router);

      const navigateSpy = spyOn(router, 'navigate');

      spyOn(userService, 'create').and.returnValue(of({}));

      component.form.patchValue({
        email: 'test@example.com',
        role: 'ROLE_USER',
        plainPassword: {
          first: 'password123',
          second: 'password123',
        },
      });

      component.onSubmit();

      expect(navigateSpy).toHaveBeenCalledWith(['user/list']);
    });

    it('ローディング状態（二重送信防止）の確認', () => {
      // TODO: onSubmit 実行後、APIレスポンスが返ってくるまでボタンが非活性になっていることを確認する
    });

    it('CSRFトークンの「送信」確認', () => {
      // TODO: UserService.create/update が呼ばれる際、引数に正しい _token が含まれていることを確認する
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('サーバーエラー時にテンプレート上に正しく表示されること', () => {
      const userService = TestBed.inject(UserService);

      // 1. エラーMockオブジェクトを作成
      const mockBackendErrors: BackendFormErrors = {
        email: ['Email must be unique'],
        'plainPassword.first': ['Password is too short'],
        role: ['Please select a valid Role'],
      };

      // 2. UserService.create がエラーを返すようにスパイを設定
      spyOn(userService, 'create').and.returnValue(
        throwError(() => ({ error: mockBackendErrors })),
      );

      // 3. フォームを有効な状態にして、onSubmit を実行
      component.form.patchValue({
        email: 'test@example.com',
        role: 'ROLE_USER',
        plainPassword: { first: 'password123', second: 'password123' },
      });

      component.onSubmit();

      fixture.detectChanges();

      expect(component['errorMessages']).not.toBeNull();

      // メッセージ内容を確認
      expect(component['errorMessages']?.['email']).toEqual(['Email must be unique']);
      expect(component['errorMessages']?.['role']).toEqual(['Please select a valid Role']);
      expect(component['errorMessages']?.['plainPassword.first']).toEqual([
        'Password is too short',
      ]);

      // 画面のメッセージ表示を確認
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Email must be unique');
      expect(compiled.textContent).toContain('Please select a valid Role');
      expect(compiled.textContent).toContain('Password is too short');
    });

    it('サーバーエラー時の「表示クラス」の確認', () => {
      // TODO: サーバーから返ってきたエラーメッセージが .invalid-feedback クラスの中に表示されていることを確認する
    });
  });
});
