import { test, expect } from '@playwright/test'
import {
  createUntitledNote,
  enterWorkspaceFromLanding,
  openGraphView,
  openNoteView,
  waitForAppBoot,
} from './helpers/app'

test.describe('smoke', () => {
  test('boots to landing when vault is empty', async ({ page }) => {
    await waitForAppBoot(page)
    await expect(page.locator('.landing')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'k-thread' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create a note' })).toBeVisible()
  })

  test('creates a note and switches note ↔ graph', async ({ page }) => {
    await enterWorkspaceFromLanding(page)
    await expect(page.locator('.editor-stage, .bn-editor, [contenteditable="true"]').first()).toBeVisible({
      timeout: 15_000,
    })

    await openGraphView(page)
    await expect(page.locator('svg').first()).toBeVisible()

    await openNoteView(page)
    await expect(page.locator('.note-layout')).toBeVisible()
  })

  test('can create a second note from the tool rail', async ({ page }) => {
    await enterWorkspaceFromLanding(page)
    await createUntitledNote(page)
    await page.getByRole('button', { name: 'New note' }).click()
    await expect(page.locator('.app.ready')).toBeVisible()
  })
})
