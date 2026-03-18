describe('メニュー一覧画面のテスト', () => {
  beforeEach(() => {
    // ログイン処理
    cy.login();

    // メニュー一覧へ遷移
    cy.visit('/menu/list');
    cy.wait('@getMenus');
  });

  it('メニュー一覧が表示されること', () => {
    cy.get('tbody tr').should('have.length.at.least', 1);
    cy.get('button').contains('編集').should('be.visible');
  });
});
