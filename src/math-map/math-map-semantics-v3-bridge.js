// Preserve the canonical v3 runtime under a distinct browser global before
// the legacy v2 presentation runtime is loaded for Project View maps.
(function preserveCanonicalMathMapSemanticsV3(root) {
  "use strict";
  if (!root?.GammaMathMapSemantics?.deriveMathState) {
    throw new Error("Canonical Math Map semantics v3 failed to load");
  }
  root.GammaMathMapSemanticsV3 = root.GammaMathMapSemantics;
})(typeof window !== "undefined" ? window : globalThis);
