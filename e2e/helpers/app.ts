import { expect, type Page } from '@playwright/test'

/** Wait until the shell paints (landing when vault empty, workspace when ready). */
export const waitForAppBoot = async (page: Page) => {
  await page.goto('/')
  await expect(page.locator('.app')).toBeVisible()
  await expect(page.getByText('k-thread').first()).toBeVisible()
  await expect(page.locator('.landing, .workspace')).toBeVisible()
}

/** Empty OPFS → landing CTA → workspace (Note after create for writing). */
export const enterWorkspaceFromLanding = async (page: Page) => {
  await waitForAppBoot(page)
  const landing = page.locator('.landing')
  if (await landing.isVisible()) {
    await page.getByRole('button', { name: 'Create a note' }).click()
  }
  await expect(page.locator('.app.ready')).toBeVisible()
  await expect(page.locator('.workspace')).toBeVisible()
  await expect(page.locator('.note-layout')).toBeVisible()
}

const railButton = (page: Page, title: string) =>
  page.locator(`.rail button[title="${title}"]`)

/** Structure is home — brand returns from Note/Links. */
export const openStructureView = async (page: Page) => {
  await page.locator('button.brand.home').click()
  await expect(page.locator('.structure-shell')).toBeVisible()
}

export const openLinksView = async (page: Page) => {
  await railButton(page, 'Links').click()
  await expect(page.locator('.structure-shell')).toBeVisible()
}

/** @deprecated use openLinksView */
export const openGraphView = openLinksView

export const openNoteView = async (page: Page) => {
  await railButton(page, 'Note').click()
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
