/* Interaction-only mathematical map model. It is not Gamma authority data. */
(function publishMathMapModel(root, factory) {
  "use strict";
  const model = factory();
  if (typeof module === "object" && module.exports) module.exports = model;
  if (root) root.GammaMathMapLabModel = model;
})(typeof window !== "undefined" ? window : globalThis, function createMathMapModel() {
  "use strict";

  const entry = (id, title, statement, objectType, researchRelation, metadata = {}) => ({
    id, nodeKind: "entry", title, statement, objectType, researchRelation, ...metadata,
    evidence: `实验定位 · ${id} · 仅用于验证图上交互，不构成数学证据。`,
  });
  const inference = (id, title, statement, researchRelation) => ({
    id, nodeKind: "inference", title, statement, objectType: "推导", researchRelation,
    evidence: `实验推导 · ${id} · 前提与结论关系仅为界面试件。`,
  });
  const edge = (source, target, relation) => ({ source, target, relation });

  const recentLoopLimit = 3;
  const goalHierarchy = Object.freeze({
    finalGoalId: "T",
    milestoneIds: Object.freeze(["M"]),
    currentGoalIds: Object.freeze(["a2", "b2", "c2"]),
  });

  const baseNodes = [
    entry("f1", "系数域约定", "固定整个问题使用的系数域与根参数约定。", "约定", "各项目标共享的基础"),
    entry("f2", "目标对象", "指定需要分析的代数对象及其有限维结构。", "定义", "各项目标共享的研究对象"),
    entry("f3", "结构不变量", "提取在变换下保持不变的结构量。", "定义", "各条路线之间的共同接口"),
    entry("T", "统一结构定理", "确定目标对象的结构，并解释不同局部结果如何汇合。", "开放问题", "总目标 T", { goalLevel: "final" }),
    entry("M", "建立统一结构判据", "找到足以把多种局部方法汇入总目标的共同判据。", "开放问题", "关键进展 M", { goalLevel: "milestone" }),

    entry("a1", "代数正规形", "把目标对象化到适合递归处理的正规形。", "命题", "代数当前目标的上游结果"),
    entry("a2", "闭合递归关系", "建立足以支撑统一结构判据的递归恒等式。", "开放问题", "当前目标 p · 代数递归", { goalLevel: "current" }),
    inference("ia1", "正规化推导", "由系数域约定和目标对象得到代数正规形。", "代数路线的早期 Loop"),
    inference("ia2", "递归归约", "由正规形和结构不变量把问题归约到递归关系。", "代数路线的近期 Loop"),
    inference("ia3", "代数推进关键进展", "递归关系闭合后可建立统一结构判据。", "当前目标 p 推进关键进展 M"),

    entry("b1", "表示范畴", "把目标对象放入可比较的表示范畴。", "定义", "表示论当前目标的上游结果"),
    entry("b2", "闭合特征量比较", "证明关键表示上的特征量满足统一比较关系。", "开放问题", "当前目标 p · 表示论比较", { goalLevel: "current" }),
    inference("ib1", "范畴化推导", "由目标对象和结构不变量确定表示语境。", "表示论路线的早期 Loop"),
    inference("ib2", "特征量归约", "由表示语境和系数域约定归约到特征量比较。", "表示论路线的近期 Loop"),
    inference("ib3", "表示论推进关键进展", "特征量比较闭合后可建立统一结构判据。", "当前目标 p 推进关键进展 M"),

    entry("c1", "低阶计算", "在有限截断中计算一组可复核样本。", "计算", "计算当前目标的上游结果"),
    entry("c2", "确认稳定模式", "从低阶样本中提取并验证稳定关系。", "开放问题", "当前目标 p · 计算验证", { goalLevel: "current" }),
    inference("ic1", "样本生成", "由约定和目标对象生成低阶计算。", "计算路线的早期 Loop"),
    inference("ic2", "模式提取", "由样本和结构不变量提取稳定模式。", "计算路线的近期 Loop"),
    inference("ic3", "计算推进关键进展", "稳定模式闭合后为统一结构判据提供支撑。", "当前目标 p 推进关键进展 M"),

    inference("iMT", "关键进展汇入总目标", "统一结构判据与结构不变量共同支撑最终结构定理。", "关键进展 M 推进总目标 T"),
  ];

  const baseEdges = [
    edge("f1", "ia1", "premise"), edge("f2", "ia1", "premise"), edge("ia1", "a1", "conclusion"),
    edge("a1", "ia2", "premise"), edge("f3", "ia2", "premise"), edge("ia2", "a2", "conclusion"),
    edge("a2", "ia3", "premise"), edge("f2", "ia3", "premise"), edge("ia3", "M", "conclusion"),
    edge("f2", "ib1", "premise"), edge("f3", "ib1", "premise"), edge("ib1", "b1", "conclusion"),
    edge("b1", "ib2", "premise"), edge("f1", "ib2", "premise"), edge("ib2", "b2", "conclusion"),
    edge("b2", "ib3", "premise"), edge("f1", "ib3", "premise"), edge("ib3", "M", "conclusion"),
    edge("f1", "ic1", "premise"), edge("f2", "ic1", "premise"), edge("ic1", "c1", "conclusion"),
    edge("c1", "ic2", "premise"), edge("f3", "ic2", "premise"), edge("ic2", "c2", "conclusion"),
    edge("c2", "ic3", "premise"), edge("f3", "ic3", "premise"), edge("ic3", "M", "conclusion"),
    edge("M", "iMT", "premise"), edge("f3", "iMT", "premise"), edge("iMT", "T", "conclusion"),
  ];

  const loopRecord = (id, routeId, targetEntryId, title, usedEntryIds, deltaEntryIds, deltaInferenceIds, settledAt) => ({
    id, routeId, targetEntryId, title, usedEntryIds, deltaEntryIds, deltaInferenceIds, settledAt,
  });

  const baseLoops = [
    loopRecord("loop-a-0", "route-algebra", "a2", "建立代数正规形", ["f1", "f2"], ["a1"], ["ia1"], "2026-07-18T09:00:00+08:00"),
    loopRecord("loop-a-1", "route-algebra", "a2", "归约递归关系", ["a1", "f3"], ["a2"], ["ia2"], "2026-07-18T10:00:00+08:00"),
    loopRecord("loop-a-2", "route-algebra", "a2", "连接关键进展", ["a2", "f2"], [], ["ia3"], "2026-07-18T11:00:00+08:00"),
    loopRecord("loop-b-0", "route-representation", "b2", "建立表示语境", ["f2", "f3"], ["b1"], ["ib1"], "2026-07-18T09:10:00+08:00"),
    loopRecord("loop-b-1", "route-representation", "b2", "归约特征量比较", ["b1", "f1"], ["b2"], ["ib2"], "2026-07-18T10:10:00+08:00"),
    loopRecord("loop-b-2", "route-representation", "b2", "连接关键进展", ["b2", "f1"], [], ["ib3"], "2026-07-18T11:10:00+08:00"),
    loopRecord("loop-c-0", "route-computation", "c2", "生成低阶样本", ["f1", "f2"], ["c1"], ["ic1"], "2026-07-18T09:20:00+08:00"),
    loopRecord("loop-c-1", "route-computation", "c2", "提取稳定模式", ["c1", "f3"], ["c2"], ["ic2"], "2026-07-18T10:20:00+08:00"),
    loopRecord("loop-c-2", "route-computation", "c2", "连接关键进展", ["c2", "f3"], [], ["ic3"], "2026-07-18T11:20:00+08:00"),
  ];

  const progressBatches = [
    {
      ...loopRecord("loop-a-3", "route-algebra", "a2", "边界项推进", ["a1", "a3"], ["a3", "a4"], ["ia4"], "2026-07-18T12:00:00+08:00"),
      anchorIds: ["a1"], summary: "代数路线增加边界项控制和一个新的局部恒等式。",
      nodes: [
        entry("a3", "边界项控制", "隔离递归中的边界贡献。", "引理", "当前目标 p 的最新支撑"),
        inference("ia4", "局部恒等式推导", "由正规形和边界项控制得到局部恒等式。", "Loop a-3 新增推导"),
        entry("a4", "局部恒等式", "得到一个可用于闭合递归关系的局部恒等式。", "命题", "当前目标 p 的最新进展"),
      ],
      edges: [edge("a1", "ia4", "premise"), edge("a3", "ia4", "premise"), edge("ia4", "a4", "conclusion")],
      focusIds: ["a1", "a3", "ia4", "a4", "a2"],
    },
    {
      ...loopRecord("loop-c-3", "route-computation", "c2", "异常样本修正", ["c2", "c3"], ["c3", "c4"], ["ic4"], "2026-07-18T12:10:00+08:00"),
      anchorIds: ["c2"], summary: "计算路线记录异常样本，并形成修正后的稳定模式。",
      nodes: [
        entry("c3", "异常样本", "记录偏离初始稳定模式的低阶样本。", "计算", "当前目标 p 的最新支撑"),
        inference("ic4", "模式修正推导", "由原稳定模式和异常样本得到修正模式。", "Loop c-3 新增推导"),
        entry("c4", "修正稳定模式", "把异常样本纳入新的稳定关系。", "观察", "当前目标 p 的最新进展"),
      ],
      edges: [edge("c2", "ic4", "premise"), edge("c3", "ic4", "premise"), edge("ic4", "c4", "conclusion")],
      focusIds: ["c2", "c3", "ic4", "c4"],
    },
    {
      ...loopRecord("loop-b-3", "route-representation", "b2", "跨方法桥接", ["a4", "b2", "c4", "f3"], ["m1", "m2"], ["im1", "im2", "im3"], "2026-07-18T12:20:00+08:00"),
      anchorIds: ["a4", "b2"], summary: "表示论当前目标吸收代数与计算结果，形成新的桥接子图。",
      nodes: [
        inference("im1", "代数—表示桥接", "由局部恒等式和特征量比较得到桥接条件。", "Loop b-3 新增推导"),
        entry("m1", "桥接条件", "给出代数结果与表示论比较可以共用的条件。", "命题", "当前目标 p 的跨路线支撑"),
        inference("im2", "桥接—计算校验", "由桥接条件和修正稳定模式形成联合归约。", "Loop b-3 新增推导"),
        entry("m2", "联合归约", "把三种方法压缩到同一个待解决缺口。", "命题", "当前目标 p 的最新进展"),
        inference("im3", "联合支撑", "联合归约和结构不变量共同支撑关键进展。", "Loop b-3 新增推导"),
      ],
      edges: [
        edge("a4", "im1", "premise"), edge("b2", "im1", "premise"), edge("im1", "m1", "conclusion"),
        edge("m1", "im2", "premise"), edge("c4", "im2", "premise"), edge("im2", "m2", "conclusion"),
        edge("m2", "im3", "premise"), edge("f3", "im3", "premise"), edge("im3", "M", "conclusion"),
      ],
      focusIds: ["a4", "b2", "im1", "m1", "c4", "im2", "m2", "im3", "M"],
    },
  ];

  const loops = Object.freeze([...baseLoops, ...progressBatches]);
  const routes = Object.freeze([
    { id: "route-algebra", label: "路线 A", finalGoalId: "T", milestoneId: "M", currentGoalId: "a2", status: "active" },
    { id: "route-representation", label: "路线 B", finalGoalId: "T", milestoneId: "M", currentGoalId: "b2", status: "active" },
    { id: "route-computation", label: "路线 C", finalGoalId: "T", milestoneId: "M", currentGoalId: "c2", status: "active" },
  ]);

  const sections = [
    { id: "section-foundations", label: "Section 1 · 基础约定", nodeIds: ["f1", "f2", "f3"] },
    { id: "section-algebra", label: "Section 2 · 代数推进", nodeIds: ["f1", "f2", "f3", "a1", "ia1", "a2", "ia2", "ia3", "a3", "ia4", "a4", "M", "iMT", "T"] },
    { id: "section-representation", label: "Section 3 · 表示论推进", nodeIds: ["f1", "f2", "f3", "b1", "ib1", "b2", "ib2", "ib3", "im1", "m1", "im2", "m2", "im3", "M", "iMT", "T"] },
    { id: "section-computation", label: "Section 4 · 计算推进", nodeIds: ["f1", "f2", "f3", "c1", "ic1", "c2", "ic2", "ic3", "c3", "ic4", "c4", "M", "iMT", "T"] },
  ];

  function layoutThrough(count) {
    const bounded = Math.max(0, Math.min(progressBatches.length, Number(count) || 0));
    return {
      nodes: [...baseNodes, ...progressBatches.slice(0, bounded).flatMap((batch) => batch.nodes)],
      edges: [...baseEdges, ...progressBatches.slice(0, bounded).flatMap((batch) => batch.edges)],
    };
  }

  function presentIds(layout, ids) {
    const available = new Set(layout.nodes.map((node) => node.id));
    return ids.filter((id) => available.has(id));
  }

  function routeView(routeId, layout, limit = recentLoopLimit) {
    const route = routes.find((item) => item.id === routeId);
    if (!route) throw new Error(`unknown route: ${routeId}`);
    const available = new Set(layout.nodes.map((node) => node.id));
    const effective = loops.filter((loop) => {
      if (loop.routeId !== routeId) return false;
      const deltaIds = [...loop.deltaEntryIds, ...loop.deltaInferenceIds];
      return deltaIds.length > 0 && deltaIds.every((id) => available.has(id));
    });
    const recentLoops = effective.slice(-Math.max(1, Number(limit) || recentLoopLimit));
    const nodeIds = new Set([route.finalGoalId, route.milestoneId, route.currentGoalId]);
    recentLoops.forEach((loop) => {
      [...loop.usedEntryIds, ...loop.deltaEntryIds, ...loop.deltaInferenceIds].forEach((id) => {
        if (available.has(id)) nodeIds.add(id);
      });
    });
    const latest = recentLoops.at(-1);
    const target = layout.nodes.find((node) => node.id === route.currentGoalId);
    return {
      ...route,
      loopIds: recentLoops.map((loop) => loop.id),
      nodeIds: [...nodeIds].filter((id) => available.has(id)),
      latestDeltaIds: latest ? presentIds(layout, [...latest.deltaEntryIds, ...latest.deltaInferenceIds]) : [],
      summary: `当前目标「${target?.title ?? route.currentGoalId}」；最近 ${recentLoops.length} 次有效 Loop 构成路线。`,
    };
  }

  function neighborhood(layout, id) {
    const ids = new Set([id]);
    layout.edges.forEach((item) => {
      if (item.source === id) ids.add(item.target);
      if (item.target === id) ids.add(item.source);
    });
    return presentIds(layout, [...ids]);
  }

  function relations(layout, id) {
    return {
      previous: layout.edges.filter((item) => item.target === id).map((item) => item.source),
      next: layout.edges.filter((item) => item.source === id).map((item) => item.target),
    };
  }

  return Object.freeze({
    recentLoopLimit, goalHierarchy, routes, loops, sections, progressBatches,
    layoutThrough, routeView, presentIds, neighborhood, relations,
  });
});
