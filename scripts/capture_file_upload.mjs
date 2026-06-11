#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'screenshots');
const demoFile = path.join(__dirname, 'demo-upload.txt');

await writeFile(
  demoFile,
  'EvolveAgent AI demo resume content for portfolio screenshot.\nSkills: FastAPI, React, multi-agent orchestration.\n',
);

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 2000));

const [fileChooser] = await Promise.all([
  page.waitForFileChooser(),
  page.evaluate(() => {
    const label = document.querySelector('label[aria-label="Attach files"]');
    label?.click();
  }),
]);
await fileChooser.accept([demoFile]);
await page.waitForSelector('.file-chip');
await page.click('textarea', { clickCount: 3 });
await page.type('textarea', 'Review this file and give improvements.');
await page.click('button[aria-label="Send message"]');
await page.waitForFunction(
  () => document.querySelectorAll('.chat-message.assistant').length >= 1,
  { timeout: 120000 },
);
await new Promise((r) => setTimeout(r, 2000));
await mkdir(OUT, { recursive: true });
await page.screenshot({ path: path.join(OUT, 'file-upload-document-analysis.png'), fullPage: true });
console.log('Saved file-upload screenshot');
await browser.close();
