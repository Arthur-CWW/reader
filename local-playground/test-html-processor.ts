import { processHtml, FormatOption } from './minimal-html-processor';
// import fetch from 'node-fetch';
import * as fs from 'fs/promises';

/**
 * Fetch a webpage and process its HTML
 * @param url URL to fetch
 * @param format Format to use for processing
 * @returns The processed HTML content
 */
async function fetchAndProcess(url: string, format: FormatOption = 'markdown'): Promise<void> {
  try {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`Processing HTML (${Math.round(html.length / 1024)} KB) with ${format} format...`);

    const result = processHtml(html, format, url);

    // Print results
    console.log('\n----------- RESULTS -----------');
    console.log(`Title: ${result.title || 'No title'}`);
    console.log(`Description: ${result.description || 'No description'}`);
    console.log(`Found ${result.links.length} links`);

    // Write results to files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlSlug = new URL(url).hostname.replace(/\./g, '-');
    const baseFilename = `${urlSlug}-${timestamp}`;

    // Save content
    await fs.writeFile(`${baseFilename}-content.${format === 'markdown' ? 'md' : 'txt'}`, result.content);
    console.log(`Content saved to ${baseFilename}-content.${format === 'markdown' ? 'md' : 'txt'}`);

    // Save links
    const linksText = result.links
      .map(([text, href]) => `- [${text || 'No text'}](${href})`)
      .join('\n');
    await fs.writeFile(`${baseFilename}-links.md`, linksText);
    console.log(`Links saved to ${baseFilename}-links.md`);

    // Print content preview
    console.log('\n----------- CONTENT PREVIEW -----------');
    // console.log(result.content.slice(0, 1000) + (result.content.length > 1000 ? '...' : ''));
    console.log(result.content);
    await fs.writeFile(`${baseFilename}-content.txt`, result.content);


    // Print some links
    console.log('\n----------- LINKS PREVIEW -----------');
    // result.links.slice(0, 5).forEach(([text, href]) => {
    //   console.log(`- [${text || 'No text'}](${href})`);
    // });
    // await fs.writeFile(`${baseFilename}-links.txt`, linksText);
    // if (result.links.length > 5) {
    //   console.log(`... and ${result.links.length - 5} more links`);
    // }


  } catch (error) {
    console.error('Error processing URL:', error);
  }
}

/**
 * Run the test with different websites and formats
 */
async function runTests() {
  const urls = [
    'https://news.ycombinator.com/',
    'https://en.wikipedia.org/wiki/TypeScript',
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
  ];

  const formats: FormatOption[] = ['markdown', 'text'];

  for (const url of urls) {
    for (const format of formats) {
      console.log(`\n============================================`);
      console.log(`Testing URL: ${url} with format: ${format}`);
      console.log(`============================================\n`);
      await fetchAndProcess(url, format);
    }
  }
}

// Check if being run directly
if (require.main === module) {
  runTests().catch(console.error);
}

// Export for use in other files
export { fetchAndProcess };