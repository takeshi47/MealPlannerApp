describe('材料フォームのテスト', () => {
  interface IngredientResponse {
    id: number;
    name: string;
    isStock: boolean;
    canDelete: boolean;
  }

  before(() => {
    // todo: ｃｙ．ｔｓ側で直接実行しない
    cy.exec('php ../bin/console doctrine:fixtures:load --no-interaction --env=test');
  });

  beforeEach(() => {
    // APIの監視
    cy.intercept('GET', '**/api/ingredient/csrf-token/ingredient_form').as('getCsrfToken');
    cy.intercept('POST', '**/api/ingredient/new').as('createIngredient');
    cy.intercept('POST', '**/api/ingredient/edit/*').as('updateIngredient');
    cy.intercept('DELETE', '**/api/ingredient/delete/*').as('deleteIngredient');

    // ログイン処理
    cy.visit('/login');
    cy.get('input[formControlName="email"]').clear().type('admin@example.com');
    cy.get('input[formControlName="password"]').clear().type('password');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/home');

    cy.visit('/ingredient/list');

    cy.url().should('include', '/ingredient/list');
    cy.contains('h2', '材料リスト').should('be.visible');

    cy.wait('@getCsrfToken');
  });

  it('ログインして材料一覧が表示されること', () => {
    cy.get('tbody tr').filter(':contains("編集")').should('have.length', 11);

    // ingredients.yaml で定義したデータが表示されているか検証
    cy.contains('にんじん').should('be.visible');
    cy.contains('たまねぎ').should('be.visible');
    cy.contains('じゃがいも').should('be.visible');
  });

  it('在庫状態（あり/なし）に応じてバッジの色と文言が正しいこと', () => {
    // 在庫あり (isStock: true) -> bg-success (Yes)
    cy.contains('tr', 'にんじん').within(() => {
      cy.get('.badge').should('have.class', 'bg-success').and('contain', 'あり');
    });

    // 在庫なし (isStock: false) -> bg-secondary (No)
    cy.contains('tr', 'じゃがいも').within(() => {
      cy.get('.badge').should('have.class', 'bg-secondary').and('contain', 'なし');
    });
  });

  it('材料が0件の時に適切なメッセージが表示されること', () => {
    // APIのレスポンスを空配列にモック（擬似的に書き換え）する
    cy.intercept('GET', '**/api/ingredient', []).as('getEmptyIngredients');

    // ページをリロードしてモックを反映させる
    cy.reload();
    cy.wait('@getEmptyIngredients');

    // 空状態のメッセージが表示されているか確認
    cy.contains('材料が登録されてないよ').should('be.visible');
  });

  it('新しい材料を新しい材料を登録するできること', () => {
    const targetName = 'なす';

    // 画面遷移と初期表示の確認
    cy.contains('h2', '材料リスト').should('be.visible');

    cy.contains('新しい材料を登録する').click();
    cy.get('tr[app-ingredient-form]').as('ingredientForm');

    cy.get('@ingredientForm').within(() => {
      cy.get('input[formControlName="name"]').type(targetName);
      cy.get('input[formControlName="isStock"]').check();
    });

    // 保存実行
    cy.get('@ingredientForm').contains('保存').click();

    // 保存結果の検証
    cy.wait('@createIngredient').then((interception) => {
      expect(interception.response?.statusCode).to.equal(201);
      // 送信データにトークンが含まれていること
    });

    // 一覧への反映確認
    cy.contains(targetName).should('be.visible');
  });

  it('既存の材料を編集できること', () => {
    const originalName = 'にんじん';
    const updatedName = 'にんじん（大）';

    // 「にんじん」の行を探して編集ボタンをクリック
    cy.contains('tr', originalName).within(() => {
      cy.contains('編集').click();
    });

    cy.get('tr[app-ingredient-form]').as('ingredientForm');

    cy.get('@ingredientForm').within(() => {
      cy.get('input[formControlName="name"]')
        .should('have.value', originalName)
        .clear()
        .type(updatedName);
      cy.get('input[formControlName="isStock"]').uncheck();
      cy.contains('保存').click();
    });

    // 更新リクエストの検証
    cy.wait('@updateIngredient').then((interception) => {
      expect(interception.response?.statusCode).to.equal(201);
    });

    // 一覧の更新確認
    cy.contains(updatedName).should('be.visible');
  });

  it('編集をキャンセルできること', () => {
    const targetName = 'たまねぎ';

    cy.contains('tr', targetName).within(() => {
      cy.contains('編集').click();
    });

    cy.get('tr[app-ingredient-form]').as('ingredientForm');

    cy.get('@ingredientForm').within(() => {
      cy.get('input[formControlName="name"]').clear().type('キャンセルされる名前');
      cy.contains('戻る').click();
    });

    // 変更されずに元の名前が残っていること
    cy.contains(targetName).should('be.visible');
    cy.contains('キャンセルされる名前').should('not.exist');
  });

  it('nameが空の場合、バリデーションエラーが表示されること', () => {
    cy.contains('新しい材料を登録する').click();
    cy.get('tr[app-ingredient-form]').as('ingredientForm');

    cy.get('@ingredientForm').within(() => {
      cy.get('input[formControlName="name"]').clear();
      cy.contains('保存').click();
    });

    cy.wait('@createIngredient').its('response.statusCode').should('eq', 400);

    cy.get('@ingredientForm').within(() => {
      cy.get('input[formControlName="name"]').should('have.class', 'is-invalid');
      cy.get('.invalid-tooltip').should('be.visible').and('not.be.empty');
    });
  });

  it('nameが31文字以上の場合にエラーが表示されること', () => {
    const longName = 'a'.repeat(31);

    cy.contains('新しい材料を登録する').click();

    const ingredientForm = cy.get('tr[app-ingredient-form]').as('ingredientForm');

    ingredientForm.within(() => {
      cy.get('input[formControlName="name"]').type(longName);
      cy.contains('保存').click();
    });

    cy.wait('@createIngredient').its('response.statusCode').should('eq', 400);

    ingredientForm.within(() => {
      cy.get('input[formControlName="name"]').should('have.class', 'is-invalid');
      cy.get('.invalid-tooltip').should('contain', 'This value is too long');
    });
  });

  it('既に存在する名前を登録しようとした場合にエラーが表示されること', () => {
    const duplicateName = 'たまねぎ';

    cy.contains('新しい材料を登録する').click();
    const ingredientForm = cy.get('tr[app-ingredient-form]').as('ingredientForm');

    ingredientForm.within(() => {
      cy.get('input[formControlName="name"]').type(duplicateName);
      cy.contains('保存').click();
    });

    cy.wait('@createIngredient').its('response.statusCode').should('eq', 400);

    ingredientForm.within(() => {
      cy.get('input[formControlName="name"]').should('have.class', 'is-invalid');
      cy.get('.invalid-tooltip').should('contain', 'already an ingredient with this name');
    });
  });

  it('複数の材料を同時に編集モードにできること', () => {
    cy.contains('tr', 'テスト材料 4').within(() => cy.contains('編集').click());
    cy.contains('tr', 'テスト材料 5').within(() => cy.contains('編集').click());

    // 編集用フォーム（tr[app-ingredient-form]）が2つ存在することを確認
    cy.get('tr[app-ingredient-form]').should('have.length', 2);

    // それぞれのフォームに正しい名前が入っているか確認
    cy.get('tr[app-ingredient-form]')
      .eq(0)
      .find('input[formControlName="name"]')
      .should('have.value', 'テスト材料 4');

    cy.get('tr[app-ingredient-form]')
      .eq(1)
      .find('input[formControlName="name"]')
      .should('have.value', 'テスト材料 5');
  });

  it('材料一覧の各行で canDelete の値に応じて削除ボタンの表示・非表示が正しく制御されていること', () => {
    cy.intercept('GET', '**/api/ingredient').as('getIngredients');
    cy.visit('/ingredient/list');

    cy.wait('@getIngredients').then((interception) => {
      const ingredients = interception.response?.body as IngredientResponse[];

      ingredients.forEach((ingredient) => {
        cy.contains('tr', ingredient.name).within(() => {
          if (ingredient.canDelete === false) {
            // canDelete が false なら削除ボタンが存在しないこと
            cy.get('button.btn-outline-danger').should('not.exist');
          } else {
            // canDelete が true なら削除ボタンが存在すること
            cy.get('button.btn-outline-danger').should('exist');
          }
        });
      });
    });
  });

  it('削除ボタンが表示されている材料を削除できること', () => {
    // 1. テーブルの行から「削除ボタン」が表示されている行を検索
    cy.get('tbody tr').filter(':has(button.btn-outline-danger)').first().as('targetRow');

    // 2. 見つけた行のnameを変数に入れて保持
    cy.get('@targetRow').within(() => {
      cy.get('td')
        .first()
        .invoke('text')
        .then((text) => {
          const targetName = text.trim();
          cy.wrap(targetName).as('targetName');

          // 3. 見つけた行の削除ボタンを押下
          cy.get('button.btn-outline-danger').click();
        });
    });

    // 4. 削除されたことを確認
    cy.wait('@deleteIngredient').then((interception) => {
      expect(interception.response?.statusCode).to.equal(200);
    });

    // 5. テーブル内に保持したnameに該当するデータがないことを確認
    cy.get('@targetName').then((name) => {
      const deletedName = name as unknown as string;
      cy.get('table').should('not.contain', deletedName);
      cy.contains('tbody tr', deletedName).should('not.exist');
    });
  });
});
