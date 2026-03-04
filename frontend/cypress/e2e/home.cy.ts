describe('ホーム画面のテスト', () => {
  before(() => {
    // フィクスチャのロード
    cy.exec('php ../bin/console doctrine:fixtures:load --no-interaction --env=test');
  });

  beforeEach(() => {
    // APIリクエストの監視
    cy.intercept('POST', '**/api/login').as('loginRequest');
    cy.intercept('POST', '**/api/daily').as('fetchDaily');

    // 2026-03-01 12:00:00 に時刻を固定 (Dateのみ上書きしてタイマーは止めない)
    const now = new Date(2026, 2, 1, 12, 0, 0);
    cy.clock(now.getTime(), ['Date']);

    // ログイン処理開始
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type('admin@example.com');
    cy.get('input[formControlName="password"]').type('password');
    cy.get('button[type="submit"]').should('not.be.disabled').click();


    // ホーム画面遷移確認
    cy.url().should('include', '/home');
  });

  it('初期表示（Weekモード）で2026-03-01付近の献立が表示されること', () => {
    cy.wait('@fetchDaily');
    cy.get('.card').should('be.exist');
    cy.contains('.card-header', '2026-03-01').should('be.exist');
    cy.contains('.card', '2026-03-01').within(() => {
      cy.contains('breakfast').should('be.exist');
      cy.contains('カレー').should('be.exist');
    });
  });

  it('Weekモードで、月曜日始まり日曜日終わりの1週間分（2026年3月1日を含む）のデータが表示されること', () => {
    cy.wait('@fetchDaily');
    cy.get('.card').should('have.length', 7);

    // 最初の日付が 2026-02-23 (月) であることを確認
    cy.get('.card-header')
      .first()
      .invoke('text')
      .then((text) => {
        const dateStr = text.trim();
        expect(dateStr).to.equal('2026-02-23');
        expect(new Date(dateStr).getDay()).to.equal(1); // 1 = 月曜日
      });

    // 最後の日付が 2026-03-01 (日) であることを確認
    cy.get('.card-header')
      .last()
      .invoke('text')
      .then((text) => {
        const dateStr = text.trim();
        expect(dateStr).to.equal('2026-03-01');
        expect(new Date(dateStr).getDay()).to.equal(0); // 0 = 日曜日
      });
  });

  it('Monthモードの表示範囲（月曜〜日曜）と、次月（4月）への移動テスト', () => {
    // 1. Monthモードに切り替え
    cy.get('label').contains('month').click();
    cy.wait('@fetchDaily');

    // 2026-03-01基準の3月表示確認
    // 3/1は日曜なので、カレンダーは2/23(月)〜4/5(日曜)の42日間（6週間分）になる
    cy.get('.card').should('have.length', 42);

    // 3月の最初と最後の月曜・日曜を確認
    cy.get('.card-header').first().should('contain', '2026-02-23'); // 月曜日始まり
    cy.get('.card-header').last().should('contain', '2026-04-05'); // 日曜日終わり

    // 指定された日付が含まれていること
    cy.contains('.card-header', '2026-03-01').should('be.exist');
    cy.contains('.card-header', '2026-03-31').should('be.exist');

    // 2. 次へボタンをクリックして4月へ移動
    cy.get('button').find('.bi-arrow-right').parent().click();
    cy.wait('@fetchDaily');

    // 2026-04-30基準の4月表示確認
    // 4/1は水曜、4/30は木曜。カレンダーは3/30(月)〜5/3(日曜)の35日間（5週間分）
    cy.get('.card').should('have.length', 35);

    cy.get('.card-header').first().should('contain', '2026-03-30'); // 月曜日始まり
    cy.get('.card-header').last().should('contain', '2026-05-03'); // 日曜日終わり

    // 4月の初日と最終日が表示されていること
    cy.contains('.card-header', '2026-04-01').should('be.exist');
    cy.contains('.card-header', '2026-04-30').should('be.exist');
  });

  it('表示モードをDayに切り替えて、特定の日のカードだけが表示されること', () => {
    cy.wait('@fetchDaily');
    cy.get('label').contains('day').click();
    cy.wait('@fetchDaily');

    cy.get('.daily-item-day .card').should('have.length', 1);
    cy.contains('.card-header', '2026-03-01').should('be.exist');
  });

  it('次へボタンをクリックして日付が移動すること (Dayモード)', () => {
    cy.wait('@fetchDaily');
    cy.get('label').contains('day').click();
    cy.wait('@fetchDaily');

    cy.get('button').find('.bi-arrow-right').parent().click();
    cy.wait('@fetchDaily');

    cy.contains('.card-header', '2026-03-02').should('be.exist');
    cy.contains('.card', '2026-03-02').within(() => {
      cy.contains('肉じゃが').should('be.exist');
    });
  });
});
