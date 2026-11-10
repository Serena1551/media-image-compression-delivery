import assert from "node:assert/strict";
import { objectKey, shouldCompress } from "./compression_decision.ts";

const largePng = { image: "data:image/png;base64,x", filename: "hero.png", width: 1200, height: 900 };
assert.equal(shouldCompress(largePng), true);
assert.equal(objectKey(largePng), "optimized/hero.png");
assert.equal(shouldCompress({ ...largePng, filename: "small.jpg", width: 800, height: 600 }), false);
console.log("compression decision test passed");
