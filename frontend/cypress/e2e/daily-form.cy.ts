describe('献立登録フォームのテスト', () => {
  before(() => {
    cy.request('POST', '/api/test/database-reset');
  });

  beforeEach(() => {
    // APIリクエストの監視
    cy.intercept('POST', '**/api/login').as('loginRequest');
    cy.intercept('POST', '**/api/daily').as('fetchDaily');
    cy.intercept('GET', '**/api/daily/init-data').as('getInitData');
    cy.intercept('GET', '**/api/menu').as('getMenus');
    cy.intercept('POST', '**/api/daily/create').as('createDaily');

    // 2026-03-01 12:00:00 に時刻を固定
    const now = new Date(2026, 2, 1, 12, 0, 0);
    cy.clock(now.getTime(), ['Date']);

    // ログイン処理
    cy.visit('/login');
    cy.get('input[formControlName="email"]').clear().type('admin@example.com');
    cy.get('input[formControlName="password"]').clear().type('password');
    cy.get('button[type="submit"]').should('not.be.disabled').click();
    cy.wait('@loginRequest');

    // ホーム画面遷移確認
    cy.url().should('include', '/home');
    cy.wait('@fetchDaily');
  });

  it('新規に献立を登録できること (正常系)', () => {
    // confirm ダイアログをスタブ化して自動的に OK を返すように設定
    cy.window().then((win) => {
      cy.stub(win, 'confirm').as('confirmStub').returns(true);
    });

    // 2026-02-28 のカード内の「登録」ボタンをクリック
    const targetDate = '2026-02-28';
    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '登録').click();
    });

    // モーダルが表示され、初期データがロードされるのを待機
    cy.wait(['@getInitData', '@getMenus']);

    // 日付が正しくセットされているか確認
    cy.get('input#date').should('have.value', targetDate);

    // 1つ目の食事(ごはん 1)のセクションを探して設定
    cy.contains('h4', 'ごはん 1')
      .parents('.card')
      .first()
      .within(() => {
        // 食事タイプを「昼食」に設定
        cy.get('select').first().select('lunch');

        // メニューを「肉じゃが」に設定
        cy.get('select').last().select('肉じゃが');
      });

    // 送信
    cy.get('button[type="submit"]').contains('これでけってい！').should('not.be.disabled').click();

    // APIリクエストの成功を確認
    cy.wait('@createDaily').its('response.statusCode').should('eq', 200);

    // 確認ダイアログが正しいメッセージで呼ばれたことを検証
    cy.get('@confirmStub').should('be.calledWith', 'registration completed!');

    // モーダルが閉じ、ホーム画面が再ロードされることを確認
    cy.get('app-daily-form').should('not.exist');
    cy.wait('@fetchDaily');

    // 登録した内容がホーム画面に表示されているか確認
    cy.contains('.card', targetDate).within(() => {
      cy.contains('lunch').should('be.exist');
      cy.contains('肉じゃが').should('be.exist');
    });
  });

  it('既存の献立を編集できること (正常系)', () => {
    cy.window().then((win) => {
      cy.stub(win, 'confirm').as('confirmStub').returns(true);
    });

    // 2026-03-01 のカード（カレーが登録済み）の「編集」ボタンをクリック
    const targetDate = '2026-03-01';
    cy.intercept('POST', '**/api/daily/update/*').as('updateDaily');

    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '編集').click();
    });

    cy.wait(['@getInitData', '@getMenus']);

    // 既存のメニュー（カレー）を「野菜炒め」に変更
    cy.contains('h4', 'ごはん 1')
      .parents('.card')
      .first()
      .within(() => {
        cy.get('select').last().select('野菜炒め');
      });

    cy.get('button[type="submit"]').contains('これでけってい！').click();

    cy.wait('@updateDaily').its('response.statusCode').should('eq', 200);
    cy.get('@confirmStub').should('be.calledWith', 'registration completed!');

    // ホーム画面で更新を確認
    cy.wait('@fetchDaily');
    cy.contains('.card', targetDate).within(() => {
      cy.contains('野菜炒め').should('be.exist');
      cy.contains('カレー').should('not.exist');
    });
  });

  it('1日に複数の食事を登録できること (正常系)', () => {
    cy.window().then((win) => {
      cy.stub(win, 'confirm').as('confirmStub').returns(true);
    });

    // 未登録の日付を選択
    const targetDate = '2026-02-27';
    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '登録').click();
    });

    cy.wait(['@getInitData', '@getMenus']);

    // 1つ目の食事（朝食）を設定
    cy.contains('h4', 'ごはん 1')
      .parents('.card')
      .first()
      .within(() => {
        cy.get('select').first().select('breakfast');
        cy.get('select').last().select('カレー');
      });

    // 「ごはんをふやす」をクリック
    cy.contains('button', '＋ ごはんをふやす').click();

    // 2つ目の食事（昼食）を設定
    cy.contains('h4', 'ごはん 2')
      .parents('.card')
      .first()
      .within(() => {
        cy.get('select').first().select('lunch');
        cy.get('select').last().select('肉じゃが');
      });

    cy.get('button[type="submit"]').click();
    cy.wait('@createDaily').its('response.statusCode').should('eq', 200);

    // ホーム画面で両方の食事が表示されていることを確認
    cy.wait('@fetchDaily');
    cy.contains('.card', targetDate).within(() => {
      cy.contains('breakfast').should('be.exist');
      cy.contains('カレー').should('be.exist');
      cy.contains('lunch').should('be.exist');
      cy.contains('肉じゃが').should('be.exist');
    });
  });

  it('1つの食事に複数のメニューを登録できること (正常系)', () => {
    cy.window().then((win) => {
      cy.stub(win, 'confirm').as('confirmStub').returns(true);
    });

    const targetDate = '2026-02-26';
    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '登録').click();
    });

    cy.wait(['@getInitData', '@getMenus']);

    cy.contains('h4', 'ごはん 1')
      .parents('.card')
      .first()
      .within(() => {
        cy.get('select').first().select('dinner');

        // 1つ目のメニュー
        cy.get('select').last().select('カレー');

        // 「メニューをふやす」をクリック
        cy.contains('button', '＋ メニューをふやす').click();

        // 2つ目のメニュー (新しく追加された select を選択)
        cy.get('select').last().select('野菜炒め');
      });

    cy.get('button[type="submit"]').click();
    cy.wait('@createDaily').its('response.statusCode').should('eq', 200);

    // ホーム画面で複数のメニューが表示されていることを確認
    cy.wait('@fetchDaily');
    cy.contains('.card', targetDate).within(() => {
      cy.contains('dinner').should('be.exist');
      cy.contains('カレー').should('be.exist');
      cy.contains('野菜炒め').should('be.exist');
    });
  });

  it('サーバー側でバリデーションエラーが発生した場合にエラーメッセージが表示されること (異常系)', () => {
    const targetDate = '2026-02-25';
    cy.intercept('POST', '**/api/daily/create', {
      statusCode: 400,
      body: {
        date: {
          unique: 'この日付はすでに登録されています。',
        },
      },
    }).as('createDailyError');

    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '登録').click();
    });

    cy.wait(['@getInitData', '@getMenus']);

    cy.contains('h4', 'ごはん 1')
      .parents('.card')
      .first()
      .within(() => {
        cy.get('select').first().select('lunch');
        cy.get('select').last().select('肉じゃが');
      });

    cy.get('button[type="submit"]').click();
    cy.wait('@createDailyError');

    cy.get('input#date').should('have.class', 'is-invalid');
    cy.contains('この日付はすでに登録されています。').scrollIntoView().should('be.visible');
  });

  it('同じ食事タイプを重複して登録しようとした場合にエラーが表示されること (異常系)', () => {
    const targetDate = '2026-02-23';
    cy.intercept('POST', '**/api/daily/create').as('createDuplicateError');

    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '登録').click();
    });

    cy.wait(['@getInitData', '@getMenus']);

    // 1つ目: 朝食
    cy.contains('h4', 'ごはん 1')
      .parents('.card')
      .first()
      .within(() => {
        cy.get('select').first().select('breakfast');
        cy.get('select').last().select('カレー');
      });

    // 2つ目: 朝食 (重複)
    cy.contains('button', '＋ ごはんをふやす').click();
    cy.contains('h4', 'ごはん 2')
      .parents('.card')
      .first()
      .within(() => {
        cy.get('select').first().select('breakfast');
        cy.get('select').last().select('肉じゃが');
      });

    cy.get('button[type="submit"]').click();
    cy.wait('@createDuplicateError').its('response.statusCode').should('eq', 400);

    cy.contains('同一日付で食事タイプが重複しています。').should('be.exist');
  });

  it('ごはんの登録件数が最大数に達した場合、追加ボタンが表示されないこと (UI制約)', () => {
    const targetDate = '2026-02-23';
    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '登録').click();
    });

    cy.wait(['@getInitData', '@getMenus']);

    // 初期状態（1件）では削除ボタンがないことを確認
    cy.get('button[aria-label="この食事を削除"]').should('not.exist');

    // 最大3件まで追加できること (正常系)
    cy.contains('button', '＋ ごはんをふやす').click(); // 2件目
    cy.get('h4').contains('ごはん 2').should('exist');
    cy.contains('button', '＋ ごはんをふやす').click(); // 3件目
    cy.get('h4').contains('ごはん 3').should('exist');

    // 3件に達したら追加ボタンが消えることを確認 (UI制約)
    cy.contains('button', '＋ ごはんをふやす').should('not.exist');

    // 3件ある状態では削除ボタンが表示されていること
    cy.get('button[aria-label="この食事を削除"]').should('have.length', 3);

    // 1件削除して2件になること (正常系)
    cy.get('button[aria-label="この食事を削除"]').first().click();
    cy.get('h4').contains('ごはん 3').should('not.exist');
    cy.contains('button', '＋ ごはんをふやす').should('exist');
  });

  it('メニューの最低数制限と追加・削除が正しく動作すること (正常系 & UI制約)', () => {
    const targetDate = '2026-02-23';
    cy.contains('.card', targetDate).within(() => {
      cy.contains('button', '登録').click();
    });

    cy.wait(['@getInitData', '@getMenus']);

    cy.contains('h4', 'ごはん 1')
      .parents('.card')
      .first()
      .within(() => {
        // 初期状態（メニュー1件）では削除ボタン（×）がないことを確認
        cy.get('button').contains('×').should('not.exist');

        // メニューを増やす (正常系)
        cy.contains('button', '＋ メニューをふやす').click();
        cy.get('select').should('have.length', 3); // 食事タイプ(1) + メニュー(2)

        // 2件ある状態では削除ボタンが表示されること
        cy.get('button').contains('×').should('exist');

        // メニューを削除して1件に戻す (正常系)
        cy.get('button').contains('×').click();
        cy.get('select').should('have.length', 2); // 食事タイプ(1) + メニュー(1)

        // 再び削除ボタンが消えること (UI制約)
        cy.get('button').contains('×').should('not.exist');
      });
  });
});
