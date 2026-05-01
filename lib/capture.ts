import { v4 as uuidv4 } from 'uuid';
import type { Capture } from './types';

export async function captureActiveTab(): Promise<Capture> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || !tab.url) {
    throw new Error('No active tab found');
  }

  const screenshotUri = await browser.tabs.captureVisibleTab(undefined, {
    format: 'png',
  });

  const htmlContent = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.documentElement.outerHTML,
  });

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    sourceUrl: tab.url,
    screenshotBase64: screenshotUri,
    htmlContent: htmlContent?.[0]?.result ?? '',
    notes: '',
    linkedRubricIds: [],
  };
}
