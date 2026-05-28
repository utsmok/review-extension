import { bench, describe } from "vitest";
import { minifyCss, minifyHtml } from "@/lib/minify";

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

const SAMPLE_CSS = `
/* Report styles */
:root {
  --magenta: #8e036c;
  --muted: #6c757d;
  --text: #212529;
  --ff-heading: "Inter", sans-serif;
  --spacing: 16px;
  --radius: 8px;
  --bg: #f8f9fa;
  --border: #dee2e6;
}

h1 {
  color: var(--magenta);
  font-family: var(--ff-heading);
  margin-bottom: var(--spacing);
}

.card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--spacing);
  color: var(--text);
}

.muted {
  color: var(--muted);
  font-size: 0.875rem;
}

/* Distribution bar */
.dist-bar {
  display: flex;
  height: 10px;
  border-radius: 2px;
  overflow: hidden;
}

.dist-seg {
  height: 100%;
}

// Line comment to remove
.footer {
  margin-top: var(--spacing);
  color: var(--muted);
}
`;

const LARGE_HTML = SAMPLE_HTML.repeat(20);
const LARGE_CSS = SAMPLE_CSS.repeat(10);

describe("minifyHtml", () => {
  bench("small document", () => {
    minifyHtml(SAMPLE_HTML);
  });

  bench("large document (20x)", () => {
    minifyHtml(LARGE_HTML);
  });
});

describe("minifyCss", () => {
  bench("stylesheet with variables", () => {
    minifyCss(SAMPLE_CSS);
  });

  bench("large stylesheet (10x)", () => {
    minifyCss(LARGE_CSS);
  });
});
