import { bench, describe } from "vitest";
import { sanitizeFilename } from "@/lib/export";

describe("sanitizeFilename", () => {
  bench("simple name", () => {
    sanitizeFilename("MyReport");
  });

  bench("name with special characters", () => {
    sanitizeFilename('Test<Tool>:"Report"/file\\name|?.doc');
  });

  bench("name with path traversal", () => {
    sanitizeFilename("../../etc/passwd");
  });

  bench("name with control characters", () => {
    sanitizeFilename("file\x00name\x1Fwith\x0Acontrol");
  });

  bench("long name with mixed content", () => {
    sanitizeFilename(
      'A Very Long Tool Name With Special <Characters> & "Quotes" / Slashes \\ And More | Symbols ? * End',
    );
  });

  bench("empty string", () => {
    sanitizeFilename("");
  });
});
