describe('メニュー一覧画面のテスト', () => {
  beforeEach(() => {
    cy.request('POST', '/api/test/database-reset');

    // APIリクエストの監視とモック
    cy.intercept('POST', '**/api/login').as('loginRequest');
    cy.intercept('GET', '**/api/menu').as('getMenus');

    // ログイン処理
    cy.login();
    cy.wait('@loginRequest');

    // メニュー一覧へ遷移
    cy.visit('/menu/list');
    cy.wait('@getMenus');
  });

  it('メニュー一覧が表示されること', () => {
    cy.get('tbody tr').should('have.length.at.least', 1);
    cy.get('button').contains('編集').should('be.visible');
  });
});
