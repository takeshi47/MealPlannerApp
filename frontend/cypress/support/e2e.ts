// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// 全てのテストでグローバルに confirm と alert を自動承諾する設定
Cypress.on('window:confirm', () => true);
Cypress.on('window:alert', () => true);

// 全てのテスト実行前の共通セットアップ
beforeEach(() => {
  // セッション情報のクリア
  cy.clearCookies();
  cy.clearLocalStorage();

  // データベースのリセット (テストの独立性を高める)
  cy.resetDatabase();

  // 基本的なAPIのインターセプト
  cy.interceptBasicApi();
});
