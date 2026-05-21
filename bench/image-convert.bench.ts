import { bench, describe } from "vitest";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/lib/image-convert";

// Generate sample base64 data of different sizes
const SMALL_B64 = btoa("Hello, World!".repeat(10));
const MEDIUM_B64 = btoa("A".repeat(4096));
const LARGE_B64 = btoa("B".repeat(16384));

const SMALL_ARRAY = base64ToUint8Array(SMALL_B64);
const MEDIUM_ARRAY = base64ToUint8Array(MEDIUM_B64);
const LARGE_ARRAY = base64ToUint8Array(LARGE_B64);

describe("base64ToUint8Array", () => {
  bench("small payload (~130 bytes)", () => {
    base64ToUint8Array(SMALL_B64);
  });

  bench("medium payload (4 KB)", () => {
    base64ToUint8Array(MEDIUM_B64);
  });

  bench("large payload (16 KB)", () => {
    base64ToUint8Array(LARGE_B64);
  });
});

describe("uint8ArrayToBase64", () => {
  bench("small payload (~130 bytes)", () => {
    uint8ArrayToBase64(SMALL_ARRAY);
  });

  bench("medium payload (4 KB)", () => {
    uint8ArrayToBase64(MEDIUM_ARRAY);
  });

  bench("large payload (16 KB)", () => {
    uint8ArrayToBase64(LARGE_ARRAY);
  });
});
