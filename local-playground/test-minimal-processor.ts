import { processHtml } from './minimal-llm-processor';

/**
 * Minimal test for the HTML processor
 */
async function testMinimalProcessor() {
  // Test with a web page that contains tables
  console.log("Testing minimal LLM processor with Wikipedia...\n");

  try {
    // Fetch a page with tables
    const response = await fetch("https://en.wikipedia.org/wiki/Comparison_of_programming_languages");
    const html = await response.text();

    // Process with minimal processor
    console.log("Processing HTML to markdown...");
    const result = processHtml(html, 'markdown', "https://en.wikipedia.org/wiki/Comparison_of_programming_languages");

    // Show basic stats
    console.log(`Title: ${result.title}`);
    console.log(`Extracted ${result.links.length} links`);

    // Show content preview
    console.log("\nContent preview (first 1000 chars):");
    console.log(result.content.slice(0, 1000) + "...");

    // Show some links
    console.log("\nFirst 5 links:");
    result.links.slice(0, 5).forEach(([text, url], index) => {
      console.log(`${index + 1}. [${text}](${url})`);
    });

    // Test text format
    console.log("\n\nProcessing HTML to plain text...");
    const textResult = processHtml(html, 'text', "https://en.wikipedia.org/wiki/Comparison_of_programming_languages");

    // Show text content preview
    console.log("\nText content preview (first 500 chars):");
    console.log(textResult.content.slice(0, 500) + "...");

  } catch (error) {
    console.error("Error processing HTML:", error);
  }
}

// Run the test if executed directly
if (require.main === module) {
  testMinimalProcessor().catch(console.error);
}

export { testMinimalProcessor };