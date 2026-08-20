/**
 * @file paper-entry-consolidation-v1.js
 * Deterministic consolidation runner for converting a Raw Entry Pool artifact
 * into an independently scorable and valid Paper Entry artifact.
 * Schema: cmath.paper-entry-artifact/v1
 * ConsolidationModuleVersion: paper-entry-consolidation-v1
 */
(function publishPaperEntryConsolidation(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CMathPaperEntryConsolidationV1 = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this), function createPaperEntryConsolidationModule(root) {
  "use strict";

  const ENTRY_ARTIFACT_SCHEMA = "cmath.paper-entry-artifact/v1";
  const CONSOLIDATION_MODULE_VERSION = "paper-entry-consolidation-v1";
  const RAW_ENTRY_POOL_SCHEMA = "cmath.paper-raw-entry-pool/v1";

  const VALID_FACT_TYPES = new Set(["definition", "algorithm", "calculation"]);
  const VALID_CLAIM_TYPES = new Set(["lemma", "proposition", "theorem"]);

  function stripControlCharacters(text) {
    if (typeof text !== "string") return text;
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
  }

  function isObject(val) {
    return val !== null && typeof val === "object" && !Array.isArray(val);
  }

  function cloneJson(val) {
    if (val === undefined) return undefined;
    return JSON.parse(JSON.stringify(val));
  }

  /**
   * Recursively deep freeze an object to enforce immutability.
   */
  function freezePaperEntryArtifact(target) {
    if (target === null || typeof target !== "object") return target;
    const propNames = Object.getOwnPropertyNames(target);
    for (const name of propNames) {
      const value = target[name];
      if (value !== null && typeof value === "object") {
        freezePaperEntryArtifact(value);
      }
    }
    return Object.freeze(target);
  }

  function hasBalancedMathDelimiters(text) {
    if (typeof text !== "string") return true;
    let inDollarInline = false;
    let inDollarDisplay = false;
    let inParenInline = false;
    let inBracketDisplay = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && text[j] === "\\") {
        backslashCount += 1;
        j -= 1;
      }
      const isEscaped = backslashCount % 2 === 1;

      if (!isEscaped && text[i] === "$") {
        const isDouble = i + 1 < len && text[i + 1] === "$";
        if (inDollarDisplay) {
          if (isDouble) {
            inDollarDisplay = false;
            i += 2;
            continue;
          }
        } else if (inDollarInline) {
          if (!isDouble) {
            inDollarInline = false;
            i += 1;
            continue;
          } else {
            return false;
          }
        } else {
          if (isDouble) {
            inDollarDisplay = true;
            i += 2;
            continue;
          } else {
            inDollarInline = true;
            i += 1;
            continue;
          }
        }
      } else if (!isEscaped && text[i] === "\\" && i + 1 < len) {
        const nextChar = text[i + 1];
        if (nextChar === "(") {
          if (inParenInline) return false;
          inParenInline = true;
          i += 2;
          continue;
        } else if (nextChar === ")") {
          if (!inParenInline) return false;
          inParenInline = false;
          i += 2;
          continue;
        } else if (nextChar === "[") {
          if (inBracketDisplay) return false;
          inBracketDisplay = true;
          i += 2;
          continue;
        } else if (nextChar === "]") {
          if (!inBracketDisplay) return false;
          inBracketDisplay = false;
          i += 2;
          continue;
        }
      }
      i += 1;
    }

    return !inDollarInline && !inDollarDisplay && !inParenInline && !inBracketDisplay;
  }

  function validateMathDelimiters(value, label) {
    if (typeof value !== "string") return;
    if (!hasBalancedMathDelimiters(value)) {
      throw new Error(`${label} 包含未配对的数学公式定界符 $ 或 $$（请确保成对闭合或使用 \\$ 转义）`);
    }
  }

  function normalizeEntryType(rawType) {
    if (typeof rawType !== "string") return null;
    const lower = rawType.trim().toLowerCase();
    if (lower === "def" || lower === "defn" || lower === "definition") return "definition";
    if (lower === "algo" || lower === "algorithm") return "algorithm";
    if (lower === "calc" || lower === "calculation") return "calculation";
    if (lower === "lem" || lower === "lemma") return "lemma";
    if (lower === "prop" || lower === "proposition") return "proposition";
    if (lower === "thm" || lower === "theorem" || lower === "corollary" || lower === "cor") return "theorem";
    if (VALID_FACT_TYPES.has(lower) || VALID_CLAIM_TYPES.has(lower)) return lower;
    return null;
  }

  function normalizeRawCandidate(entry, pageCount) {
    if (!isObject(entry)) return null;

    const rawId = entry.id;
    if (typeof rawId !== "string" || !rawId.trim()) return null;
    const id = stripControlCharacters(rawId.trim());

    const rawKind = entry.type || entry.kind || entry.claimKind || entry.factKind || entry.entryClass;
    const normalizedType = normalizeEntryType(rawKind);
    if (!normalizedType) return null;

    const rawStatement = entry.statement ?? entry.description ?? entry.content ?? "";
    if (typeof rawStatement !== "string" || !rawStatement.trim()) return null;
    const statement = stripControlCharacters(rawStatement.trim());

    const rawName = (typeof entry.name === "string" && entry.name.trim())
      ? entry.name.trim()
      : ((typeof entry.title === "string" && entry.title.trim())
        ? entry.title.trim()
        : ((typeof entry.shortTitle === "string" && entry.shortTitle.trim())
          ? entry.shortTitle.trim()
          : id));
    const name = stripControlCharacters(rawName);

    const isMathValid = hasBalancedMathDelimiters(statement)
      && (name ? hasBalancedMathDelimiters(name) : true);

    const pageNum = Number(entry.page);
    const isPageValid = Number.isInteger(pageNum) && pageNum >= 1 && (pageCount ? pageNum <= pageCount : true);
    if (!isPageValid) {
      return null;
    }
    const page = pageNum;

    let num = undefined;
    const parsedNum = Number(entry.num);
    if (Number.isInteger(parsedNum) && parsedNum > 0) {
      num = parsedNum;
    }

    let external = undefined;
    let source = undefined;
    if (entry.external === true) {
      external = true;
      if (typeof entry.source === "string" && entry.source.trim()) {
        source = stripControlCharacters(entry.source.trim());
      } else if (typeof entry.sourceReference === "string" && entry.sourceReference.trim()) {
        source = stripControlCharacters(entry.sourceReference.trim());
      }
    } else if (typeof entry.source === "string" && entry.source.trim()) {
      source = stripControlCharacters(entry.source.trim());
    }

    const factKinds = new Set(["definition","algorithm","calculation"]);
    const canonicalClass = factKinds.has(normalizedType) ? "fact" : "claim";
    const candidate = {
      id,
      type: normalizedType,
      entryClass: normalizedType,
      ...(canonicalClass === "fact" ? { factKind: normalizedType } : { claimKind: normalizedType }),
      name,
      statement,
      page,
      ...(num !== undefined ? { num } : {}),
      ...(external === true ? { external: true } : {}),
      ...(source !== undefined ? { source } : {}),
      _meta: {
        isMathValid,
        isPageValid: true,
        provenance: entry._provenance ?? null,
      },
    };

    return candidate;
  }

  /**
   * Deterministic duplicate candidate comparator.
   * Prefers intact LaTeX over corrupted variant, valid page over invalid, more complete fields,
   * without mutating or rewriting the statement text.
   */
  function scoreCandidate(candidate) {
    let score = 0;
    // 1. Mathematical delimiter integrity (highest priority)
    if (candidate._meta?.isMathValid) score += 10000;
    // 2. Page validity within document bounds
    if (candidate._meta?.isPageValid) score += 2000;
    // 3. Completeness of metadata
    if (candidate.name && candidate.name !== candidate.id) score += 100;
    if (candidate.num !== undefined) score += 50;
    if (candidate.external && candidate.source) score += 50;
    // 4. Statement length/detail (favor complete, non-empty statement up to cap)
    score += Math.min(candidate.statement.length, 300);
    return score;
  }

  function compareCandidates(a, b) {
    const scoreDiff = scoreCandidate(b) - scoreCandidate(a);
    if (scoreDiff !== 0) return scoreDiff;

    // Deterministic tie-breakers:
    // Earlier chunk index
    const chunkA = a._meta?.provenance?.chunkIndex ?? 0;
    const chunkB = b._meta?.provenance?.chunkIndex ?? 0;
    if (chunkA !== chunkB) return chunkA - chunkB;

    // Earlier page
    if (a.page !== b.page) return a.page - b.page;

    // Lexical stability
    return a.statement.localeCompare(b.statement);
  }

  /**
   * Deterministically consolidate raw entry pool into final Entry artifact.
   * Performs ZERO model/network/fetch calls.
   */
  function consolidateRawEntryPool(rawPoolInput, options = {}) {
    const startedAt = performance.now();

    if (!isObject(rawPoolInput)) {
      throw new Error("rawPool 必须是非空对象");
    }

    const source = rawPoolInput.source || {};
    const fileName = stripControlCharacters(String(source.fileName || "paper.pdf").trim());
    const pageCount = Number(source.pageCount || 1);
    const sourceText = stripControlCharacters(String(source.sourceText || ""));
    const characters = sourceText.length;

    const rawEntries = Array.isArray(rawPoolInput.rawEntries)
      ? rawPoolInput.rawEntries
      : (Array.isArray(rawPoolInput.entries) ? rawPoolInput.entries : (Array.isArray(rawPoolInput.chunks) ? rawPoolInput.chunks.flatMap((c) => c.rawEntries || c.entries || []) : []));

    // Group normalized candidates by ID
    const candidatesById = new Map();
    let malformedCount = 0;
    let invalidPageCount = 0;

    for (const rawEntry of rawEntries) {
      if (!isObject(rawEntry)) {
        malformedCount += 1;
        continue;
      }
      const pageNum = Number(rawEntry.page);
      const isPageValid = Number.isInteger(pageNum) && pageNum >= 1 && (pageCount ? pageNum <= pageCount : true);
      if (!isPageValid) {
        invalidPageCount += 1;
        malformedCount += 1;
        continue;
      }

      const candidate = normalizeRawCandidate(rawEntry, pageCount);
      if (!candidate) {
        malformedCount += 1;
        continue;
      }
      if (!candidatesById.has(candidate.id)) {
        candidatesById.set(candidate.id, []);
      }
      candidatesById.get(candidate.id).push(candidate);
    }

    const consolidatedEntries = [];
    let deduplicatedCount = 0;
    let discardedDamagedCount = 0;

    for (const [id, group] of candidatesById.entries()) {
      if (group.length === 1) {
        const single = group[0];
        // If single candidate has invalid math and strict mode is on, check if discard needed
        if (!single._meta.isMathValid && options.strictMath) {
          // If unbalanced and strictMath, discard mathematically damaged lone candidate
          discardedDamagedCount += 1;
          continue;
        }
        const { _meta, ...cleanEntry } = single;
        consolidatedEntries.push(cleanEntry);
      } else {
        // Multiple candidates with same ID: sort and pick the safest/best candidate
        group.sort(compareCandidates);
        const best = group[0];
        deduplicatedCount += (group.length - 1);

        if (!best._meta.isMathValid && options.strictMath) {
          discardedDamagedCount += 1;
          continue;
        }

        const { _meta, ...cleanEntry } = best;

        // Preserve legitimate metadata from duplicate candidates if missing on best candidate
        if (cleanEntry.name === cleanEntry.id) {
          const candidateWithName = group.find((c) => c.name && c.name !== c.id && c._meta?.isMathValid);
          if (candidateWithName) {
            cleanEntry.name = candidateWithName.name;
          }
        }
        if (cleanEntry.num === undefined) {
          const candidateWithNum = group.find((c) => c.num !== undefined);
          if (candidateWithNum) {
            cleanEntry.num = candidateWithNum.num;
          }
        }
        if (!cleanEntry.external) {
          const candidateWithExternal = group.find((c) => c.external === true && c.source);
          if (candidateWithExternal) {
            cleanEntry.external = true;
            cleanEntry.source = candidateWithExternal.source;
          }
        } else if (!cleanEntry.source) {
          const candidateWithSource = group.find((c) => c.source);
          if (candidateWithSource) {
            cleanEntry.source = candidateWithSource.source;
          }
        }

        consolidatedEntries.push(cleanEntry);
      }
    }

    // Deterministic sort of consolidated entries: by page, then by num (if present), then by id
    consolidatedEntries.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (a.num !== undefined && b.num !== undefined) return a.num - b.num;
      return a.id.localeCompare(b.id);
    });

    const aliases = Object.fromEntries(consolidatedEntries.map((e) => [e.id, e.id]));

    const durationMs = Math.round(performance.now() - startedAt);

    const artifact = {
      schema: ENTRY_ARTIFACT_SCHEMA,
      entryModuleVersion: CONSOLIDATION_MODULE_VERSION,
      source: {
        fileName,
        pageCount,
        characters,
        sourceText,
      },
      paperGuide: { title: "", leads: [] },
      guideLeadSet: { leads: [] },
      lanes: {
        coverageEntries: cloneJson(consolidatedEntries),
        leadGuidedEntries: [],
      },
      aggregation: {
        records: cloneJson(consolidatedEntries),
        conflicts: [],
        counts: {
          coverage: consolidatedEntries.length,
          leadGuided: 0,
          total: consolidatedEntries.length,
          conflicts: 0,
        },
      },
      entries: cloneJson(consolidatedEntries),
      aliases,
      reviewInputs: {
        missingExtractionCandidates: [],
        externalEvidenceIndex: null,
        externalBoundaryCandidates: null,
        protectedClaimIds: [],
        canonicalIndex: { ...aliases },
      },
      diagnostics: {
        durationMs,
        stages: [{ stage: "consolidate", atMs: durationMs }],
        calls: [], // Exactly 0 model/network calls
        consolidationSummary: {
          rawPoolSchema: rawPoolInput.schema ?? RAW_ENTRY_POOL_SCHEMA,
          rawEntryCount: rawEntries.length,
          malformedCount,
          invalidPageCount,
          deduplicatedCount,
          discardedDamagedCount,
          consolidatedEntryCount: consolidatedEntries.length,
        },
        moduleIdentity: {
          name: CONSOLIDATION_MODULE_VERSION,
          schema: ENTRY_ARTIFACT_SCHEMA,
        },
      },
    };

    return freezePaperEntryArtifact(artifact);
  }

  return Object.freeze({
    ENTRY_ARTIFACT_SCHEMA,
    CONSOLIDATION_MODULE_VERSION,
    RAW_ENTRY_POOL_SCHEMA,
    consolidateRawEntryPool,
    freezePaperEntryArtifact,
    normalizeEntryType,
    hasBalancedMathDelimiters,
    validateMathDelimiters,
    stripControlCharacters,
  });
});
