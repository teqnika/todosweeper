import { test as base } from "@playwright/test";

// Override `page.goto` to use domcontentloaded by default
// and block external font requests that would cause load event to hang
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**://fonts.googleapis.com/**", (route) => route.abort());
    await page.route("**://fonts.gstatic.com/**", (route) => route.abort());
    await use(page);
  },
});

export { expect } from "@playwright/test";
