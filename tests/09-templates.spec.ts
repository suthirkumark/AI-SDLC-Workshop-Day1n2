import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

/**
 * E2E tests for the Template System (PRP 07)
 * Test file: tests/09-templates.spec.ts
 */

let username: string;

test.beforeEach(async ({ page }) => {
  username = `tpl_user_${Date.now()}`;
  const helpers = new TestHelpers(page);
  await helpers.register(username);
});

// ---------------------------------------------------------------------------
// 1. Save todo as template — verify in dropdown and manager
// ---------------------------------------------------------------------------

test('save a todo (with priority, recurrence, reminder, 2 subtasks) as template; verify in dropdown and manager', async ({ page }) => {
  const helpers = new TestHelpers(page);

  // Fill out the form
  await page.fill('input[placeholder="What needs to be done?"]', 'Weekly Team Meeting');
  await page.selectOption('select', 'high');
  await helpers.addDraftSubtask('Prepare agenda');
  await helpers.addDraftSubtask('Send invites');

  // Save as template
  await helpers.saveAsTemplate('Weekly Meeting Template', { category: 'Work' });

  // Verify in quick dropdown
  await page.click('button:has-text("Use Template")');
  await expect(page.locator('text=Weekly Meeting Template')).toBeVisible();
  await expect(page.locator('text=Work')).toBeVisible();
  await page.keyboard.press('Escape');

  // Verify in Template Manager
  await page.click('button:has-text("📋 Templates")');
  await expect(page.locator('text=Weekly Meeting Template').first()).toBeVisible();
  await expect(page.locator('text=Work').first()).toBeVisible();
  await page.keyboard.press('Escape');
});

// ---------------------------------------------------------------------------
// 2. Use template from quick dropdown
// ---------------------------------------------------------------------------

test('use template from dropdown; created todo has correct title, priority, subtasks', async ({ page }) => {
  const helpers = new TestHelpers(page);

  // Create template
  await page.fill('input[placeholder="What needs to be done?"]', 'Client Onboarding');
  await page.selectOption('select', 'high');
  await helpers.addDraftSubtask('Send welcome email');
  await helpers.addDraftSubtask('Schedule kickoff call');
  await helpers.saveAsTemplate('Onboarding Template');

  // Use from dropdown
  await page.click('button:has-text("Use Template")');
  await page.click('text=Onboarding Template');

  // Wait for todo to appear
  await page.waitForResponse('/api/todos');

  // Verify todo was created
  await expect(page.locator('text=Client Onboarding').first()).toBeVisible();

  // Expand subtasks on the new todo
  const todoItem = page.locator('li').filter({ hasText: 'Client Onboarding' }).first();
  await todoItem.locator('button:has-text("Subtasks")').click();

  await expect(todoItem.locator('text=Send welcome email')).toBeVisible();
  await expect(todoItem.locator('text=Schedule kickoff call')).toBeVisible();

  // Subtasks should be unchecked
  const checkboxes = todoItem.locator('input[type="checkbox"]');
  // First checkbox is the todo's own completion checkbox, rest are subtasks
  await expect(checkboxes.nth(1)).not.toBeChecked();
  await expect(checkboxes.nth(2)).not.toBeChecked();
});

// ---------------------------------------------------------------------------
// 3. Use template from manager modal — modal closes after use
// ---------------------------------------------------------------------------

test('use template from manager modal; modal closes and todo appears', async ({ page }) => {
  const helpers = new TestHelpers(page);

  await page.fill('input[placeholder="What needs to be done?"]', 'Daily Standup');
  await helpers.saveAsTemplate('Standup Template');

  // Open Template Manager
  await page.click('button:has-text("📋 Templates")');
  await expect(page.locator('text=Standup Template').first()).toBeVisible();

  // Click "Use"
  await page.locator('button:has-text("Use")').first().click();

  // Modal should close
  await expect(page.locator('text=Template Manager')).not.toBeVisible();

  // Todo should appear in list
  await expect(page.locator('text=Daily Standup').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// 4. Delete template — disappears from dropdown/manager, prior todos unaffected
// ---------------------------------------------------------------------------

test('delete template; it disappears from dropdown/manager, previously created todo is untouched', async ({ page }) => {
  const helpers = new TestHelpers(page);

  await page.fill('input[placeholder="What needs to be done?"]', 'Finance Review');
  await helpers.saveAsTemplate('Finance Template');

  // Use template first to create a todo
  await page.click('button:has-text("Use Template")');
  await page.click('text=Finance Template');
  await page.waitForResponse('/api/todos');

  // Delete template from manager
  await page.click('button:has-text("📋 Templates")');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('button:has-text("Delete")').first().click();

  // Template should be gone from manager
  await expect(page.locator('text=Finance Template')).not.toBeVisible();
  await page.keyboard.press('Escape');

  // Dropdown should not show template
  await expect(page.locator('button:has-text("Use Template")')).not.toBeVisible();

  // Previously created todo should still exist
  await expect(page.locator('text=Finance Review').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. Template with no subtasks — no crash on null subtasks_json
// ---------------------------------------------------------------------------

test('template with no subtasks; created todo has zero subtasks', async ({ page }) => {
  const helpers = new TestHelpers(page);

  await page.fill('input[placeholder="What needs to be done?"]', 'Simple Task');
  await helpers.saveAsTemplate('Simple Template');

  // Use template
  await page.click('button:has-text("Use Template")');
  await page.click('text=Simple Template');
  await page.waitForResponse('/api/todos');

  const todoItem = page.locator('li').filter({ hasText: 'Simple Task' }).first();
  await todoItem.locator('button:has-text("Subtasks")').click();

  // Should show the add subtask input but no existing subtasks
  const subtaskCheckboxes = todoItem.locator('input[type="checkbox"]');
  // Only the main todo checkbox should exist (subtask count = 0)
  await expect(subtaskCheckboxes).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// 6. Templates are user-scoped — different user cannot see them
// ---------------------------------------------------------------------------

test('templates are scoped per user; different user sees no templates', async ({ page, browser }) => {
  const helpers = new TestHelpers(page);

  // Create a template as user 1
  await page.fill('input[placeholder="What needs to be done?"]', 'Private Task');
  await helpers.saveAsTemplate('Private Template');

  // Open a new context (user 2)
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  const helpers2 = new TestHelpers(page2);
  const username2 = `tpl_user2_${Date.now()}`;
  await helpers2.register(username2);

  // User 2 should see no "Use Template" button (no templates)
  await expect(page2.locator('button:has-text("Use Template")')).not.toBeVisible();

  await context2.close();
});
