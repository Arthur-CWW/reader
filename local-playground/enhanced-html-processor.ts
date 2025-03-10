import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
// Import turndown plugins for GFM (GitHub Flavored Markdown)
const gfmPlugin = require('turndown-plugin-gfm');

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
  /** Performance metrics if enabled */
  performance?: {
    totalTime: number;
    parsingTime?: number;
    cleaningTime?: number;
    renderTime?: number;
  };
}

/**
 * Format options for HTML processing
 */
export type FormatOption = 'markdown' | 'text';

/**
 * Advanced options for HTML processing
 */
export interface ProcessingOptions {
  /** Format to convert to ('markdown' or 'text') */
  format?: FormatOption;
  /** Base URL for resolving relative links */
  baseUrl?: string;
  /** Whether to track and return performance metrics */
  trackPerformance?: boolean;
  /** CSS selector(s) for targeting specific content */
  targetSelector?: string | string[];
  /** CSS selector(s) for elements to remove */
  removeSelector?: string | string[];
  /** Whether to remove comments */
  removeComments?: boolean;
  /** Whether to process shadowDom content (requires special attributes to be present) */
  withShadowDom?: boolean;
  /** Whether to process iframes (requires special attributes to be present) */
  withIframe?: boolean;
}

/**
 * Process HTML into LLM-optimized format
 * 
 * This function takes HTML content and transforms it into a format optimized for LLMs,
 * with options for markdown or plain text output. It handles various cases like shadow DOM,
 * iframes, tables, and ensures proper extraction of links and other content.
 * 
 * Key features:
 * - Cleans HTML by removing scripts, styles, SVGs, and images
 * - Processes shadow DOM and iframe content if available
 * - Extracts links in [text, url][] format
 * - Uses Readability to extract main content
 * - Converts to markdown with support for tables (via GFM)
 * - Optimizes output for LLM processing
 * 
 * @param html Raw HTML string to process
 * @param formatOrOptions Format string or options object for processing
 * @param baseUrl Optional base URL for resolving relative links (if not using options object)
 * @returns Processed content, metadata, and links
 */
export function processHtml(
  html: string, 
  formatOrOptions: FormatOption | ProcessingOptions = 'markdown', 
  baseUrl?: string
): ProcessedHTML {
  const t0 = performance.now();
  let t1 = 0, t2 = 0;

  // Parse options
  const options: ProcessingOptions = typeof formatOrOptions === 'string' 
    ? { format: formatOrOptions, baseUrl } 
    : formatOrOptions;
  
  const format = options.format || 'markdown';
  const trackPerformance = options.trackPerformance || false;
  
  // Parse the HTML with linkedom
  const parseStartTime = trackPerformance ? performance.now() : 0;
  let dom = parseHTML(html);
  if (!dom.window.document.documentElement) {
    dom = parseHTML(`<html><body>${html}</body></html>`);
  }
  if (trackPerformance) t1 = performance.now();

  // Extract title and description
  const title = dom.window.document.title || '';
  const description = dom.window.document.head?.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  // Process shadow DOM content if available
  if (options.withShadowDom !== false) {
    dom.window.document.querySelectorAll('[data-shadow-host="true"]').forEach(host => {
      const shadowContent = host.getAttribute('data-shadow-content');
      if (shadowContent) {
        host.innerHTML = shadowContent;
      }
    });
  }
  
  // Process iframes if enabled
  if (options.withIframe !== false) {
    dom.window.document.querySelectorAll('iframe[src],frame[src]').forEach(iframe => {
      const frameContent = iframe.getAttribute('data-frame-content');
      if (frameContent) {
        iframe.innerHTML = frameContent;
        
        // Clean script and style tags from iframe content
        iframe.querySelectorAll('script, style').forEach(s => s.remove());
        
        // Fix relative URLs in iframes
        const src = iframe.getAttribute('src');
        if (src && options.baseUrl) {
          try {
            // Fix relative URLs in iframe content
            iframe.querySelectorAll('[src]').forEach(el => {
              const elemSrc = el.getAttribute('src');
              if (elemSrc && !elemSrc.match(/^(https?:)?\/\//)) {
                try {
                  el.setAttribute('src', new URL(elemSrc, src).toString());
                } catch (err) {
                  // Keep original src if URL parsing fails
                }
              }
            });
            
            // Fix relative links in iframe content
            iframe.querySelectorAll('[href]').forEach(el => {
              const href = el.getAttribute('href');
              if (href && !href.match(/^(https?:)?\/\//)) {
                try {
                  el.setAttribute('href', new URL(href, src).toString());
                } catch (err) {
                  // Keep original href if URL parsing fails
                }
              }
            });
          } catch (err) {
            // Ignore URL parsing errors
          }
        }
      }
    });
  }

  // Extract links before cleaning
  const links = Array.from(dom.window.document.querySelectorAll('a[href]'))
    .map((x: any) => {
      const text = x.textContent?.replace(/\s+/g, ' ').trim() || '';
      const href = x.getAttribute('href');
      if (!href) return null;
      if (href.startsWith('javascript:') || href.startsWith('file:')) return null;
      
      try {
        const url = options.baseUrl ? new URL(href, options.baseUrl).toString() : href;
        return [text, url] as [string, string];
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean) as [string, string][];

  // Remove SVGs
  dom.window.document.querySelectorAll('svg').forEach(x => x.innerHTML = '');

  // Clean up elements that aren't needed
  dom.window.document.querySelectorAll('script, style, noscript, meta, link[rel="stylesheet"]').forEach(el => el.remove());

  // Handle specific selectors to remove if provided
  if (options.removeSelector) {
    if (Array.isArray(options.removeSelector)) {
      options.removeSelector.forEach(selector => {
        dom.window.document.querySelectorAll(selector).forEach(el => el.remove());
      });
    } else {
      dom.window.document.querySelectorAll(options.removeSelector).forEach(el => el.remove());
    }
  }

  // Remove comments if enabled (defaults to true)
  if (options.removeComments !== false) {
    const treeWalker = dom.window.document.createTreeWalker(
      dom.window.document, 
      0x80 // Only show comment nodes (NodeFilter.SHOW_COMMENT = 128)
    );

    let currentNode;
    while ((currentNode = treeWalker.nextNode())) {
      currentNode.parentNode?.removeChild(currentNode);
    }
  }

  // Remove all images
  dom.window.document.querySelectorAll('img').forEach(img => img.remove());

  // Remove data- and aria- attributes to clean up the HTML
  dom.window.document.querySelectorAll('*').forEach(el => {
    const attrs = el.getAttributeNames();
    for (const attr of attrs) {
      if (attr.startsWith('data-') || attr.startsWith('aria-')) {
        el.removeAttribute(attr);
      }
    }
  });

  // Clean up redundant style attributes
  dom.window.document.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style')?.toLowerCase() || '';
    if (style.startsWith('display: none')) {
      // Keep display:none as it affects content visibility
      return;
    }
    el.removeAttribute('style');
  });

  // Process targetSelector if provided (to focus on specific content)
  let rootContent: Element | Document = dom.window.document;
  if (options.targetSelector) {
    const allNodes: Element[] = [];
    let bewareTargetContentDoesNotExist = false;
    
    if (Array.isArray(options.targetSelector)) {
      bewareTargetContentDoesNotExist = true;
      for (const selector of options.targetSelector) {
        dom.window.document.querySelectorAll(selector).forEach(el => {
          if (!allNodes.includes(el)) {
            allNodes.push(el);
          }
        });
      }
    } else {
      bewareTargetContentDoesNotExist = true;
      dom.window.document.querySelectorAll(options.targetSelector).forEach(el => {
        if (!allNodes.includes(el)) {
          allNodes.push(el);
        }
      });
    }

    // If we have elements matching the selector(s)
    if (allNodes.length > 0) {
      // Create a new document to hold the selected elements
      const selectedDoc = parseHTML('<html><body></body></html>').window.document;
      
      for (const node of allNodes) {
        selectedDoc.body.appendChild(node);
        selectedDoc.body.appendChild(selectedDoc.createTextNode('\n\n'));
      }
      
      rootContent = selectedDoc;
    } else if (bewareTargetContentDoesNotExist) {
      // If we were supposed to target specific content but found nothing,
      // we might want to signal this. Here we'll continue with the full document.
      console.warn('Target selector(s) did not match any content');
    }
  }

  if (trackPerformance) t2 = performance.now();

  // Try to extract main content with Readability
  let mainContent: string;
  let readabilityResult: any;
  
  // Use Readability if we're working with the full document
  if (rootContent === dom.window.document) {
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
  } else {
    // Use the targeted content if we've selected specific elements
    mainContent = (rootContent as Document).body.innerHTML;
  }

  // Process based on requested format
  let processedContent: string;
  const renderStartTime = trackPerformance ? performance.now() : 0;

  if (format === 'markdown') {
    // Configure Turndown for converting HTML to Markdown
    const turndownService = new TurndownService({
      codeBlockStyle: 'fenced',
      preformattedCode: true,
      headingStyle: 'atx',
      linkStyle: 'inlined'
    });
    
    // Add special handling for tables to support turndown-gfm
    prepareDomForTurndown(mainContent);
    
    // Add GFM (GitHub Flavored Markdown) plugins
    turndownService.use([
      gfmPlugin.tables,
      gfmPlugin.strikethrough,
      gfmPlugin.taskListItems
    ]);

    // Add rules to improve output
    turndownService.addRule('remove-irrelevant', {
      filter: ['style', 'script', 'noscript', 'link', 'textarea', 'select'],
      replacement: () => ''
    });
    
    turndownService.addRule('remove-empty-paragraphs', {
      filter: 'p',
      replacement: (content) => {
        return content.trim() ? content + '\n\n' : '';
      }
    });
    
    // Add rule for improved code blocks
    turndownService.addRule('improved-code', {
      filter: function (node: any) {
        const hasSiblings = node.previousSibling || node.nextSibling;
        const isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;
        return node.nodeName === 'CODE' && !isCodeBlock;
      },
      replacement: function (content: string) {
        if (!content) return '';
        
        let delimiter = '`';
        const matches = content.match(/`+/gm) || [];
        while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + '`';
        
        if (content.includes('\n')) {
          delimiter = '```';
        }
        
        const extraSpace = delimiter === '```' ? '\n' : /^`|^ .*?[^ ].* $|`$/.test(content) ? ' ' : '';
        return delimiter + extraSpace + content + (delimiter === '```' && !content.endsWith(extraSpace) ? extraSpace : '') + delimiter;
      }
    });
    
    // Add rule for improved link handling
    turndownService.addRule('improved-links', {
      filter: function (node, options) {
        return Boolean(
          options.linkStyle === 'inlined' &&
          node.nodeName === 'A' &&
          node.getAttribute('href')
        );
      },
      replacement: function (content, node: any) {
        const href = node.getAttribute('href');
        let title = node.getAttribute('title');
        if (title) title = ' "' + title.replace(/"/g, '\\"') + '"';
        
        const fixedContent = content.replace(/\s+/g, ' ').trim();
        let fixedHref = href.replace(/\s+/g, '').trim();
        
        if (options.baseUrl) {
          try {
            fixedHref = new URL(fixedHref, options.baseUrl).toString();
          } catch (err) {
            // Keep original href if URL parsing fails
          }
        }
        
        return `[${fixedContent}](${fixedHref}${title || ''})`;
      }
    });

    try {
      processedContent = turndownService.turndown(mainContent);
    } catch (err) {
      // Fallback to plain text if Markdown conversion fails
      const parsedDom = parseHTML(mainContent);
      processedContent = parsedDom.window.document.body.textContent?.trim() || '';
      console.warn('Markdown conversion failed, falling back to text', err);
    }
  } else {
    // Text format - just extract text content
    const parsedDom = parseHTML(mainContent);
    processedContent = parsedDom.window.document.body.textContent?.trim() || '';
  }

  // Clean up redundant empty lines
  const cleanedContent = cleanRedundantEmptyLines(processedContent);
  const t3 = performance.now();

  // Build result
  const result: ProcessedHTML = {
    content: cleanedContent,
    title: readabilityResult?.title || title,
    description,
    links
  };
  
  // Add performance metrics if tracking is enabled
  if (trackPerformance) {
    result.performance = {
      totalTime: Math.round(t3 - t0),
      parsingTime: Math.round(t1 - parseStartTime),
      cleaningTime: Math.round(t2 - t1),
      renderTime: Math.round(t3 - renderStartTime)
    };
  }

  return result;
}

/**
 * Prepares DOM content for Turndown by adding special handling for tables
 * This mimics the logic in the original jsdom.ts snippetToElement method
 */
function prepareDomForTurndown(html: string): void {
  const dom = parseHTML(html);
  
  // Special handling for tables to support turndown-gfm
  dom.window.document.querySelectorAll('table').forEach(table => {
    // Turndown GFM plugin expects a rows property on tables
    Object.defineProperty(table, 'rows', { 
      value: Array.from(table.querySelectorAll('tr')), 
      enumerable: true 
    });
  });
}

/**
 * Removes redundant empty lines from text
 * 
 * This improves readability by ensuring that there are no excessive
 * empty lines, while preserving paragraph breaks.
 */
function cleanRedundantEmptyLines(text: string): string {
  const lines = text.split(/\r?\n/g);
  const mappedFlag = lines.map(line => Boolean(line.trim()));
  return lines.filter((_, i) => mappedFlag[i] || mappedFlag[i - 1]).join('\n');
}