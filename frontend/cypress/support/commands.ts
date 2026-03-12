/// <reference types="cypress" />

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

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
