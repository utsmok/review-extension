import { bench, describe } from "vitest";
import { minifyHtml } from "@/lib/minify";

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <!-- Page metadata -->
  <title>Sample Report</title>
</head>
<body>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Score</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Transparent</td>
        <td>3</td>
      </tr>
      <tr>
        <td>Reliable</td>
        <td>2</td>
      </tr>
    </tbody>
  </table>
  <ul>
    <li>Strength one</li>
    <li>Strength two</li>
    <li>Strength three</li>
  </ul>
  <p>This is a paragraph with some content.</p>
  <p>Another paragraph here.</p>
  <!-- End of content -->
</body>
</html>`;

const LARGE_HTML = SAMPLE_HTML.repeat(20);

describe("minifyHtml", () => {
  bench("small document", () => {
    minifyHtml(SAMPLE_HTML);
  });

  bench("large document (20x)", () => {
    minifyHtml(LARGE_HTML);
  });
});
