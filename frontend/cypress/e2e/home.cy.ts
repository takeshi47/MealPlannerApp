describe('ホーム画面のテスト', () => {
  before(() => {
    // フィクスチャのロード
    cy.exec('php ../bin/console doctrine:fixtures:load --no-interaction --env=test');
  });

  beforeEach(() => {
    // APIリクエストの監視
    cy.intercept('POST', '**/api/login').as('loginRequest');
    cy.intercept('POST', '**/api/daily').as('fetchDaily');

    // 時刻固定 (2026-03-01)
    const now = new Date(2026, 2, 1, 12, 0, 0);
    cy.clock(now.getTime(), ['Date']);

    // ログイン処理
    cy.visit('/login');
    cy.get('input[formControlName="email"]').clear().type('admin@example.com');
    cy.get('input[formControlName="password"]').clear().type('password');
    cy.get('button[type="submit"]').should('not.be.disabled').click();

    cy.wait('@loginRequest');
    cy.visit('/home');
    cy.wait('@fetchDaily');
  });

  it('初期表示（Weekモード）でカードが表示されること', () => {
    // Weekモードのコンテナが存在することを確認
    cy.get('.daily-container-week').should('exist');
    cy.get('.card').should('have.length.at.least', 1);
    // 基準日（2026-03-01）のカードが存在することを確認
    cy.contains('.card-header', '2026-03-01').scrollIntoView().should('be.visible');
  });

  it('表示モードを切り替えられること', () => {
    // Dayモードに切り替え (ラジオボタンのlabelをクリック)
    cy.contains('label', 'day').click();
    cy.wait('@fetchDaily');
    cy.get('.daily-item-day').should('exist');
    cy.contains('.card-header', '2026-03-01').scrollIntoView().should('be.visible');

    // Monthモードに切り替え
    cy.contains('label', 'month').click();
    cy.wait('@fetchDaily');
    cy.get('.daily-grid-month').should('exist');

    // 2026年3月の場合、最初の日付は 2026-02-23 (月)、最後は 2026-04-05 (日)
    cy.get('.daily-grid-month .card-header').first().should('contain', '2026-02-23');
    cy.get('.daily-grid-month .card-header').last().should('contain', '2026-04-05');
  });
});
