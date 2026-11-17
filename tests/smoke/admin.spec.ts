// The /admin "Generate" form (#6): whatever is typed, including quotes, backslashes, colons and newlines, comes out
// as valid YAML front matter that parses back to exactly what was typed. Image URL is required (every review page
// needs og:image from `image`), and the README's "Writing a review" says so.
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { parseDocument } from "yaml";

/** Text that breaks naive `"${value}"` quoting: double and single quotes, backslashes, colons, a YAML comment. */
const TRICKY = `The "Best" Game: Part\\2 - it's #1 \\"really\\"`;

/** Same, plus newlines (only textareas keep them). */
const TRICKY_MULTILINE = `Line one: "quoted"\nback\\slash\\n literal\n\n- not a list item\n---\nlast: line`;

interface Typed {
  title: string;
  platform: string;
  score: string;
  date: string;
  description: string;
  image: string;
  pros: string[];
  cons: string[];
  bottomLine: string;
  content: string;
}

const TRICKY_REVIEW: Typed = {
  title: TRICKY,
  platform: "PC",
  score: "8.5",
  date: "2026-11-10",
  description: TRICKY_MULTILINE,
  // type=url still accepts quotes, colons and backslash-free odd characters in path and query.
  image: `https://example.com/img/a"b':c.jpg?x=1&y="2"#frag`,
  pros: [TRICKY, `key: value`, `"starts with a quote"`],
  cons: [`ends with a backslash \\`, `[not, a, list]`, `{not: a map}`],
  bottomLine: TRICKY_MULTILINE,
  content: `## Intro\n\nBody with "quotes": and \\ backslashes.\n`,
};

/** Never touch the real network: anything off the local server is aborted. */
async function openAdmin(page: Page): Promise<void> {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await page.goto("/admin");
  await expect(page.getByPlaceholder("Enter game title")).toBeVisible();
}

/** Makes sure there are exactly `count` list inputs with this placeholder, using the "+ Add …" button. */
async function fillList(page: Page, placeholder: string, addButton: string, values: string[]): Promise<void> {
  const inputs = page.getByPlaceholder(placeholder);
  while ((await inputs.count()) < values.length) {
    await page.getByRole("button", { name: addButton }).click();
  }
  for (let i = 0; i < values.length; i++) await inputs.nth(i).fill(values[i]);
}

async function fillForm(page: Page, review: Partial<Typed>): Promise<void> {
  if (review.title !== undefined) await page.getByPlaceholder("Enter game title").fill(review.title);
  if (review.platform !== undefined) await page.locator("form select").selectOption(review.platform);
  if (review.score !== undefined) await page.locator('form input[type="number"]').fill(review.score);
  if (review.date !== undefined) await page.locator('form input[type="date"]').fill(review.date);
  if (review.description !== undefined)
    await page.getByPlaceholder("Brief description of the game").fill(review.description);
  if (review.image !== undefined)
    await page.getByPlaceholder("https://example.com/game-image.jpg").fill(review.image);
  if (review.pros !== undefined) await fillList(page, "What works well...", "+ Add Pro", review.pros);
  if (review.cons !== undefined) await fillList(page, "What doesn't work...", "+ Add Con", review.cons);
  if (review.bottomLine !== undefined)
    await page.getByPlaceholder("Your final verdict on the game...").fill(review.bottomLine);
  if (review.content !== undefined)
    await page.getByPlaceholder(/^Write your review in Markdown format\.\.\./).fill(review.content);
}

async function generate(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Generate Review File" }).click();
}

/** Splits the generated file into front matter and body, and parses the front matter strictly. */
async function generatedFile(page: Page): Promise<{ data: Record<string, unknown>; body: string }> {
  const code = page.locator("pre code");
  await expect(code).toBeVisible();
  const text = (await code.textContent()) ?? "";
  const match = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(text);
  expect(match, `output is not "---\\n<yaml>\\n---\\n\\n<content>":\n${text}`).not.toBeNull();
  const doc = parseDocument(match![1], { strict: true, uniqueKeys: true, prettyErrors: true });
  expect(doc.errors.map(String), `front matter is not valid YAML:\n${match![1]}`).toEqual([]);
  expect(doc.warnings.map(String), `front matter has YAML warnings:\n${match![1]}`).toEqual([]);
  return { data: doc.toJS() as Record<string, unknown>, body: match![2] };
}

test.describe("admin review generator", () => {
  test("quotes, backslashes, colons and newlines in every field give front matter that round-trips", async ({
    page,
  }) => {
    await openAdmin(page);
    await fillForm(page, TRICKY_REVIEW);
    await generate(page);
    const { data, body } = await generatedFile(page);

    expect(data.title).toBe(TRICKY_REVIEW.title);
    expect(data.platform).toBe(TRICKY_REVIEW.platform);
    expect(Number(data.score)).toBe(8.5);
    expect(String(data.date)).toContain(TRICKY_REVIEW.date);
    expect(data.description).toBe(TRICKY_REVIEW.description);
    expect(data.image).toBe(TRICKY_REVIEW.image);
    expect(data.pros).toEqual(TRICKY_REVIEW.pros);
    expect(data.cons).toEqual(TRICKY_REVIEW.cons);
    expect(data.bottomLine).toBe(TRICKY_REVIEW.bottomLine);
    expect(body.trim()).toBe(TRICKY_REVIEW.content.trim());
  });

  test("a double quote in the title gives valid front matter (the reported case)", async ({ page }) => {
    await openAdmin(page);
    await fillForm(page, {
      title: `The "Best" Game`,
      platform: "PC",
      score: "7",
      description: "Plain description",
      image: "https://example.com/game-image.jpg",
      content: "Plain content",
    });
    await generate(page);
    const { data } = await generatedFile(page);
    expect(data.title).toBe(`The "Best" Game`);
  });

  for (const [field, value] of Object.entries({
    title: TRICKY,
    description: TRICKY_MULTILINE,
    bottomLine: TRICKY_MULTILINE,
  })) {
    test(`${field} alone with quotes, backslashes, colons and newlines round-trips`, async ({ page }) => {
      await openAdmin(page);
      await fillForm(page, {
        title: "Plain",
        platform: "PC",
        score: "6",
        description: "Plain",
        image: "https://example.com/game-image.jpg",
        content: "Plain",
        [field]: value,
      });
      await generate(page);
      const { data } = await generatedFile(page);
      expect(data[field]).toBe(value);
    });
  }

  test("tricky list items in pros and cons each round-trip as their own item", async ({ page }) => {
    await openAdmin(page);
    await fillForm(page, {
      title: "Plain",
      platform: "PC",
      score: "6",
      description: "Plain",
      image: "https://example.com/game-image.jpg",
      content: "Plain",
      pros: TRICKY_REVIEW.pros,
      cons: TRICKY_REVIEW.cons,
    });
    await generate(page);
    const { data } = await generatedFile(page);
    expect(data.pros).toEqual(TRICKY_REVIEW.pros);
    expect(data.cons).toEqual(TRICKY_REVIEW.cons);
  });

  test("image URL is required: without it nothing is generated", async ({ page }) => {
    await openAdmin(page);
    await fillForm(page, {
      title: "Plain",
      platform: "PC",
      score: "6",
      description: "Plain",
      content: "Plain",
    });
    const image = page.getByPlaceholder("https://example.com/game-image.jpg");
    await generate(page);
    // Native form validation blocks the submit synchronously, so "no output" is not a race.
    expect(await image.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(page.locator("pre code")).toHaveCount(0);
    // And with an image the same form does generate.
    await image.fill("https://example.com/game-image.jpg");
    await generate(page);
    await expect(page.locator("pre code")).toBeVisible();
  });

  test("README 'Writing a review' says image is required", () => {
    const readme = readFileSync("README.md", "utf8");
    const section = /^## Writing a review\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(readme);
    expect(section, "README has no '## Writing a review' section").not.toBeNull();
    const prose = section![1].replace(/```[\s\S]*?```/g, "");
    expect(prose).toMatch(/\bimage\b[^\n]*\brequired\b|\brequired\b[^\n]*\bimage\b/i);
  });
});
