describe('材料管理のテスト', () => {
  beforeEach(() => {
    // ログイン処理を共通化
    cy.visit('/login');

    // tests/Fixtures/users.yaml の定義に合わせる
    cy.get('input[formControlName="email"]').type('admin@example.com');
    cy.get('input[formControlName="password"]').type('password');

    cy.get('button[type="submit"]').click();
  });

  it('ログインして材料一覧が表示されること', () => {
    cy.url().should('include', '/home');
    cy.contains('材料').click();

    cy.get('tbody tr').filter(':contains("削除")').should('have.length', 10);

    // ingredients.yaml で定義したデータが表示されているか検証
    cy.contains('にんじん').should('be.visible');
    cy.contains('たまねぎ').should('be.visible');
    cy.contains('じゃがいも').should('be.visible');
  });

  it('在庫無しの表示確認', () => {
    cy.contains('材料').click();
    cy.contains('じゃがいも').parent().children().children().should('have.class', 'bg-secondary');
    cy.contains('No').should('be.visible');
  });
});
