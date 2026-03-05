describe('献立登録フォーム：異常系・制約テスト', () => {
  let csrfToken: string;

  before(() => {
    // フィクスチャのロード
    cy.exec('php ../bin/console doctrine:fixtures:load --no-interaction --env=test');
  });

  beforeEach(() => {
    // APIリクエストの監視
    cy.intercept('POST', '**/api/login').as('loginRequest');
    cy.intercept('POST', '**/api/daily').as('fetchDaily');

    // 時刻固定 (Dateのみ)
    const now = new Date(2026, 2, 1, 12, 0, 0);
    cy.clock(now.getTime(), ['Date']);

    // ログイン処理
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type('admin@example.com');
    cy.get('input[formControlName="password"]').type('password');
    cy.get('button[type="submit"]').should('not.be.disabled').click();
    cy.wait('@loginRequest');

    // CSRFトークンをAPIテスト用に取得しておく
    cy.request('GET', '/api/daily/csrf-token/daily_create').then((response) => {
      csrfToken = response.body.token;
    });

    cy.visit('/home');
    cy.wait('@fetchDaily');
  });

  describe('UIレベルの制約テスト', () => {
    it('食事の件数制限（1〜3件）がボタンの表示に反映されていること', () => {
      const targetDate = '2026-02-28';
      cy.contains('.card', targetDate).within(() => {
        cy.contains('button', '登録').click();
      });

      // --- 下限の検証 ---
      // 初期状態（1件）では「削除」ボタンが表示されていないこと
      cy.get('button[aria-label="この食事を削除"]').should('not.exist');

      // --- 上限の検証 ---
      // 3件まで増やす
      cy.contains('button', '＋ ごはんをふやす').click(); // 2件目
      cy.contains('button', '＋ ごはんをふやす').click(); // 3件目

      // 3件に達したら「追加」ボタンが消えること
      cy.contains('button', '＋ ごはんをふやす').should('not.exist');

      // 3件ある状態ではすべての食事に「削除」ボタンがあること
      cy.get('button[aria-label="この食事を削除"]').should('have.length', 3);
    });

    it('メニューの最低数制限（1件以上）がボタンの表示に反映されていること', () => {
      const targetDate = '2026-02-27';
      cy.contains('.card', targetDate).within(() => {
        cy.contains('button', '登録').click();
      });

      cy.contains('h4', 'ごはん 1')
        .parents('.card')
        .first()
        .within(() => {
          // 初期状態（メニュー1件）では削除ボタン「×」がないこと
          cy.get('button').contains('×').should('not.exist');

          // メニューを増やす
          cy.contains('button', '＋ メニューをふやす').click();

          // 2件になれば削除ボタン「×」が出現すること
          cy.get('button').contains('×').should('exist');
        });
    });
  });

  describe('サーバーサイドバリデーションの検証 (UIをバイパスして直接POST)', () => {
    it('食事数が4件（上限突破）のリクエストをサーバーが400エラーで拒否すること', () => {
      console.log(csrfToken);
      const body = {
        date: '2026-03-10',
        meals: [
          { mealType: 'breakfast', menu: [1] },
          { mealType: 'lunch', menu: [1] },
          { mealType: 'dinner', menu: [1] },
          { mealType: 'breakfast', menu: [1] }, // 4件目（不正）
        ],
        _token: csrfToken,
      };

      cy.request({
        method: 'POST',
        url: '/api/daily/create',
        failOnStatusCode: false,
        body: body,
      }).then((response) => {
        expect(response.status).to.eq(400);
        // 特定のエラーメッセージが含まれていることを確認
        expect(JSON.stringify(response.body)).to.contain(
          'This collection should contain 3 elements or less.',
        );
      });
    });
  });

  //   it('食事数が0件（下限突破）のリクエストをサーバーが400エラーで拒否すること', () => {
  //     cy.request({
  //       method: 'POST',
  //       url: '/api/daily/create',
  //       failOnStatusCode: false,
  //       body: {
  //         date: '2026-03-11',
  //         meals: [], // 0件（不正）
  //         _token: csrfToken,
  //       },
  //     }).then((response) => {
  //       expect(response.status).to.eq(400);
  //     });
  //   });

  //   it('メニューが0件の食事が含まれる場合、サーバーが400エラーで拒否すること', () => {
  //     cy.request({
  //       method: 'POST',
  //       url: '/api/daily/create',
  //       failOnStatusCode: false,
  //       body: {
  //         date: '2026-03-12',
  //         meals: [
  //           {
  //             mealType: 'breakfast',
  //             menu: [], // メニュー空（不正）
  //           },
  //         ],
  //         _token: csrfToken,
  //       },
  //     }).then((response) => {
  //       expect(response.status).to.eq(400);
  //       // meals[0].menu にエラーがあることを期待
  //       console.log(response.body);
  //     });
  //   });

  //   it('同じ日に同じ食事タイプ（breakfast）を重複してリクエストした場合、サーバーが400エラーを返すこと', () => {
  //     cy.request({
  //       method: 'POST',
  //       url: '/api/daily/create',
  //       failOnStatusCode: false,
  //       body: {
  //         date: '2026-03-13',
  //         meals: [
  //           { mealType: 'breakfast', menu: [1] },
  //           { mealType: 'breakfast', menu: [2] }, // 重複（不正）
  //         ],
  //         _token: csrfToken,
  //       },
  //     }).then((response) => {
  //       expect(response.status).to.eq(400);
  //       console.log(response.body);
  //     });
  //   });
  // });
});
