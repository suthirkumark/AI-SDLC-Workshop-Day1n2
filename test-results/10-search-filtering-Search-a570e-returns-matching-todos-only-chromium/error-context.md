# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 10-search-filtering.spec.ts >> Search & Filtering (PRP 08) >> search by todo title returns matching todos only
- Location: tests\10-search-filtering.spec.ts:10:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="text"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]: Cannot GET /login
```

# Test source

```ts
  1  | import { Page, CDPSession } from '@playwright/test';
  2  | 
  3  | export class TestHelpers {
  4  |   constructor(private page: Page) {}
  5  | 
  6  |   /** Register a new user using virtual WebAuthn authenticator */
  7  |   async register(username: string): Promise<CDPSession> {
  8  |     const client = await this.page.context().newCDPSession(this.page);
  9  |     await client.send('WebAuthn.enable');
  10 |     await client.send('WebAuthn.addVirtualAuthenticator', {
  11 |       options: {
  12 |         protocol: 'ctap2',
  13 |         transport: 'internal',
  14 |         hasResidentKey: true,
  15 |         hasUserVerification: true,
  16 |         isUserVerified: true,
  17 |       },
  18 |     });
  19 | 
  20 |     await this.page.goto('/login');
> 21 |     await this.page.fill('input[type="text"]', username);
     |                     ^ Error: page.fill: Test timeout of 30000ms exceeded.
  22 |     await this.page.click('button:has-text("Register")');
  23 |     await this.page.waitForURL('/');
  24 |     return client;
  25 |   }
  26 | 
  27 |   /** Create a todo via the UI form */
  28 |   async createTodo(title: string, options?: { priority?: string }) {
  29 |     await this.page.fill('input[placeholder="What needs to be done?"]', title);
  30 |     if (options?.priority) {
  31 |       await this.page.selectOption('select', options.priority);
  32 |     }
  33 |     await this.page.click('button[type="submit"]');
  34 |     await this.page.waitForResponse('/api/todos');
  35 |   }
  36 | 
  37 |   /** Add a subtask to the draft form (before saving the todo) */
  38 |   async addDraftSubtask(title: string) {
  39 |     await this.page.fill('input#subtask-input', title);
  40 |     await this.page.keyboard.press('Enter');
  41 |   }
  42 | 
  43 |   /** Save the current draft form state as a template */
  44 |   async saveAsTemplate(name: string, options?: { category?: string; description?: string }) {
  45 |     await this.page.click('button:has-text("Save as Template")');
  46 |     await this.page.fill('input[placeholder="e.g. Weekly Team Meeting"]', name);
  47 |     if (options?.description) {
  48 |       await this.page.fill('textarea', options.description);
  49 |     }
  50 |     if (options?.category) {
  51 |       await this.page.fill('input[list="category-suggestions"]', options.category);
  52 |     }
  53 |     await this.page.click('button:has-text("Save Template")');
  54 |     // Wait for modal to close
  55 |     await this.page.waitForSelector('button:has-text("Save as Template")');
  56 |   }
  57 | }
  58 | 
```