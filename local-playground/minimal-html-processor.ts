import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import TurndownService from "turndown";

/**
 * Interface for the returned data from HTML processing
 */
export interface ProcessedHTML {
  /** The main content in processed format */
  content: string;
  /** Page title if available */
  title?: string;
  /** Page description if available */
  description?: string;
  /** Extracted links in [text, url][] format */
  links: [string, string][];
}

/**
 * Format options for HTML processing
 */
export type FormatOption = 'markdown' | 'text';

/**
 * Process HTML into LLM-optimized format
 * @param html Raw HTML string to process
 * @param format The format to convert to ('markdown' or 'text')
 * @param baseUrl Optional base URL for resolving relative links
 * @returns Processed content and links
 */
export function processHtml(html: string, format: FormatOption = 'markdown', baseUrl?: string): ProcessedHTML {
  // Parse the HTML with linkedom
  let dom = parseHTML(html);
  if (!dom.window.document.documentElement) {
    dom = parseHTML(`<html><body>${html}</body></html>`);
  }

  // Extract title and description
  const title = dom.window.document.title || '';
  const description = dom.window.document.head?.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  // Process shadow DOM content if available
  dom.window.document.querySelectorAll('[data-shadow-host="true"]').forEach(host => {
    const shadowContent = host.getAttribute('data-shadow-content');
    if (shadowContent) {
      host.innerHTML = shadowContent;
    }
  });

  // Process iframes
  dom.window.document.querySelectorAll('iframe[src],frame[src]').forEach(iframe => {
    const frameContent = iframe.getAttribute('data-frame-content');
    if (frameContent) {
      iframe.innerHTML = frameContent;
      iframe.querySelectorAll('script, style').forEach(s => s.remove());
    }
  });

  // Extract links before cleaning
  const links = Array.from(dom.window.document.querySelectorAll('a[href]'))
    .map((x: any) => {
      const text = x.textContent?.replace(/\s+/g, ' ').trim() || '';
      const href = x.getAttribute('href');
      if (!href) return null;

      try {
        const url = baseUrl ? new URL(href, baseUrl).toString() : href;
        return [text, url] as [string, string];
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean) as [string, string][];

  // Remove SVGs
  dom.window.document.querySelectorAll('svg').forEach(x => x.innerHTML = '');

  // Clean up elements that aren't needed
  dom.window.document.querySelectorAll('script, style, noscript, meta').forEach(el => el.remove());

  // Remove all images
  dom.window.document.querySelectorAll('img').forEach(img => img.remove());

  // Try to extract main content with Readability
  let mainContent: string;
  let readabilityResult: ReturnType<Readability["parse"]> = null;
  try {
    readabilityResult = new Readability(dom.window.document.cloneNode(true) as any).parse();
    if (readabilityResult && readabilityResult.content) {
      mainContent = readabilityResult.content;
    } else {
      mainContent = dom.window.document.body.innerHTML;
    }
  } catch (err) {
    // Fallback to body content if Readability fails
    mainContent = dom.window.document.body.innerHTML;
  }

  // Process based on requested format
  let processedContent: string;

  if (format === 'markdown') {
    // Configure Turndown for converting HTML to Markdown
    const turndownService = new TurndownService({
      codeBlockStyle: 'fenced',
      preformattedCode: true,
      headingStyle: 'atx',
      linkStyle: 'inlined'
    });

    // Add rules to improve output
    turndownService.addRule('remove-empty-paragraphs', {
      filter: 'p',
      replacement: (content) => {
        return content.trim() ? content + '\n\n' : '';
      }
    });

    try {
      processedContent = turndownService.turndown(mainContent);
    } catch (err) {
      // Fallback to plain text if Markdown conversion fails
      processedContent = dom.window.document.body.textContent?.trim() || '';
    }
  } else {
    // Text format - just extract text content
    const parsedDom = parseHTML(mainContent);
    processedContent = parsedDom.window.document.body.textContent?.trim() || '';
  }

  // Clean up redundant empty lines
  const cleanedContent = cleanRedundantEmptyLines(processedContent);

  return {
    content: cleanedContent,
    title: readabilityResult?.title || title,
    description,
    links
  };
}

/**
 * Removes redundant empty lines from text
 */
function cleanRedundantEmptyLines(text: string): string {
  const lines = text.split(/\r?\n/g);
  const mappedFlag = lines.map(line => Boolean(line.trim()));
  return lines.filter((_, i) => mappedFlag[i] || mappedFlag[i - 1]).join('\n');
}