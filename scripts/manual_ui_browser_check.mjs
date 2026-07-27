const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const HEADLESS = process.env.HEADLESS !== 'false';
const SLOW_MO = Number(process.env.SLOW_MO || '0');

const checks = [];
const consoleErrors = [];
const pageErrors = [];

function record(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` - ${detail}` : ''}`);
}

async function clickButtonByName(page, name, options = {}) {
  const button = page.getByRole('button', { name });
  await button.first().click(options);
}

async function visibleText(page, textOrRegex, timeout = 8000) {
  await page.getByText(textOrRegex).first().waitFor({ state: 'visible', timeout });
}

async function verifyNav(page, name, expectedText = name) {
  try {
    await clickButtonByName(page, name);
    await visibleText(page, expectedText);
    record(`Navigate: ${name}`, true);
  } catch (error) {
    record(`Navigate: ${name}`, false, error.message.split('\n')[0]);
  }
}

async function run() {
  const playwrightModule = process.env.PLAYWRIGHT_MODULE || 'playwright';
  const { chromium } = await import(playwrightModule);
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await visibleText(page, /EvolveAgent/i);
    record('App shell loads', true, FRONTEND_URL);
  } catch (error) {
    record('App shell loads', false, error.message.split('\n')[0]);
    await browser.close();
    process.exit(1);
  }

  await verifyNav(page, 'Home Dashboard', /EvolveAgent/i);
  await verifyNav(page, 'Instructions', /Instructions/i);
  await verifyNav(page, 'Simple Mode Chat', /Master Orchestrator/i);

  try {
    const prompt = `Manual QA chat ${Date.now()}: explain EvolveAgent in one sentence.`;
    await page.getByPlaceholder(/Instruct agents/i).fill(prompt);
    await page.getByRole('button').filter({ has: page.locator('svg') }).last().click();
    await visibleText(page, prompt, 5000);
    await page.waitForTimeout(1200);
    const offlineBanner = await page.getByText(/Chat backend is not connected/i).count();
    record('Chat accepts a live user prompt', offlineBanner === 0, offlineBanner ? 'offline banner appeared' : 'prompt rendered');
  } catch (error) {
    record('Chat accepts a live user prompt', false, error.message.split('\n')[0]);
  }

  await verifyNav(page, 'Mission Control', /Mission Control/i);
  await verifyNav(page, 'Agents', /Agent/i);
  await verifyNav(page, 'Project Brain', /Project Brain/i);

  try {
    await clickButtonByName(page, 'Add My Preference');
    await clickButtonByName(page, 'Save to Project Brain');
    await page.getByPlaceholder(/Search memories/i).fill('direct answers');
    await page.waitForTimeout(1600);
    await visibleText(page, /direct answers|User prefers direct answers|Memory v2/i, 8000);
    record('Project Brain add/search memory flow', true);
  } catch (error) {
    record('Project Brain add/search memory flow', false, error.message.split('\n')[0]);
    const close = page.getByLabel(/Close add memory/i);
    if (await close.count()) await close.first().click().catch(() => {});
  }

  await verifyNav(page, 'Tools / MCP Hub', /Tools|MCP/i);
  await verifyNav(page, 'Approvals', /Approval/i);
  await verifyNav(page, 'Governance', /Governance/i);
  await verifyNav(page, 'Compliance', /Compliance/i);

  try {
    await clickButtonByName(page, 'System');
  } catch {
    // System group may already be open.
  }
  await verifyNav(page, 'Dev Mode Console', /Developer|Console|System/i);
  await verifyNav(page, 'Code Changes', /Code|Changes/i);
  await verifyNav(page, 'Settings', /Settings/i);
  await verifyNav(page, 'Design System', /Design System/i);

  await page.setViewportSize({ width: 390, height: 860 });
  await page.waitForTimeout(500);
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 8);
  record('Mobile viewport has no major horizontal overflow', !mobileOverflow, `scrollWidth=${await page.evaluate(() => document.documentElement.scrollWidth)}`);

  const filteredConsoleErrors = consoleErrors.filter((message) => !/favicon|404/i.test(message));
  record('No page runtime errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  record('No console errors', filteredConsoleErrors.length === 0, filteredConsoleErrors.slice(0, 3).join(' | '));

  await page.screenshot({ path: '/tmp/evolveagent-manual-ui-check.png', fullPage: true });
  console.log('Screenshot: /tmp/evolveagent-manual-ui-check.png');

  await browser.close();

  const failed = checks.filter((check) => !check.ok);
  console.log(`Summary: ${checks.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
