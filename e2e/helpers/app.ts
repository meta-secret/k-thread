import { expect, type Page } from '@playwright/test'

/** Wait until the shell paints (landing when vault empty, workspace when ready). */
export const waitForAppBoot = async (page: Page) => {
  await page.goto('/')
  await expect(page.locator('.app')).toBeVisible()
  await expect(page.getByText('k-thread').first()).toBeVisible()
  await expect(page.locator('.landing, .workspace')).toBeVisible()
}

/** Empty OPFS → landing CTA → kube workspace. */
export const enterWorkspaceFromLanding = async (page: Page) => {
  await waitForAppBoot(page)
  const landing = page.locator('.landing')
  if (await landing.isVisible()) {
    await page.getByRole('button', { name: 'Create a note' }).click()
  }
  await expect(page.locator('.app.ready')).toBeVisible()
  await expect(page.locator('.workspace')).toBeVisible()
}

export const openGraphView = async (page: Page) => {
  await page.getByRole('button', { name: 'Graph', exact: true }).click()
  await expect(page.locator('.graph-layout')).toBeVisible()
}

export const openNoteView = async (page: Page) => {
  await page.getByRole('button', { name: 'Note', exact: true }).click()
  await expect(page.locator('.note-layout')).toBeVisible()
}

export const createUntitledNote = async (page: Page) => {
  const landing = page.locator('.landing')
  if (await landing.isVisible()) {
    await page.getByRole('button', { name: 'Create a note' }).click()
  } else {
    await page.getByRole('button', { name: 'New note' }).click()
  }
  await expect(page.locator('.app.ready .note-layout')).toBeVisible()
}
