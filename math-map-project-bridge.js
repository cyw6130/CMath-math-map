/* Connect one Project View Model to the existing Gamma mathematical map.
 * Project-specific adapter settings live with the Project View or its presentation module.
 */
(() => {
  "use strict";
  if (!window.GammaMathMapProjectAdapter) return;

  const demoId = document.documentElement.dataset.demo
    || new URLSearchParams(window.location.search).get("demo");
  const namingLab = document.documentElement.dataset.nodeNaming === "numbered-topic";
  const nodeNaming = document.documentElement.dataset.nodeNaming;
  const expectedAlphaProject = document.documentElement.dataset.alphaProject;
  const data = demoId === "knot-hopf-rt" ? window.CMATH_KNOT_HOPF_RT_DATA : window.CMATH_DATA;
  const alphaProjectSlug = (projectId) => String(projectId ?? "").replace(/^cmath:project:/u, "");

  function failProjection(error) {
    window.GammaMathMapLabProjectionError = error;
    window.GammaMathMapLabModel = null;
    document.documentElement.dataset.mathMapSource = "projection-error";
    const canvas = document.querySelector("#math-map-canvas");
    if (canvas) canvas.innerHTML = `<div class="math-map-projection-error"><strong>真实数据投影失败</strong><span>${String(error?.message ?? error)}</span></div>`;
    console.error(error);
  }

  if (!data) {
    if (expectedAlphaProject) failProjection(new Error(`missing Alpha Project View: ${expectedAlphaProject}`));
    return;
  }

  const presentation = window.CMATH_PROJECT_PRESENTATION;
  const channel = data.channelOptions
    ?? (presentation?.projectId === data.project?.id ? presentation.channelOptions : null);
  const channelSchema = "cmath-gamma.project-channel/v0.1";
  let model;
  try {
    if (expectedAlphaProject && alphaProjectSlug(data.project?.id) !== expectedAlphaProject) {
      throw new Error(`Alpha Project View identity mismatch: expected ${expectedAlphaProject}, received ${data.project?.id ?? "missing project id"}`);
    }
    if (!channel || channel.schema !== channelSchema) throw new Error(`expected ${channelSchema}`);
    if (channel.projectId !== data.project?.id) throw new Error("project channel does not match Project View identity");
    const adapterOptions = channel.adapterOptions ?? {};
    model = window.GammaMathMapProjectAdapter.create(data, {
      ...adapterOptions,
      ...(nodeNaming ? { nodeNaming } : {}),
    });
  } catch (error) {
    // A real Project View must never silently fall back to the local fixture:
    // that would show the wrong Loop count, names, and semantic colors.
    failProjection(error);
    return;
  }
  window.GammaMathMapLabModel = model;

  const sectionSelect = document.querySelector("#math-map-section");
  if (sectionSelect) {
    sectionSelect.replaceChildren(
      new Option("全部", "all"),
      ...model.sections.map((section) => new Option(section.label, section.id)),
    );
  }
  const boundary = document.querySelector(".math-map-boundary");
  if (boundary) boundary.textContent = demoId === "knot-hopf-rt"
    ? `${namingLab ? "编号短名称实验" : "真实数学内容"} · 演示推演历史 · 不属于 Gamma 数学权威`
    : channel.boundaryLabel ?? "Alpha 只读派生投影 · 不属于 Gamma 数学权威";
  const projectTitle = document.querySelector(".brand-text small");
  if (projectTitle) projectTitle.textContent = model.project.title;
  document.documentElement.dataset.mathMapSource = model.project.id;
})();
