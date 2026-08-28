import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateBenchmarkVNext,
  evaluateSemanticState,
  evaluateSourceFidelity,
} from "../scripts/evaluate-benchmark-vnext.mjs";

function state({
  prefix,
  wording = "standard",
  entryOrder = "forward",
  inferenceOrder = "forward",
  b0ClaimEntryIds = null,
  includeProof = true,
  includeNegationPair = false,
} = {}) {
  const entries = [
    {
      id: `${prefix}:fact:definition`,
      entryClass: "fact",
      factKind: "definition",
      title: wording === "different" ? "A selected base object" : "Base object",
      statement: wording === "different"
        ? "The chosen object is the base object used by the construction."
        : "The base object used by the construction.",
    },
    {
      id: `${prefix}:claim:b0`,
      entryClass: "claim",
      claimKind: "lemma",
      title: "Boundary lemma",
      statement: "The boundary condition holds.",
    },
    {
      id: `${prefix}:claim:goal`,
      entryClass: "claim",
      claimKind: "theorem",
      title: "Main theorem",
      statement: "The main conclusion follows.",
    },
  ];

  const inferences = includeProof
    ? [{
      id: `${prefix}:proof:goal`,
      operationKind: "proof",
      premises: [
        `${prefix}:fact:definition`,
        `${prefix}:claim:b0`,
      ],
      conclusion: `${prefix}:claim:goal`,
      argument: "Apply the definition and the boundary lemma.",
    }]
    : [];

  if (entryOrder === "reverse") entries.reverse();
  if (inferenceOrder === "reverse") inferences.reverse();

  return {
    entries,
    inferences,
    negationPairs: includeNegationPair
      ? [{ claimEntryIds: [`${prefix}:claim:b0`, `${prefix}:claim:goal`] }]
      : [],
    b0ClaimEntryIds: b0ClaimEntryIds ?? [`${prefix}:claim:b0`],
  };
}

function splitFactState(prefix) {
  return {
    entries: [
      {
        id: `${prefix}:fact:left`,
        entryClass: "fact",
        factKind: "definition",
        title: "Chosen base object",
        statement: "The selected object used as the base of the construction.",
      },
      {
        id: `${prefix}:fact:right`,
        entryClass: "fact",
        factKind: "definition",
        title: "Base object data",
        statement: "The base object data needed by the construction.",
      },
      {
        id: `${prefix}:claim:b0`,
        entryClass: "claim",
        claimKind: "lemma",
        title: "Boundary lemma",
        statement: "The boundary condition holds.",
      },
      {
        id: `${prefix}:claim:goal`,
        entryClass: "claim",
        claimKind: "theorem",
        title: "Main theorem",
        statement: "The main conclusion follows.",
      },
    ],
    inferences: [{
      id: `${prefix}:proof:goal`,
      operationKind: "proof",
      premises: [
        `${prefix}:fact:left`,
        `${prefix}:fact:right`,
        `${prefix}:claim:b0`,
      ],
      conclusion: `${prefix}:claim:goal`,
      argument: "Apply both pieces of the definition and the boundary lemma.",
    }],
    negationPairs: [],
    b0ClaimEntryIds: [`${prefix}:claim:b0`],
  };
}

function reciprocalCycleState(prefix) {
  return {
    entries: [
      {
        id: `${prefix}:fact:definition`,
        entryClass: "fact",
        factKind: "definition",
        title: "Base object",
        statement: "The base object used by the construction.",
      },
      {
        id: `${prefix}:claim:a`,
        entryClass: "claim",
        claimKind: "lemma",
        title: "First cyclic claim",
        statement: "The first cyclic claim holds.",
      },
      {
        id: `${prefix}:claim:b`,
        entryClass: "claim",
        claimKind: "theorem",
        title: "Second cyclic claim",
        statement: "The second cyclic claim holds.",
      },
    ],
    inferences: [
      {
        id: `${prefix}:proof:a-to-b`,
        operationKind: "proof",
        premises: [`${prefix}:claim:a`],
        conclusion: `${prefix}:claim:b`,
        argument: "Use the first claim.",
      },
      {
        id: `${prefix}:proof:b-to-a`,
        operationKind: "proof",
        premises: [`${prefix}:claim:b`],
        conclusion: `${prefix}:claim:a`,
        argument: "Use the second claim.",
      },
    ],
    negationPairs: [],
    b0ClaimEntryIds: [],
  };
}

test("semantically same maps with different IDs and array order auto-match", async () => {
  const reference = state({ prefix: "reference" });
  const candidate = state({
    prefix: "candidate",
    entryOrder: "reverse",
    inferenceOrder: "reverse",
  });

  const result = await evaluateSemanticState({ candidate, reference });

  assert.equal(result.equivalent, true);
  assert.equal(result.unmatchedEntries.length, 0);
  assert.equal(result.entryKindClass.length, 0);
  assert.equal(result.b0.length, 0);
  assert.equal(result.claimStates.length, 0);
  assert.equal(result.negationPairs.length, 0);
  assert.equal(result.inferences.length, 0);
  assert.equal(result.entryMatches.length, 3);
  assert.ok(result.entryMatches.every((match) => match.matchType === "auto"));
});

test("automatic fingerprints preserve mathematically meaningful symbols", async () => {
  const reference = state({ prefix: "reference-symbol" });
  const candidate = state({ prefix: "candidate-symbol" });
  reference.entries[0].statement = "Assume x > 0.";
  candidate.entries[0].statement = "Assume x < 0.";

  const result = await evaluateSemanticState({ candidate, reference });

  assert.equal(result.equivalent, false);
  assert.ok(result.unmatchedEntries.some(({ entryId }) => entryId === "reference-symbol:fact:definition"));
  assert.ok(result.unmatchedEntries.some(({ entryId }) => entryId === "candidate-symbol:fact:definition"));
});

test("explicit 1:N equivalence groups preserve strict state and relations", async () => {
  const reference = state({ prefix: "reference", wording: "different" });
  const candidate = splitFactState("candidate");

  const result = await evaluateSemanticState({
    candidate,
    reference,
    equivalenceGroups: [{
      referenceEntryIds: ["reference:fact:definition"],
      candidateEntryIds: ["candidate:fact:left", "candidate:fact:right"],
    }],
  });

  assert.equal(result.equivalent, true);
  assert.equal(result.unmatchedEntries.length, 0);
  assert.equal(result.entryKindClass.length, 0);
  assert.equal(result.b0.length, 0);
  assert.equal(result.claimStates.length, 0);
  assert.equal(result.negationPairs.length, 0);
  assert.equal(result.inferences.length, 0);
  assert.equal(result.entryMatches.find((match) => match.referenceEntryIds.includes("reference:fact:definition"))?.matchType, "equivalenceGroup");
});

test("established, open, and refuted Claim state mismatches are reported", async () => {
  const established = state({ prefix: "reference" });
  const open = state({ prefix: "candidate", b0ClaimEntryIds: [], includeProof: false });
  const openResult = await evaluateSemanticState({ candidate: open, reference: established });
  assert.equal(openResult.equivalent, false);
  assert.ok(openResult.claimStates.some((item) => item.referenceState === "established" && item.candidateState === "open"));

  const refutedReference = state({ prefix: "reference-refuted", b0ClaimEntryIds: [], includeProof: false, includeNegationPair: true });
  const refutedCandidate = state({ prefix: "candidate-refuted", b0ClaimEntryIds: [`candidate-refuted:claim:b0`], includeProof: false, includeNegationPair: true });
  const refutedResult = await evaluateSemanticState({
    candidate: refutedCandidate,
    reference: refutedReference,
    equivalenceGroups: [{
      referenceEntryIds: ["reference-refuted:claim:goal"],
      candidateEntryIds: ["candidate-refuted:claim:goal"],
    }],
  });
  assert.equal(refutedResult.equivalent, false);
  assert.ok(refutedResult.claimStates.some((item) => item.referenceState === "open" && item.candidateState === "refuted"));
});

test("canonical INVALID_NEGATION_PAIR, INVALID_B0, and ORGANIZATION_CYCLE errors escape unchanged", async () => {
  const validReference = state({ prefix: "reference" });
  const invalidNegation = {
    ...state({ prefix: "candidate" }),
    negationPairs: [{ claimEntryIds: ["candidate:claim:b0", "candidate:claim:b0"] }],
  };

  await assert.rejects(
    evaluateSemanticState({ candidate: invalidNegation, reference: validReference }),
    (error) => error?.code === "INVALID_NEGATION_PAIR",
  );

  const invalidB0 = state({ prefix: "candidate-b0" });
  invalidB0.inferences = [{
    id: "candidate-b0:proof:b0",
    operationKind: "proof",
    premises: ["candidate-b0:fact:definition"],
    conclusion: "candidate-b0:claim:b0",
    argument: "Incorrectly prove a B0 Claim inside the map.",
  }];
  await assert.rejects(
    evaluateSemanticState({ candidate: invalidB0, reference: validReference }),
    (error) => error?.code === "INVALID_B0",
  );

  const organizationCycle = {
    entries: [
      {
        id: "candidate:fact:a",
        entryClass: "fact",
        factKind: "definition",
        title: "Definition A",
        statement: "Definition A.",
      },
      {
        id: "candidate:fact:b",
        entryClass: "fact",
        factKind: "definition",
        title: "Definition B",
        statement: "Definition B.",
      },
    ],
    inferences: [
      {
        id: "candidate:organization:a-to-b",
        operationKind: "organization",
        premises: ["candidate:fact:a"],
        conclusion: "candidate:fact:b",
        argument: "Group definition A into definition B.",
      },
      {
        id: "candidate:organization:b-to-a",
        operationKind: "organization",
        premises: ["candidate:fact:b"],
        conclusion: "candidate:fact:a",
        argument: "Group definition B into definition A.",
      },
    ],
    negationPairs: [],
    b0ClaimEntryIds: [],
  };

  await assert.rejects(
    evaluateSemanticState({ candidate: organizationCycle, reference: validReference }),
    (error) => error?.code === "ORGANIZATION_CYCLE",
  );
});

test("ungrounded reciprocal proof cycles remain open and do not hard-fail", async () => {
  const reference = reciprocalCycleState("reference");
  const candidate = reciprocalCycleState("candidate");
  candidate.entries.reverse();
  candidate.inferences.reverse();

  const result = await evaluateSemanticState({ candidate, reference });

  assert.equal(result.equivalent, true);
  assert.equal(result.candidateState.claimStates["candidate:claim:a"], "open");
  assert.equal(result.candidateState.claimStates["candidate:claim:b"], "open");
  assert.equal(result.referenceState.claimStates["reference:claim:a"], "open");
  assert.equal(result.referenceState.claimStates["reference:claim:b"], "open");
  assert.equal(result.claimStates.length, 0);
});

test("source-supported candidate extra absent from Gold is a Gold gap but remains eligible", async () => {
  const gold = state({ prefix: "gold" });
  const candidate = state({ prefix: "candidate" });
  candidate.entries.push({
    id: "candidate:fact:extra",
    entryClass: "fact",
    factKind: "calculation",
    title: "Source calculation",
    statement: "A source calculation omitted by Gold.",
  });

  const findings = [
    ...candidate.entries.map((entry, index) => ({
      id: `finding:entry:${index}`,
      objectKind: "entry",
      verdict: "supported",
      candidateObjectIds: [entry.id],
      goldObjectIds: index < gold.entries.length ? [gold.entries[index].id] : [],
      sourceRefs: ["paper#page=1"],
    })),
    {
      id: "finding:inference:0",
      objectKind: "inference",
      verdict: "supported",
      candidateObjectIds: [candidate.inferences[0].id],
      goldObjectIds: [gold.inferences[0].id],
      sourceRefs: ["paper#page=2"],
    },
  ];

  const result = await evaluateSourceFidelity({
    candidate,
    gold,
    sourceAssessment: {
      schema: "cmath.benchmark-source-assessment/v0.1",
      mode: "automatic",
      sourceIdentity: "source:paper-v1",
      findings,
    },
    expectedSourceIdentity: "source:paper-v1",
  });

  assert.equal(result.schema, "cmath.benchmark-source-fidelity-evaluation/v0.1");
  assert.equal(result.sourceClean, true);
  assert.equal(result.eligibleForComparison, true);
  assert.equal(result.goldGaps.length, 1);
  assert.equal(result.omissions.length, 0);
  assert.equal(result.coverage.supportedFindingCount, findings.length);
  assert.equal(result.coverage.supportedRepresentedFindingCount, findings.length);
  assert.equal(result.coverageRatio, 1);
});

test("fabrication keeps source evaluation ineligible even with complete supported coverage", async () => {
  const gold = state({ prefix: "gold-fabrication" });
  const candidate = state({ prefix: "candidate-fabrication" });
  candidate.entries.push({
    id: "candidate-fabrication:fact:invented",
    entryClass: "fact",
    factKind: "calculation",
    title: "Invented calculation",
    statement: "This calculation is not supported by the source.",
  });

  const findings = candidate.entries.slice(0, 3).map((entry, index) => ({
    id: `finding:supported:${index}`,
    objectKind: "entry",
    verdict: "supported",
    candidateObjectIds: [entry.id],
    goldObjectIds: [gold.entries[index].id],
    sourceRefs: ["paper#page=1"],
  }));
  findings.push({
    id: "finding:supported:inference",
    objectKind: "inference",
    verdict: "supported",
    candidateObjectIds: [candidate.inferences[0].id],
    goldObjectIds: [gold.inferences[0].id],
    sourceRefs: ["paper#page=2"],
  });
  findings.push({
    id: "finding:fabricated:extra",
    objectKind: "entry",
    verdict: "fabricated",
    candidateObjectIds: ["candidate-fabrication:fact:invented"],
    goldObjectIds: [],
    sourceRefs: ["paper#page=3"],
  });

  const result = await evaluateSourceFidelity({
    candidate,
    gold,
    sourceAssessment: {
      schema: "cmath.benchmark-source-assessment/v0.1",
      mode: "automatic",
      sourceIdentity: "source:paper-v1",
      findings,
    },
    expectedSourceIdentity: "source:paper-v1",
  });

  assert.equal(result.coverageRatio, 1);
  assert.equal(result.fabrications.length, 1);
  assert.equal(result.sourceClean, false);
  assert.equal(result.eligibleForComparison, false);
});

test("omission, distortion, and an unassessed candidate object remain visible", async () => {
  const gold = state({ prefix: "gold-findings" });
  const candidate = state({ prefix: "candidate-findings" });
  const findings = [
    {
      id: "finding:supported:entry",
      objectKind: "entry",
      verdict: "supported",
      candidateObjectIds: ["candidate-findings:fact:definition"],
      goldObjectIds: ["gold-findings:fact:definition"],
      sourceRefs: ["paper#page=1"],
    },
    {
      id: "finding:omitted:entry",
      objectKind: "entry",
      verdict: "supported",
      candidateObjectIds: [],
      goldObjectIds: ["gold-findings:claim:b0"],
      sourceRefs: ["paper#page=2"],
    },
    {
      id: "finding:distorted:entry",
      objectKind: "entry",
      verdict: "distorted",
      candidateObjectIds: ["candidate-findings:claim:goal"],
      goldObjectIds: ["gold-findings:claim:goal"],
      sourceRefs: ["paper#page=3"],
    },
  ];

  const result = await evaluateSourceFidelity({
    candidate,
    gold,
    sourceAssessment: {
      schema: "cmath.benchmark-source-assessment/v0.1",
      mode: "automatic",
      sourceIdentity: "source:paper-v1",
      findings,
    },
    expectedSourceIdentity: "source:paper-v1",
  });

  assert.equal(result.omissions.length, 1);
  assert.equal(result.distortions.length, 1);
  assert.equal(result.goldDefects.length, 1);
  assert.deepEqual(result.unresolvedCandidateObjects, [
    "candidate-findings:claim:b0",
    "candidate-findings:proof:goal",
  ]);
  assert.equal(result.coverage.supportedFindingCount, 2);
  assert.equal(result.coverage.supportedRepresentedFindingCount, 1);
  assert.equal(result.coverageRatio, 0.5);
  assert.equal(result.sourceClean, false);
});

test("manual or source-identity-mismatched assessments fail closed", async () => {
  const candidate = state({ prefix: "candidate-assessment" });
  const gold = state({ prefix: "gold-assessment" });
  const baseAssessment = {
    schema: "cmath.benchmark-source-assessment/v0.1",
    mode: "automatic",
    sourceIdentity: "source:paper-v1",
    findings: [],
  };

  await assert.rejects(
    evaluateSourceFidelity({
      candidate,
      gold,
      sourceAssessment: { ...baseAssessment, mode: "manual" },
      expectedSourceIdentity: "source:paper-v1",
    }),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATOR_ASSESSMENT_INVALID",
  );
  await assert.rejects(
    evaluateSourceFidelity({
      candidate,
      gold,
      sourceAssessment: { ...baseAssessment, sourceIdentity: "source:other-paper" },
      expectedSourceIdentity: "source:paper-v1",
    }),
    (error) => error?.code === "BENCHMARK_SOURCE_EVALUATOR_SOURCE_IDENTITY_MISMATCH",
  );
});

test("combined evaluation exposes Gold semantic discrepancies while a supported Gold gap stays eligible", async () => {
  const reference = state({ prefix: "reference-combined" });
  const candidate = state({ prefix: "candidate-combined" });
  candidate.entries.push({
    id: "candidate-combined:fact:extra",
    entryClass: "fact",
    factKind: "calculation",
    title: "Additional source calculation",
    statement: "A calculation present in the source but absent from Gold.",
  });
  const findings = candidate.entries.map((entry, index) => ({
    id: `finding:combined:entry:${index}`,
    objectKind: "entry",
    verdict: "supported",
    candidateObjectIds: [entry.id],
    goldObjectIds: index < reference.entries.length ? [reference.entries[index].id] : [],
    sourceRefs: ["paper#page=1"],
  }));
  findings.push({
    id: "finding:combined:inference",
    objectKind: "inference",
    verdict: "supported",
    candidateObjectIds: [candidate.inferences[0].id],
    goldObjectIds: [reference.inferences[0].id],
    sourceRefs: ["paper#page=2"],
  });

  const result = await evaluateBenchmarkVNext({
    candidate,
    reference,
    sourceAssessment: {
      schema: "cmath.benchmark-source-assessment/v0.1",
      mode: "automatic",
      sourceIdentity: "source:paper-v1",
      findings,
    },
    expectedSourceIdentity: "source:paper-v1",
  });

  assert.equal(result.schema, "cmath.benchmark-vnext-evaluation/v0.1");
  assert.equal(result.semantic.equivalent, false);
  assert.equal(result.semantic.unmatchedEntries.length, 1);
  assert.equal(result.source.goldGaps.length, 1);
  assert.equal(result.source.sourceClean, true);
  assert.equal(result.eligibleForComparison, true);
});
