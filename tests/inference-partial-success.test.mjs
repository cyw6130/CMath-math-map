import assert from "node:assert/strict";
import test from "node:test";

import inference from "../src/paper-import/inference/index.js";
import projectViewCore from "../src/paper-import/core/project-view.js";
import checkpointStore from "../src/paper-import/workflow/checkpoint-store.js";

function indexedDbWithRecord(record) {
  const db = {
    transaction() {
      const transaction = {
        objectStore: () => ({
          get: () => {
            const request = {};
            queueMicrotask(() => {
              request.result = record;
              request.onsuccess?.();
              queueMicrotask(() => transaction.oncomplete?.());
            });
            return request;
          },
        }),
      };
      return transaction;
    },
  };
  return {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    },
  };
}

function artifact() {
  return {
    schema: "cmath.paper-entry-artifact/v1",
    source: {
      fileName: "partial.pdf",
      pageCount: 3,
      sourceText: "[[PAGE 1]] Define X. [[PAGE 2]] Lemma A. [[PAGE 3]] Main theorem.",
    },
    entries: [
      { id: "fact:x", entryClass: "fact", factKind: "definition", name: "X", statement: "Define $X$.", page: 1 },
      { id: "claim:a", entryClass: "claim", claimKind: "lemma", name: "Lemma A", statement: "$A$.", page: 2 },
      { id: "claim:main", entryClass: "claim", claimKind: "theorem", name: "Main", statement: "$T$.", page: 3 },
    ],
    unresolvedItems: [{
      id: "unresolved:entry:1",
      sourceStage: "entry",
      candidateSummary: "damaged source candidate",
      failureCategory: "candidate-invalid",
      validationError: "invalid candidate",
      retryable: true,
    }],
  };
}

function mixedAssembly() {
  return {
    projectTitle: "Partial inference paper",
    mainTargetEntryId: "claim:missing",
    b0: ["claim:a"],
    fixedEntries: [{ id: "claim:a", type: "theorem" }],
    inferences: [
      {
        id: "proof:main",
        operationKind: "proof",
        premises: ["claim:a"],
        conclusion: "claim:main",
        argument: "Lemma A proves the theorem.",
        page: 3,
      },
      {
        id: "proof:dangling",
        operationKind: "proof",
        premises: ["claim:missing"],
        conclusion: "claim:a",
        argument: "Unsupported edge.",
        page: 2,
      },
      {
        id: "inference:guessed-kind",
        premises: ["fact:x"],
        conclusion: "claim:a",
        argument: "Kind is absent.",
        page: 2,
      },
      {
        id: "organization:placeholder",
        operationKind: "organization",
        premises: ["fact:x"],
        conclusion: "fact:x",
        page: 1,
      },
      {
        id: "proof:malformed-premise",
        operationKind: "proof",
        premises: ["fact:x", null],
        conclusion: "claim:a",
        argument: "Malformed premise.",
        page: 2,
      },
      null,
    ],
  };
}

test("meaning-preserving autofix never guesses relation meaning, B0 evidence, or main target", () => {
  const { raw, actions, unresolvedItems } = projectViewCore.sanitizeRawProjectView({
    ...mixedAssembly(),
    entries: artifact().entries,
  }, { fileName: "partial.pdf", collectUnresolved: true });

  assert.deepEqual(raw.inferences.map((item) => item.id), ["proof:main"]);
  assert.deepEqual(raw.b0ClaimEntryIds, []);
  assert.equal(raw.mainTargetEntryId, undefined);
  assert.equal(raw.entries.find((entry) => entry.id === "claim:a").sourceReference, undefined);
  assert.ok(unresolvedItems.length >= 7);
  assert.ok(unresolvedItems.every((item) => item.sourceStage === "inference"));
  assert.doesNotMatch(actions.join("\n"), /推断为|改判为|按条目名称补齐|已回退为|说明从略/u);
});

test("Inference partial success keeps valid relations and reports discarded content", async () => {
  let calls = 0;
  const view = await inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(),
    endpoint: "https://api.example.test/v1",
    apiKey: "test-key",
    model: "test-model",
    allowDegraded: true,
    fetchImpl: async () => { throw new Error("fetch must not be used"); },
    chatImpl: async () => { calls += 1; return { content: JSON.stringify(mixedAssembly()) }; },
  });

  assert.equal(calls, 4);
  assert.deepEqual(view.inferences.map((item) => item.id), ["proof:main"]);
  assert.equal(view.entries.find((item) => item.id === "claim:a").statement, "$A$.");
  assert.equal(view.mainTargetEntryId, undefined);
  assert.deepEqual(view.derivedResearchState.mathematicalState.b0ClaimEntryIds, []);
  assert.equal(view.unresolvedItems[0].sourceStage, "entry");
  assert.equal(view.diagnostics.inferenceDegraded, true);
  assert.ok(view.unresolvedItems.some((item) => item.candidateSummary.includes("proof:dangling")));
  assert.ok(view.diagnostics.openClaimEntryIds.includes("claim:a"));
  assert.equal(view.diagnostics.mainTargetIdentified, false);
});

test("final assembly call failure returns an Entry-only map without swallowing system failures", async () => {
  const degraded = await inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(),
    endpoint: "https://api.example.test/v1",
    apiKey: "test-key",
    model: "test-model",
    allowDegraded: true,
    fetchImpl: async () => { throw new Error("fetch must not be used"); },
    chatImpl: async () => { throw Object.assign(new Error('gateway payload={"access_token":"live-token"}'), { status: 503 }); },
  });
  assert.deepEqual(degraded.inferences, []);
  assert.equal(degraded.entries.length, 3);
  assert.equal(degraded.unresolvedItems.at(-1).failureCategory, "inference-assembly-failed");
  assert.doesNotMatch(JSON.stringify(degraded), /live-token/u);

  const abort = new Error("cancelled");
  abort.name = "AbortError";
  await assert.rejects(inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(), endpoint: "https://api.example.test/v1", apiKey: "test-key", model: "test-model",
    allowDegraded: true, fetchImpl: async () => { throw new Error("unused"); }, chatImpl: async () => { throw abort; },
  }), (error) => error === abort);

  await assert.rejects(inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(), endpoint: "https://api.example.test/v1", apiKey: "test-key", model: "test-model",
    allowDegraded: true, fetchImpl: async () => { throw new Error("unused"); },
    chatImpl: async () => { throw Object.assign(new Error("unauthorized"), { status: 401 }); },
  }));

  await assert.rejects(inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(), endpoint: "https://api.example.test/v1", apiKey: "test-key", model: "test-model",
    allowDegraded: true, fetchImpl: async () => { throw new Error("unused"); },
    chatImpl: async () => { throw new Error("programming invariant failed"); },
  }), /programming invariant failed/u);
});

test("default Inference path remains fail-closed when local repair discards an illegal relation", async () => {
  await assert.rejects(inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(), endpoint: "https://api.example.test/v1", apiKey: "test-key", model: "test-model",
    fetchImpl: async () => { throw new Error("unused"); },
    chatImpl: async () => ({ content: JSON.stringify({
      projectTitle: "Invalid", mainTargetEntryId: "claim:main", b0: [],
      inferences: [{ id: "invalid:kind", premises: ["fact:x"], conclusion: "claim:main", argument: "Missing kind.", page: 3 }],
    }) }),
  }), /保义修复仍有 1 条非法 Inference/u);
});

test("zero legal relations becomes Entry-only while successful maps still carry Closure diagnostics", async () => {
  const empty = await inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(), endpoint: "https://api.example.test/v1", apiKey: "test-key", model: "test-model",
    allowDegraded: true, fetchImpl: async () => { throw new Error("unused"); },
    chatImpl: async () => ({ content: JSON.stringify({
      projectTitle: "Entry only", mainTargetEntryId: "claim:main", b0: [], inferences: [],
    }) }),
  });
  assert.deepEqual(empty.inferences, []);
  assert.equal(empty.diagnostics.inferenceDegraded, true);
  assert.ok(empty.unresolvedItems.some((item) => item.failureCategory === "inference-empty"));

  const complete = await inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(), endpoint: "https://api.example.test/v1", apiKey: "test-key", model: "test-model",
    fetchImpl: async () => { throw new Error("unused"); },
    chatImpl: async () => ({ content: JSON.stringify({
      projectTitle: "Complete", mainTargetEntryId: "claim:main", b0: [],
      inferences: [{ id: "proof:main", operationKind: "proof", premises: ["fact:x"], conclusion: "claim:main", argument: "Proof.", page: 3 }],
    }) }),
  });
  assert.equal(complete.diagnostics.inferenceDegraded, false);
  assert.ok(complete.diagnostics.openClaimEntryIds.includes("claim:a"));
  assert.equal(complete.unresolvedItems[0].sourceStage, "entry");
});

test("non-object Inference beside a legal relation cannot pass as complete", async () => {
  const view = await inference.requestPaperInferenceFromEntryArtifact({
    artifact: artifact(), endpoint: "https://api.example.test/v1", apiKey: "test-key", model: "test-model",
    allowDegraded: true, fetchImpl: async () => { throw new Error("unused"); },
    chatImpl: async () => ({ content: JSON.stringify({
      projectTitle: "Mixed shape", mainTargetEntryId: "claim:main", b0: ["claim:a"],
      inferences: [
        { id: "proof:main", operationKind: "proof", premises: ["fact:x"], conclusion: "claim:main", argument: "Proof.", page: 3 },
        null,
      ],
    }) }),
  });
  assert.equal(view.diagnostics.inferenceDegraded, true);
  assert.deepEqual(view.inferences.map((item) => item.id), ["proof:main"]);
  assert.ok(view.unresolvedItems.some((item) => item.validationError === "Inference 必须是对象"));
});

test("duplicate relation IDs are isolated and sourcePath remains a valid explicit locator", () => {
  const { raw, unresolvedItems } = projectViewCore.sanitizeRawProjectView({
    projectTitle: "Duplicate relations", mainTargetEntryId: "claim:main", b0ClaimEntryIds: [],
    entries: artifact().entries,
    inferences: [
      { id: "proof:kept", operationKind: "proof", premises: ["fact:x"], conclusion: "claim:main", argument: "First.", sourcePath: "partial.pdf#page=3" },
      { id: "proof:kept", operationKind: "proof", premises: ["claim:a"], conclusion: "claim:main", argument: "Duplicate.", sourcePath: "partial.pdf#page=3" },
      { id: "fact:x", operationKind: "proof", premises: ["claim:a"], conclusion: "claim:main", argument: "Entry collision.", page: 3 },
    ],
  }, { fileName: "partial.pdf" });
  assert.deepEqual(raw.inferences.map((item) => item.id), ["proof:kept"]);
  assert.equal(raw.inferences[0].sourceLocator, "partial.pdf#page=3");
  assert.equal(unresolvedItems.filter((item) => item.failureCategory === "inference-duplicate-id").length, 2);
  assert.equal(unresolvedItems[0].sourceLocator, "partial.pdf#page=3");
  assert.equal(new Set(unresolvedItems.map((item) => item.id)).size, unresolvedItems.length);
});

test("generated Inference IDs reserve later explicit IDs instead of colliding", () => {
  const { raw, unresolvedItems } = projectViewCore.sanitizeRawProjectView({
    projectTitle: "Generated IDs", mainTargetEntryId: "claim:main", b0ClaimEntryIds: [],
    entries: artifact().entries,
    inferences: [
      { operationKind: "proof", premises: ["fact:x"], conclusion: "claim:a", argument: "First.", page: 2 },
      { id: "paper:inference:proof:1", operationKind: "proof", premises: ["claim:a"], conclusion: "claim:main", argument: "Second.", page: 3 },
    ],
  }, { fileName: "partial.pdf" });
  assert.equal(raw.inferences.length, 2);
  const view = inference.paperProjectView(raw, { fileName: "partial.pdf" });
  assert.equal(new Set(view.inferences.map((item) => item.id)).size, 2);
  assert.ok(view.inferences.some((item) => item.id === "paper:inference:proof:1"));
  assert.equal(unresolvedItems.some((item) => item.failureCategory === "inference-duplicate-id"), false);
});

test("Inference degraded checkpoints retain legal subset and sanitized unresolved items", () => {
  const clean = checkpointStore.sanitizeStageArtifact("inference", {
    schema: "cmath.project-view-model/v0.1",
    project: { id: "project:partial", title: "Partial" },
    entries: [{ id: "claim:a", entryClass: "claim", claimKind: "lemma", title: "A", statement: "A", sourcePath: "paper.pdf#page=1" }],
    inferences: [],
    diagnostics: { inferenceDegraded: true, repairActions: ['removed payload={"access_token":"live-action"}'] },
    unresolvedItems: [{
      id: "unresolved:inference:1",
      sourceStage: "inference",
      candidateSummary: "payload",
      failureCategory: "inference-invalid",
      validationError: 'bad payload={"client_secret":"live-secret"}',
      retryable: true,
    }],
  });
  assert.equal(clean.unresolvedItems.length, 1);
  assert.equal(clean.diagnostics.inferenceDegraded, true);
  assert.doesNotMatch(JSON.stringify(clean), /live-secret/u);
  assert.doesNotMatch(JSON.stringify(clean), /live-action/u);
});

test("checkpoint sanitizer rejects empty completed artifacts, assigns unresolved IDs, and scrubs camelCase credentials", () => {
  const clean = checkpointStore.sanitizeCheckpoint({
    key: "security-checkpoint",
    frozenWorkflow: { capabilityAuthority: "https://signed.example/capability?accessToken=authority-secret" },
    stages: {
      mineru: { status: "complete", artifact: {} },
      entry: {
        status: "complete",
        artifact: {
          rawEntries: [{ id: "claim:a", type: "theorem", statement: "$A$.", page: 1 }],
          inferenceHints: [{ relationText: "hint", accessToken: "nested-entry-secret", transportRecord: { requestBody: "transport-secret" } }],
        },
      },
      consolidate: {
        status: "complete",
        artifact: {
          entries: [{ id: "claim:a", entryClass: "claim", claimKind: "lemma", statement: "$A$." }],
          paperGuide: { mainTarget: "claim:a", clientSecret: "nested-guide-secret" },
          reviewInputs: { canonicalIndex: [{ id: "claim:a", apiKey: "nested-review-secret" }] },
          aggregation: {
            records: [],
            conflicts: [{ id: "conflict", apiKey: "aggregation-secret" }],
            counts: { total: 1, transportRecord: { requestBody: "counts-secret" } },
          },
          diagnostics: {
            consolidationSummary: { outputEntryCount: 1, apiKey: "summary-secret" },
            moduleIdentity: { name: "entry", schema: "artifact", transportRecord: { requestBody: "identity-secret" } },
          },
        },
      },
      "w7-verify": { status: "complete", artifact: { entries: [{}] } },
      inference: {
        status: "degraded",
        artifact: {
          schema: "cmath.project-view-model/v0.1",
          project: { id: "project:partial", title: "Partial" },
          channelOptions: { adapterOptions: { accessToken: "nested-adapter-secret", transportRecord: { requestBody: "adapter-secret" } } },
          entries: [{ id: "claim:a", entryClass: "claim", claimKind: "lemma", title: "A", statement: "A", sourcePath: "paper.pdf#page=1" }],
          inferences: [],
          unresolvedItems: [{
            sourceStage: "inference", candidateSummary: "candidate", failureCategory: "invalid",
            validationError: 'payload={"accessToken":"access-live","clientSecret":"client-live"}', retryable: true,
          }, {
            id: "duplicate-unresolved",
            sourceStage: "inference", candidateSummary: "candidate 2", failureCategory: "invalid",
            validationError: "duplicate", retryable: true,
          }, {
            id: "duplicate-unresolved",
            sourceStage: "inference", candidateSummary: "candidate 3", failureCategory: "invalid",
            validationError: "duplicate again", retryable: true,
          }],
        },
      },
      closure: { status: "failed", error: { message: "Bearer live-bearer accessToken=live-access", code: "HTTP_ERROR" } },
    },
  });
  assert.equal(clean.stages.mineru, undefined);
  assert.equal(clean.stages["w7-verify"], undefined);
  assert.match(clean.stages.inference.artifact.unresolvedItems[0].id, /^unresolved:/u);
  assert.notEqual(clean.stages.inference.artifact.unresolvedItems[1].id, clean.stages.inference.artifact.unresolvedItems[2].id);
  assert.doesNotMatch(JSON.stringify(clean), /access-live|client-live|live-bearer|live-access|nested-.*-secret|transport-secret|authority-secret|signed\.example|aggregation-secret|counts-secret|summary-secret|identity-secret|adapter-secret/u);

  const malformedClosure = checkpointStore.sanitizeCheckpoint({
    key: "malformed-closure",
    stages: {
      closure: {
        status: "complete",
        artifact: { schema: "cmath.paper-to-map-result/v1", map: { entries: [{}], inferences: [] } },
      },
    },
  });
  assert.equal(malformedClosure.stages.closure, undefined);

  const validClosure = checkpointStore.sanitizeCheckpoint({
    key: "closure-security",
    stages: {
      closure: {
        status: "complete",
        artifact: {
          schema: "cmath.paper-to-map-result/v1",
          status: "complete",
          map: {
            entries: [{ id: "claim:a", entryClass: "claim", claimKind: "lemma", statement: "A", sourcePath: "paper.pdf#page=1" }],
            inferences: [],
          },
          sourceAnnotations: { source: { fileName: "https://signed.example/paper.pdf?token=source-secret", pageCount: 1 }, items: [] },
          diagnostics: { mainTargetIdentified: false, openClaimCount: 1, mainProofChainComplete: false, missingStages: ["accessToken=diagnostic-secret"] },
          identity: { contentFingerprint: "https://signed.example/fingerprint?token=fingerprint-secret", frozenWorkflow: {} },
        },
      },
    },
  });
  assert.equal(validClosure.stages.closure.status, "complete");
  assert.doesNotMatch(JSON.stringify(validClosure), /signed\.example|source-secret|diagnostic-secret|fingerprint-secret/u);

  const danglingInference = checkpointStore.sanitizeCheckpoint({
    key: "dangling-inference",
    stages: {
      inference: {
        status: "complete",
        artifact: {
          entries: [
            { id: "fact:x", entryClass: "fact", factKind: "definition", statement: "X", sourcePath: "paper.pdf#page=1" },
            { id: "claim:a", entryClass: "claim", claimKind: "lemma", statement: "A", sourcePath: "paper.pdf#page=2" },
          ],
          inferences: [{
            id: "proof:dangling", operationKind: "proof", premises: ["fact:missing"], conclusion: "claim:a",
            argument: "Dangling premise.", sourcePath: "paper.pdf#page=2",
          }],
        },
      },
    },
  });
  assert.equal(danglingInference.stages.inference, undefined);
});

test("IndexedDB load re-sanitizes legacy or tampered checkpoint records", async () => {
  const store = checkpointStore.createIndexedDbCheckpointStore({
    indexedDB: indexedDbWithRecord({
      key: "legacy",
      checkpoint: {
        key: "legacy",
        stages: {
          mineru: { status: "complete", artifact: {} },
          closure: { status: "failed", error: { message: "clientSecret=legacy-secret", transport: { apiKey: "also-secret" } } },
        },
      },
    }),
  });
  const loaded = await store.load("legacy");
  assert.equal(loaded.stages.mineru, undefined);
  assert.doesNotMatch(JSON.stringify(loaded), /legacy-secret|also-secret/u);
});
