/// <reference types="cypress" />

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      resetDatabase(): Chainable<void>;
      interceptBasicApi(): Chainable<void>;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

// データベースリセットコマンド
Cypress.Commands.add('resetDatabase', () => {
  cy.request('POST', '/api/test/database-reset');
});

// 基本的なAPIのインターセプト
Cypress.Commands.add('interceptBasicApi', () => {
  cy.intercept('POST', '**/api/login').as('loginRequest');
  cy.intercept('POST', '**/api/daily').as('fetchDaily');
  cy.intercept('GET', '**/api/daily/init-data').as('getInitData');
  cy.intercept('GET', '**/api/menu').as('getMenus');
  cy.intercept('GET', '**/api/ingredient/csrf-token/*').as('getCsrfToken');
});

// ログインコマンドの追加
Cypress.Commands.add('login', (email = 'admin@example.com', password = 'password') => {
  cy.visit('/login');
  cy.get('input[formControlName="email"]').clear().type(email);
  cy.get('input[formControlName="password"]').clear().type(password);
  cy.get('button[type="submit"]').should('not.be.disabled').click();

  // ログイン成功後の遷移を待つ
  cy.url().should('include', '/home');
  // タイトルや特定のテキストが表示されるのを待つ
  cy.contains('MealPlanner', { matchCase: false }).should('be.visible');
});

export {};
