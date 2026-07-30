import { test, expect } from '@playwright/test'
import {
  enterWorkspaceFromLanding,
  openGraphView,
  openNoteView,
  waitForAppBoot,
} from './helpers/app'

/**
 * Visual / UX capture suite — use actively when reviewing shell, graph, and editor taste.
 * Screenshots land under test-results/ (gitignored) and the HTML report; baselines under e2e/*-snapshots/.
 */
test.describe('design surfaces', () => {
  test('landing first viewport', async ({ page }) => {
    await waitForAppBoot(page)
    await page.waitForTimeout(300)
    await expect(page.locator('.app')).toHaveScreenshot('landing.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    })
  })

  test('note shell first viewport', async ({ page }) => {
    await enterWorkspaceFromLanding(page)
    await page.waitForTimeout(500)
    await expect(page.locator('.app.ready')).toHaveScreenshot('note-shell.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    })
  })

  test('graph surface after a note exists', async ({ page }) => {
    await enterWorkspaceFromLanding(page)
    await openGraphView(page)
    await page.waitForTimeout(700)
    await expect(page.locator('.app.ready.graph')).toHaveScreenshot('graph-shell.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    })
  })

  test('files drawer composition', async ({ page }) => {
    await enterWorkspaceFromLanding(page)
    await page.getByRole('button', { name: 'Files', exact: true }).click()
    await expect(page.locator('.files-drawer')).toBeVisible()
    await page.waitForTimeout(200)
    await expect(page.locator('.app.ready')).toHaveScreenshot('files-drawer.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.03,
    })
  })

  test('round-trip note → graph → note keeps shell coherent', async ({ page }) => {
    await enterWorkspaceFromLanding(page)
    await openGraphView(page)
    await openNoteView(page)
    await expect(page.locator('.rail')).toBeVisible()
    await expect(page.locator('.note-layout')).toBeVisible()
  })
})
