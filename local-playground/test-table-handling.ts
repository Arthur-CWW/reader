import { processHtml } from './enhanced-html-processor';

// HTML with tables to test
export const htmlWithTables = `
<!DOCTYPE html>
<html>
<head>
  <title>Table Test</title>
  <meta name="description" content="Testing how well the processor handles HTML tables">
</head>
<body>
  <h1>HTML Table Test</h1>
  
  <h2>Simple Table</h2>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Age</th>
        <th>Occupation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>John Doe</td>
        <td>34</td>
        <td>Engineer</td>
      </tr>
      <tr>
        <td>Jane Smith</td>
        <td>28</td>
        <td>Designer</td>
      </tr>
      <tr>
        <td>Sam Brown</td>
        <td>42</td>
        <td>Manager</td>
      </tr>
    </tbody>
  </table>
  
  <h2>Complex Table with Colspan/Rowspan</h2>
  <table>
    <thead>
      <tr>
        <th>Quarter</th>
        <th colspan="3">Sales (in thousands)</th>
      </tr>
      <tr>
        <th></th>
        <th>North</th>
        <th>South</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Q1</td>
        <td>$120</td>
        <td>$230</td>
        <td>$350</td>
      </tr>
      <tr>
        <td>Q2</td>
        <td>$145</td>
        <td>$215</td>
        <td>$360</td>
      </tr>
      <tr>
        <td rowspan="2">Q3 + Q4</td>
        <td>$160</td>
        <td>$250</td>
        <td>$410</td>
      </tr>
      <tr>
        <td>$170</td>
        <td>$240</td>
        <td>$410</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td>Total</td>
        <td>$595</td>
        <td>$935</td>
        <td>$1,530</td>
      </tr>
    </tfoot>
  </table>
  
  <h2>Nested Table</h2>
  <table>
    <tr>
      <th>Category</th>
      <th>Details</th>
    </tr>
    <tr>
      <td>Products</td>
      <td>
        <table>
          <tr>
            <th>Name</th>
            <th>Price</th>
          </tr>
          <tr>
            <td>Widget A</td>
            <td>$10.99</td>
          </tr>
          <tr>
            <td>Widget B</td>
            <td>$12.99</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>Services</td>
      <td>
        <table>
          <tr>
            <th>Type</th>
            <th>Rate</th>
          </tr>
          <tr>
            <td>Consulting</td>
            <td>$150/hr</td>
          </tr>
          <tr>
            <td>Support</td>
            <td>$75/hr</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Test how the processor handles tables
function testTableHandling() {
  console.log("Testing table handling with the enhanced HTML processor...");
  
  // Process as markdown (should handle tables)
  console.log("\n---------- MARKDOWN FORMAT ----------");
  const markdownResult = processHtml(htmlWithTables, 'markdown');
  console.log("Title:", markdownResult.title);
  console.log("Description:", markdownResult.description);
  console.log("\nProcessed Content:");
  console.log(markdownResult.content);
  
  // Process as text (for comparison)
  console.log("\n---------- TEXT FORMAT ----------");
  const textResult = processHtml(htmlWithTables, 'text');
  console.log("Title:", textResult.title);
  console.log("Description:", textResult.description);
  console.log("\nProcessed Content:");
  console.log(textResult.content);
}

// Run the test
if (require.main === module) {
  testTableHandling();
}

export { testTableHandling };