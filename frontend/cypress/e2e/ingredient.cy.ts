describe('材料管理のテスト', () => {
  it('ログインして材料一覧が表示されること', () => {
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type('pisomaso01@piso.com');
    cy.get('input[formControlName="password"]').type('password');
    cy.get('button[type="submit"]').click();

    // ログイン後のURLを確認
    cy.url().should('include', '/home');

    // 材料一覧画面へ移動（ナビゲーションなどの実装に合わせて変更）
    cy.contains('材料').click();
    cy.contains('にんじん').should('be.visible');
  });
});
