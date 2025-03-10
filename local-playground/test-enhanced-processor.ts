import { processHtml } from './enhanced-html-processor';
import fetch from 'node-fetch';

/**
 * Test the HTML processor with a real website
 */
async function testWithRealWebsite(url: string) {
  try {
    console.log(`Fetching ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`Processing HTML (${Math.round(html.length / 1024)} KB)...`);
    
    // Process as markdown
    console.log('\n---------- MARKDOWN FORMAT ----------');
    const markdownResult = processHtml(html, 'markdown', url);
    console.log(`Title: ${markdownResult.title || 'No title'}`);
    console.log(`Description: ${markdownResult.description || 'No description'}`);
    console.log(`Found ${markdownResult.links.length} links`);
    
    console.log('\nContent Preview:');
    console.log(markdownResult.content.slice(0, 1000) + (markdownResult.content.length > 1000 ? '...' : ''));
    
    // Process as text
    console.log('\n---------- TEXT FORMAT ----------');
    const textResult = processHtml(html, 'text', url);
    console.log(`Title: ${textResult.title || 'No title'}`);
    console.log(`Description: ${textResult.description || 'No description'}`);
    console.log(`Found ${textResult.links.length} links`);
    
    console.log('\nContent Preview:');
    console.log(textResult.content.slice(0, 1000) + (textResult.content.length > 1000 ? '...' : ''));
    
    // Display some links
    console.log('\n---------- LINKS PREVIEW ----------');
    markdownResult.links.slice(0, 5).forEach(([text, href], index) => {
      console.log(`${index + 1}. [${text || 'No text'}](${href})`);
    });
    if (markdownResult.links.length > 5) {
      console.log(`... and ${markdownResult.links.length - 5} more links`);
    }
    
  } catch (error) {
    console.error('Error processing URL:', error);
  }
}

// Run the test with some example websites
async function main() {
  // Test with a variety of websites
  const testUrls = [
    'https://en.wikipedia.org/wiki/Web_scraping',
    'https://news.ycombinator.com/',
    'https://developer.mozilla.org/en-US/docs/Web/HTML'
  ];
  
  for (const url of testUrls) {
    console.log('\n\n=========================================');
    console.log(`TESTING URL: ${url}`);
    console.log('=========================================\n');
    await testWithRealWebsite(url);
  }
}

// Run the test if this module is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { testWithRealWebsite };