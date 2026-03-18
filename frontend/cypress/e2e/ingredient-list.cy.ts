describe('材料フォーム의テスト', () => {
  beforeEach(() => {
    // APIの監視
    cy.intercept('POST', '**/api/ingredient/new').as('createIngredient');
    cy.intercept('POST', '**/api/ingredient/edit/*').as('updateIngredient');
    cy.intercept('DELETE', '**/api/ingredient/delete/*').as('deleteIngredient');

    // ログイン処理
    cy.login();

    // 材料一覧画面へ遷移
    cy.visit('/ingredient/list');
    cy.url().should('include', '/ingredient/list');
    cy.contains('h2', '材料リスト').should('be.visible');

    // CSRFトークンの取得を待機
    cy.wait('@getCsrfToken').its('response.statusCode').should('eq', 200);
    // Angularの変更検知とInputへの反映を待つためのバッファ
    cy.wait(500);
  });

  it('ログインして材料一覧が表示されること', () => {
    cy.get('tbody tr').filter(':contains("編集")').should('have.length.at.least', 5);

    // ingredients.yaml で定義したデータが表示されているか検証
    cy.contains('にんじん').should('be.visible');
    cy.contains('たまねぎ').should('be.visible');
    cy.contains('じゃがいも').should('be.visible');
  });

  it('新しい材料を登録できること', () => {
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

  it('新しく登録した材料を削除できること', () => {
    const name = '削除テスト' + Date.now();

    // 登録
    cy.contains('button', '新しい材料を登録する').click();
    cy.get('tr[app-ingredient-form]').within(() => {
      cy.get('input[formControlName="name"]').type(name);
      cy.contains('保存').click();
    });
    cy.wait('@createIngredient').its('response.statusCode').should('eq', 201);

    // 削除
    cy.contains('tr', name).within(() => {
      cy.get('button.btn-outline-danger').should('be.visible').click();
    });

    // 正常に削除されることを確認
    cy.wait('@deleteIngredient').its('response.statusCode').should('eq', 200);

    // 一覧から消えていることを確認
    cy.contains(name).should('not.exist');
  });

  it('既存の削除ボタンが表示されている材料を削除できること', () => {
    // 削除ボタンが存在する最初の行（canDelete=trueのデータ）を探す
    cy.get('tbody tr').filter(':has(button.btn-outline-danger)').first().then(($row) => {
      // 削除後の検証用に材料名を保持
      const ingredientName = $row.find('td').first().text().trim();

      // その行内の削除ボタンをクリック
      cy.wrap($row).find('button.btn-outline-danger').click();

      // APIリクエストの成功を確認
      cy.wait('@deleteIngredient').its('response.statusCode').should('eq', 200);

      // 一覧からその名前のデータが消えていることを確認
      cy.contains('tbody tr', ingredientName).should('not.exist');
    });
  });
});
