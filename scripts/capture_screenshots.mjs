#!/usr/bin/env node
/**
 * Capture portfolio screenshots from the running EvolveAgent AI frontend.
 * Requires backend (8000) and frontend (5173) to be running.
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'screenshots');
const BASE = 'http://127.0.0.1:5173';
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickButton(page, matcher) {
  return page.evaluate((pattern) => {
    const re = new RegExp(pattern, 'i');
    const nodes = [...document.querySelectorAll('button')];
    const match = nodes.find((node) => re.test(node.textContent?.trim() || '') || re.test(node.getAttribute('aria-label') || ''));
    if (match && !match.disabled) {
      match.click();
      return true;
    }
    return false;
  }, matcher);
}

async function capture(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`Saved ${file}`);
}

async function runPrompt(page, text) {
  const before = await page.evaluate(() => document.querySelectorAll('.chat-message.assistant').length);

  const cardClicked = await page.evaluate((prompt) => {
    const buttons = [...document.querySelectorAll('.prompt-grid button, .chat-empty button')];
    const match = buttons.find((b) => b.textContent?.includes(prompt));
    if (match) {
      match.click();
      return true;
    }
    return false;
  }, text);

  if (!cardClicked) {
    await page.waitForSelector('textarea');
    await page.click('textarea', { clickCount: 3 });
    await page.type('textarea', text, { delay: 5 });
    await clickButton(page, 'Send message');
  }

  await page.waitForFunction(
    (count) => {
      const assistants = document.querySelectorAll('.chat-message.assistant');
      const latest = assistants[assistants.length - 1];
      return assistants.length > count && latest && latest.textContent && latest.textContent.trim().length > 20;
    },
    { timeout: 120000 },
    before,
  );
  await wait(2000);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);

  await runPrompt(page, 'Explain how EvolveAgent AI works.');
  await capture(page, 'chat-ui-simple-mode.png');

  await clickButton(page, '^Developer$');
  await wait(1000);
  await capture(page, 'developer-mode-inspector.png');
  await capture(page, 'agent-evaluation-section.png');

  await clickButton(page, 'Analytics');
  await wait(800);
  await capture(page, 'analytics-dashboard.png');

  await clickButton(page, 'Mission Control');
  await wait(800);
  await capture(page, 'mission-control.png');

  await clickButton(page, 'Agent Builder');
  await wait(800);
  await capture(page, 'custom-agent-builder.png');

  await clickButton(page, '^Simple$');
  await wait(500);
  await runPrompt(page, 'Generate an image prompt for a futuristic AI assistant.');
  await capture(page, 'mock-image-agent-preview.png');

  await capture(page, 'export-chat-menu.png');

  const demoFile = path.join(__dirname, 'demo-upload.txt');
  await import('node:fs/promises').then(({ writeFile }) =>
    writeFile(demoFile, 'EvolveAgent AI demo resume content for portfolio screenshot.\nSkills: FastAPI, React, multi-agent orchestration.\n'),
  );
  const beforeUpload = await page.evaluate(() => document.querySelectorAll('.chat-message.assistant').length);
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.evaluate(() => document.querySelector('label[aria-label="Attach files"]')?.click()),
  ]);
  await fileChooser.accept([demoFile]);
  await page.waitForFunction(
    () => {
      const chip = document.querySelector('.file-chip.processed, .file-chip');
      return chip && chip.textContent?.includes('demo-upload');
    },
    { timeout: 30000 },
  );
  await page.waitForSelector('textarea');
  await page.click('textarea', { clickCount: 3 });
  await page.type('textarea', 'Review this file and give improvements.', { delay: 5 });
  await clickButton(page, 'Send message');
  await page.waitForFunction(
    (count) => document.querySelectorAll('.chat-message.assistant').length > count,
    { timeout: 120000 },
    beforeUpload,
  );
  await wait(2000);
  await capture(page, 'file-upload-document-analysis.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
