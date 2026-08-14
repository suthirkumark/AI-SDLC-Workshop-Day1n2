import { Page, CDPSession } from '@playwright/test';

export class TestHelpers {
  constructor(private page: Page) {}

  /** Register a new user using virtual WebAuthn authenticator */
  async register(username: string): Promise<CDPSession> {
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('WebAuthn.enable');
    await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });

    await this.page.goto('/login');
    await this.page.fill('input[type="text"]', username);
    await this.page.click('button:has-text("Register")');
    await this.page.waitForURL('/');
    return client;
  }

  /** Create a todo via the UI form */
  async createTodo(title: string, options?: { priority?: string }) {
    await this.page.fill('input[placeholder="What needs to be done?"]', title);
    if (options?.priority) {
      await this.page.selectOption('select', options.priority);
    }
    await this.page.click('button[type="submit"]');
    await this.page.waitForResponse('/api/todos');
  }

  /** Add a subtask to the draft form (before saving the todo) */
  async addDraftSubtask(title: string) {
    await this.page.fill('input#subtask-input', title);
    await this.page.keyboard.press('Enter');
  }

  /** Save the current draft form state as a template */
  async saveAsTemplate(name: string, options?: { category?: string; description?: string }) {
    await this.page.click('button:has-text("Save as Template")');
    await this.page.fill('input[placeholder="e.g. Weekly Team Meeting"]', name);
    if (options?.description) {
      await this.page.fill('textarea', options.description);
    }
    if (options?.category) {
      await this.page.fill('input[list="category-suggestions"]', options.category);
    }
    await this.page.click('button:has-text("Save Template")');
    // Wait for modal to close
    await this.page.waitForSelector('button:has-text("Save as Template")');
  }
}
