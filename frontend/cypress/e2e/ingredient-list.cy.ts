describe('材料フォームのテスト', () => {
  before(() => {
    cy.request('POST', '/api/test/database-reset');
  });
  beforeEach(() => {
    // セッションの干渉を防ぐ
    cy.clearCookies();
    cy.clearLocalStorage();

    // confirm ダイアログをスタブ化
    cy.on('window:confirm', () => true);

    // APIの監視
    cy.intercept('GET', '**/api/ingredient/csrf-token/ingredient_form').as('getCsrfToken');
    cy.intercept('POST', '**/api/ingredient/new').as('createIngredient');
    cy.intercept('POST', '**/api/ingredient/edit/*').as('updateIngredient');
    cy.intercept('DELETE', '**/api/ingredient/delete/*').as('deleteIngredient');

    // ログイン処理
    cy.login();

    cy.url().should('include', '/home');

    // 材料一覧画面へ遷移
    cy.visit('/ingredient/list');
    cy.url().should('include', '/ingredient/list');
    cy.contains('h2', '材料リスト').should('be.visible');
    cy.wait('@getCsrfToken');
  });

  it('ログインして材料一覧が表示されること', () => {
    cy.get('tbody tr').filter(':contains("編集")').should('have.length.at.least', 5);

    // ingredients.yaml で定義したデータが表示されているか検証
    cy.contains('にんじん').should('be.visible');
    cy.contains('たまねぎ').should('be.visible');
    cy.contains('じゃがいも').should('be.visible');
  });

  it('新しい材料を新しい材料を登録するできること', () => {
    const targetName = 'なす' + Date.now();

    // 登録フォームの表示
    cy.contains('button', '新しい材料を登録する').click();

    // フォームへの入力
    cy.get('tr[app-ingredient-form]').within(() => {
      cy.get('input[formControlName="name"]').type(targetName);
      cy.get('input[formControlName="isStock"]').check();
      cy.contains('保存').click();
    });

    // APIリクエストの完了を待機
    cy.wait('@createIngredient').its('response.statusCode').should('eq', 201);

    // 一覧への反映確認
    cy.contains(targetName).should('be.visible');
  });

  it('既存の材料を編集できること', () => {
    const originalName = 'じゃがいも';
    const updatedName = 'じゃがいも（メークイン）';

    // 対象の行を見つけて編集ボタンをクリック
    cy.contains('tr', originalName).within(() => {
      cy.contains('編集').click();
    });

    // 名前を変更して保存
    cy.get('tr[app-ingredient-form]').within(() => {
      cy.get('input[formControlName="name"]').clear().type(updatedName);
      cy.contains('保存').click();
    });

    // APIリクエストの完了を待機
    cy.wait('@updateIngredient').its('response.statusCode').should('eq', 201);

    // 変更が反映されていることを確認
    cy.contains(updatedName).should('be.visible');
  });

  it('編集をキャンセルできること', () => {
    const targetName = 'たまねぎ';

    cy.contains('tr', targetName).within(() => {
      cy.contains('編集').click();
    });

    cy.get('tr[app-ingredient-form]').within(() => {
      cy.get('input[formControlName="name"]').clear().type('キャンセルされる名前');
      cy.contains('戻る').click();
    });

    // 変更されずに元の名前が残っていること
    cy.contains(targetName).should('be.visible');
    cy.contains('キャンセルされる名前').should('not.exist');
  });

  it('既に存在する名前を登録しようとした場合にエラーが表示されること', () => {
    const duplicateName = 'にんじん';

    cy.contains('新しい材料を登録する').click();

    cy.get('tr[app-ingredient-form]').within(() => {
      cy.get('input[formControlName="name"]').clear().type(duplicateName);
      cy.contains('保存').click();

      cy.wait('@createIngredient').its('response.statusCode').should('eq', 400);

      // input をスクロールして視認性を確保
      cy.get('input[formControlName="name"]').scrollIntoView().should('be.visible');
      // invalid-tooltip 内にエラーメッセージが含まれていること
      cy.get('.invalid-tooltip').should('be.visible').and('not.be.empty');
    });
  });

  it('複数の材料を同時に編集モードにできること', () => {
    cy.get('tbody tr').contains('編集').first().click();
    cy.get('tbody tr').contains('編集').last().click();

    // 2つの入力フィールドが表示されていること
    cy.get('input[formControlName="name"]').should('have.length', 2);
  });

  it('削除ボタンが表示されている材料を削除できること', () => {
    // 確実に削除可能な「削除用材料」を対象にする
    cy.contains('tbody tr', '削除用材料').within(() => {
      cy.get('button.btn-outline-danger').click();
    });

    // APIリクエストの完了を待機
    cy.wait('@deleteIngredient').its('response.statusCode').should('eq', 200);

    // 一覧から消えていることを確認
    cy.contains('削除用材料').should('not.exist');
  });
});
