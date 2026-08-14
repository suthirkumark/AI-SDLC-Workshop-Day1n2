import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Search & Filtering (PRP 08)', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page);
    await helpers.register(`search_user_${Date.now()}`);
  });

  test('search by todo title returns matching todos only', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Team meeting notes');
    await page.click('button[type="submit"]');

    await page.fill('input[placeholder="What needs to be done?"]', 'Buy groceries');
    await page.click('button[type="submit"]');

    await page.fill('input[aria-label="Search todos and subtasks"]', 'meeting');
    await page.waitForTimeout(350);

    await expect(page.locator('text=Team meeting notes')).toBeVisible();
    await expect(page.locator('text=Buy groceries')).not.toBeVisible();
  });

  test('search is case-insensitive and clear button restores list', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Team Meeting');
    await page.click('button[type="submit"]');

    await page.fill('input[placeholder="What needs to be done?"]', 'Laundry');
    await page.click('button[type="submit"]');

    await page.fill('input[aria-label="Search todos and subtasks"]', 'MEETING');
    await page.waitForTimeout(350);

    await expect(page.locator('text=Team Meeting')).toBeVisible();
    await expect(page.locator('text=Laundry')).not.toBeVisible();

    await page.click('button[aria-label="Clear search"]');
    await expect(page.locator('text=Team Meeting')).toBeVisible();
    await expect(page.locator('text=Laundry')).toBeVisible();
  });

  test('priority filter narrows results', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Urgent task');
    await page.selectOption('select', 'high');
    await page.click('button[type="submit"]');

    await page.fill('input[placeholder="What needs to be done?"]', 'Normal task');
    await page.selectOption('select', 'medium');
    await page.click('button[type="submit"]');

    await page.selectOption('select:has(option:text("All Priorities"))', 'high');

    await expect(page.locator('text=Urgent task')).toBeVisible();
    await expect(page.locator('text=Normal task')).not.toBeVisible();
  });

  test('advanced panel completion filter works', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Done item');
    await page.click('button[type="submit"]');

    await page.fill('input[placeholder="What needs to be done?"]', 'Open item');
    await page.click('button[type="submit"]');

    const doneTodo = page.locator('li').filter({ hasText: 'Done item' }).first();
    await doneTodo.locator('input[type="checkbox"]').first().check();

    await page.click('button:has-text("Advanced")');
    await page.selectOption('select:has(option:text("All Todos"))', 'completed');

    await expect(page.locator('text=Done item')).toBeVisible();
    await expect(page.locator('text=Open item')).not.toBeVisible();
  });

  test('save preset persists across reload and can be applied', async ({ page }) => {
    await page.fill('input[placeholder="What needs to be done?"]', 'Finance report');
    await page.selectOption('select', 'high');
    await page.click('button[type="submit"]');

    await page.fill('input[aria-label="Search todos and subtasks"]', 'finance');
    await page.waitForTimeout(350);

    await page.click('button:has-text("Save Filter")');
    await page.fill('input[placeholder="e.g. Today\'s High Priority"]', 'Morning Filter');
    await page.click('button:has-text("Save")');

    await page.reload();
    await expect(page.locator('button:has-text("Morning Filter")')).toBeVisible();

    await page.click('button:has-text("Clear All")');
    await page.click('button:has-text("Morning Filter")');

    await expect(page.locator('input[aria-label="Search todos and subtasks"]')).toHaveValue('finance');
  });
});
