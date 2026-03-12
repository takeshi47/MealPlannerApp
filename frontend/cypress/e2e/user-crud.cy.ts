describe('ユーザー管理のCRUDテスト', () => {
  beforeEach(() => {
    // データベースのリセット
    cy.request('POST', '/api/test/database-reset');
    cy.on('window:confirm', () => true);

    cy.clearCookies();
    cy.clearLocalStorage();

    // APIの監視 (エイリアス設定のみ)
    cy.intercept('POST', '**/api/login').as('loginRequest');
    cy.intercept('GET', '**/api/user').as('getUsers');
    cy.intercept('POST', '**/api/user/new').as('createUser');
    cy.intercept('GET', '**/api/user/*').as('getUserDetail');
    cy.intercept('POST', '**/api/user/*').as('updateUser');
    cy.intercept('DELETE', '**/api/user/*').as('deleteUser');
    cy.intercept('GET', '**/api/user/csrf-token/*').as('getCsrfToken');

    cy.login();
    cy.visit('/user/list');
    cy.contains('h2', 'User List', { matchCase: false }).should('be.visible');
  });

  it('ユーザー一覧が正しく表示されること', () => {
    cy.contains('admin@example.com').should('be.visible');
  });

  it('新規ユーザーを登録できること (正常系)', () => {
    const newUserEmail = `testuser_${Date.now()}@example.com`;

    cy.contains('a', 'New User', { matchCase: false }).click();
    cy.url().should('include', '/user/create');

    cy.get('input[formControlName="email"]').type(newUserEmail);
    cy.get('input[formControlName="displayName"]').type('Test User');
    cy.get('input[formControlName="first"]').type('password123');
    cy.get('input[formControlName="second"]').type('password123');
    cy.get('select[formControlName="role"]').select('ROLE_USER');

    cy.get('button[type="submit"]').click();
    cy.wait('@createUser').its('response.statusCode').should('eq', 201);

    cy.url().should('include', '/user/list');
    cy.contains(newUserEmail).should('be.visible');
  });

  it('既存のユーザーを編集できること', () => {
    const targetEmail = 'admin@example.com';
    const updatedName = 'Updated Admin Name';

    cy.contains('tr', targetEmail).within(() => {
      cy.contains('a', 'edit', { matchCase: false }).click();
    });

    cy.url().should('include', '/user/edit/');
    cy.get('input[formControlName="displayName"]').should('be.visible').clear().type(updatedName);

    cy.get('button[type="submit"]').click();
    cy.wait('@updateUser').its('response.statusCode').should('eq', 201);

    cy.url().should('include', '/user/list');
    cy.contains(updatedName).should('be.visible');
  });

  it('作成したユーザーの詳細画面を表示し、削除できること', () => {
    const deleteTargetEmail = `delete_me_${Date.now()}@example.com`;

    cy.contains('a', 'New User', { matchCase: false }).click();
    cy.get('input[formControlName="email"]').type(deleteTargetEmail);
    cy.get('input[formControlName="displayName"]').type('Delete Me');
    cy.get('input[formControlName="first"]').type('password123');
    cy.get('input[formControlName="second"]').type('password123');
    cy.get('select[formControlName="role"]').select('ROLE_USER');
    cy.get('button[type="submit"]').click();
    cy.wait('@createUser');

    cy.visit('/user/list');

    cy.intercept('GET', '**/api/user/csrf-token/user_delete_*').as('tokenRequest');

    cy.contains('a', deleteTargetEmail).click();
    cy.contains('user-detail works!', { matchCase: false }).should('be.visible');

    cy.get('pre').should('contain', deleteTargetEmail);

    cy.wait('@tokenRequest');
    cy.contains('button', /delete/i).click();

    cy.wait('@deleteUser').its('response.statusCode').should('eq', 200);

    cy.url().should('include', '/user/list');
    cy.contains(deleteTargetEmail).should('not.exist');
  });

  it('プロフィール画面を確認できること', () => {
    cy.get('button[title="プロフィール"]').click();
    cy.url().should('include', '/user/profile');
    cy.contains('admin@example.com').should('be.visible');
  });

  it('パスワードが一致しない場合にエラーが表示され、送信できないこと', () => {
    cy.contains('a', 'New User', { matchCase: false }).click();

    cy.get('input[formControlName="email"]').type('test@example.com');
    cy.get('#password_first').type('password123');
    cy.get('#password_second').type('password-different');

    cy.contains('Passwords do not match.').should('be.visible');

    cy.get('button[type="submit"]').should('be.disabled');
  });

  it('既存のメールアドレスで登録しようとするとエラーが表示されること', () => {
    cy.contains('a', 'New User', { matchCase: false }).click();

    // 既存の管理者メールアドレスを入力
    cy.get('input[formControlName="email"]').type('admin@example.com');
    cy.get('input[formControlName="displayName"]').type('New Admin Duplicate');
    cy.get('#password_first').type('password123');
    cy.get('#password_second').type('password123');
    cy.get('select[formControlName="role"]').select('ROLE_ADMIN');

    cy.get('button[type="submit"]').click();

    cy.contains('There is already an account with this email').should('be.visible');
  });
});
