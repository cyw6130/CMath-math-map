/* 3 Curated Portable Math Maps from math-map-system-case.html */
window.CMATH_PORTABLE_MAPS = Object.freeze({
  "spectral-theorem": {
    "schema": "cmath.project-view-model/v0.1",
    "semanticModel": "cmath.fact-claim-operation/v0.1",
    "project": {
      "id": "cmath:project:spectral-theorem",
      "title": "从特征值到谱定理"
    },
    "numberingLedger": {
      "schema": "cmath-gamma.math-map-numbering-ledger/v1",
      "projectId": "cmath:project:spectral-theorem",
      "highWaterMarks": {
        "定义": 4,
        "引理": 4,
        "定理": 2,
        "证明": 5
      },
      "allocations": {
        "spectral:entry:inner-product-space": {
          "kind": "定义",
          "number": 1,
          "state": "active"
        },
        "spectral:entry:linear-operator": {
          "kind": "定义",
          "number": 2,
          "state": "active"
        },
        "spectral:entry:self-adjoint": {
          "kind": "定义",
          "number": 3,
          "state": "active"
        },
        "spectral:entry:eigenpair": {
          "kind": "定义",
          "number": 4,
          "state": "active"
        },
        "spectral:entry:fta": {
          "kind": "定理",
          "number": 1,
          "state": "active"
        },
        "spectral:entry:eigenvalue-exists": {
          "kind": "引理",
          "number": 1,
          "state": "active"
        },
        "spectral:entry:real-eigenvalues": {
          "kind": "引理",
          "number": 2,
          "state": "active"
        },
        "spectral:entry:orthogonal-complement-invariant": {
          "kind": "引理",
          "number": 3,
          "state": "active"
        },
        "spectral:entry:restriction-self-adjoint": {
          "kind": "引理",
          "number": 4,
          "state": "active"
        },
        "spectral:entry:spectral-theorem": {
          "kind": "定理",
          "number": 2,
          "state": "active"
        },
        "spectral:inference:eigenvalue-exists": {
          "kind": "证明",
          "number": 1,
          "state": "active"
        },
        "spectral:inference:real-eigenvalues": {
          "kind": "证明",
          "number": 2,
          "state": "active"
        },
        "spectral:inference:orthogonal-complement-invariant": {
          "kind": "证明",
          "number": 3,
          "state": "active"
        },
        "spectral:inference:restriction-self-adjoint": {
          "kind": "证明",
          "number": 4,
          "state": "active"
        },
        "spectral:inference:spectral-theorem": {
          "kind": "证明",
          "number": 5,
          "state": "active"
        }
      }
    },
    "channelOptions": {
      "schema": "cmath-gamma.project-channel/v0.1",
      "projectId": "cmath:project:spectral-theorem",
      "boundaryLabel": "高等代数示例 · 数学地图与 Loop 进展",
      "adapterOptions": {
        "temporalUnitLabel": "Loop",
        "goalHierarchy": {
          "finalGoalId": "spectral:entry:spectral-theorem",
          "milestoneIds": []
        }
      }
    },
    "derivedResearchState": {
      "mathematicalState": {
        "foundationEntryIds": [
          "spectral:entry:inner-product-space",
          "spectral:entry:linear-operator",
          "spectral:entry:self-adjoint",
          "spectral:entry:eigenpair"
        ],
        "b0ClaimEntryIds": [
          "spectral:entry:fta"
        ]
      },
      "researchOverlay": {
        "loopTargetEntryId": "spectral:entry:spectral-theorem",
        "activeSectionIds": [
          "spectral:chapter:foundation",
          "spectral:chapter:proof"
        ],
        "routeDescription": "固定有限维复内积空间上的自伴算子，沿一个目标上下文逐步建立谱定理。",
        "nextActionDescription": "五个 Loop 已闭合；进展镜头重放同一张数学图的正式增量。"
      }
    },
    "entries": [
      {
        "id": "spectral:entry:inner-product-space",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 1",
        "shortTitle": "复内积空间",
        "title": "有限维复内积空间",
        "statement": "设 $V$ 是有限维复向量空间，并带有内积 $\\langle\\cdot,\\cdot\\rangle$；固定内积对第一个变量线性。",
        "chapterIds": [
          "spectral:chapter:foundation"
        ]
      },
      {
        "id": "spectral:entry:linear-operator",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 2",
        "shortTitle": "线性算子",
        "title": "内积空间上的线性算子",
        "statement": "线性算子是复线性映射 $A:V\\to V$。",
        "chapterIds": [
          "spectral:chapter:foundation"
        ]
      },
      {
        "id": "spectral:entry:self-adjoint",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 3",
        "shortTitle": "自伴算子",
        "title": "自伴算子",
        "statement": "若对任意 $v,w\\in V$ 都有 $\\langle Av,w\\rangle=\\langle v,Aw\\rangle$，则称 $A$ 为自伴算子。",
        "chapterIds": [
          "spectral:chapter:foundation"
        ]
      },
      {
        "id": "spectral:entry:eigenpair",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 4",
        "shortTitle": "特征对",
        "title": "特征值与特征向量",
        "statement": "若 $v\\ne0$ 且 $Av=\\lambda v$，则 $\\lambda$ 是 $A$ 的特征值，$v$ 是对应特征向量。",
        "chapterIds": [
          "spectral:chapter:foundation"
        ]
      },
      {
        "id": "spectral:entry:fta",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 1",
        "shortTitle": "代数基本定理",
        "title": "复多项式存在根",
        "statement": "每个次数至少为 $1$ 的复系数多项式在 $\\mathbb C$ 中至少有一个根。",
        "sourceReference": "Fundamental theorem of algebra",
        "chapterIds": [
          "spectral:chapter:foundation"
        ]
      },
      {
        "id": "spectral:entry:eigenvalue-exists",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 1",
        "shortTitle": "存在特征值",
        "title": "复线性算子存在特征值",
        "statement": "若 $V\\ne0$，则每个线性算子 $A:V\\to V$ 至少有一个复特征值。",
        "chapterIds": [
          "spectral:chapter:proof"
        ]
      },
      {
        "id": "spectral:entry:real-eigenvalues",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 2",
        "shortTitle": "特征值为实数",
        "title": "自伴算子的特征值是实数",
        "statement": "若 $A$ 自伴且 $Av=\\lambda v$，其中 $v\\ne0$，则 $\\lambda\\in\\mathbb R$。",
        "chapterIds": [
          "spectral:chapter:proof"
        ]
      },
      {
        "id": "spectral:entry:orthogonal-complement-invariant",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 3",
        "shortTitle": "正交补不变",
        "title": "特征方向的正交补保持不变",
        "statement": "若 $A$ 自伴且 $Av=\\lambda v$，令 $W=\\operatorname{span}\\{v\\}$，则 $A(W^\\perp)\\subseteq W^\\perp$。",
        "chapterIds": [
          "spectral:chapter:proof"
        ]
      },
      {
        "id": "spectral:entry:restriction-self-adjoint",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 4",
        "shortTitle": "限制仍自伴",
        "title": "正交补上的限制仍自伴",
        "statement": "在上一引理的条件下，$A|_{W^\\perp}:W^\\perp\\to W^\\perp$ 关于限制内积仍是自伴算子。",
        "chapterIds": [
          "spectral:chapter:proof"
        ]
      },
      {
        "id": "spectral:entry:spectral-theorem",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 2",
        "shortTitle": "谱定理",
        "title": "有限维复内积空间上的谱定理",
        "statement": "有限维复内积空间上的每个自伴算子都有一组由特征向量组成的标准正交基；等价地，它可被酉对角化，且全部特征值为实数。",
        "chapterIds": [
          "spectral:chapter:proof"
        ]
      }
    ],
    "inferences": [
      {
        "id": "spectral:inference:eigenvalue-exists",
        "operationKind": "proof",
        "displayLabel": "证明 1",
        "shortTitle": "特征多项式",
        "title": "由特征多项式得到特征值",
        "statement": "$p_A(t)=\\det(tI-A)$ 是正次复多项式；代数基本定理给出根 $\\lambda$，于是 $\\lambda I-A$ 不可逆并存在非零核向量。",
        "premises": [
          "spectral:entry:linear-operator",
          "spectral:entry:eigenpair",
          "spectral:entry:fta"
        ],
        "conclusion": "spectral:entry:eigenvalue-exists",
        "argument": "复特征多项式的根等价于特征值。"
      },
      {
        "id": "spectral:inference:real-eigenvalues",
        "operationKind": "proof",
        "displayLabel": "证明 2",
        "shortTitle": "内积比较",
        "title": "由自伴恒等式得到实特征值",
        "statement": "$\\lambda\\langle v,v\\rangle=\\langle Av,v\\rangle=\\langle v,Av\\rangle=\\overline{\\lambda}\\langle v,v\\rangle$，故 $\\lambda=\\overline{\\lambda}$。",
        "premises": [
          "spectral:entry:inner-product-space",
          "spectral:entry:self-adjoint",
          "spectral:entry:eigenpair",
          "spectral:entry:eigenvalue-exists"
        ],
        "conclusion": "spectral:entry:real-eigenvalues",
        "argument": "用正定性消去非零的 $\\langle v,v\\rangle$。"
      },
      {
        "id": "spectral:inference:orthogonal-complement-invariant",
        "operationKind": "proof",
        "displayLabel": "证明 3",
        "shortTitle": "正交补计算",
        "title": "由自伴性得到正交补不变",
        "statement": "若 $x\\in W^\\perp$，则 $\\langle Ax,v\\rangle=\\langle x,Av\\rangle=\\langle x,\\lambda v\\rangle=0$，故 $Ax\\in W^\\perp$。",
        "premises": [
          "spectral:entry:self-adjoint",
          "spectral:entry:eigenpair",
          "spectral:entry:real-eigenvalues"
        ],
        "conclusion": "spectral:entry:orthogonal-complement-invariant",
        "argument": "把算子从内积第一个变量移到第二个变量。"
      },
      {
        "id": "spectral:inference:restriction-self-adjoint",
        "operationKind": "proof",
        "displayLabel": "证明 4",
        "shortTitle": "限制恒等式",
        "title": "限制后的自伴恒等式",
        "statement": "对 $x,y\\in W^\\perp$，不变性保证限制算子良定义，而原等式 $\\langle Ax,y\\rangle=\\langle x,Ay\\rangle$ 仍成立。",
        "premises": [
          "spectral:entry:self-adjoint",
          "spectral:entry:orthogonal-complement-invariant"
        ],
        "conclusion": "spectral:entry:restriction-self-adjoint",
        "argument": "把原空间的自伴恒等式限制到不变子空间。"
      },
      {
        "id": "spectral:inference:spectral-theorem",
        "operationKind": "proof",
        "displayLabel": "证明 5",
        "shortTitle": "维数归纳",
        "title": "在正交补上归纳证明谱定理",
        "statement": "对 $\\dim V$ 归纳。取单位特征向量 $v$；在 $W^\\perp$ 上限制算子仍自伴，归纳得到其标准正交特征基，与 $v$ 合并得到 $V$ 的标准正交特征基。",
        "premises": [
          "spectral:entry:inner-product-space",
          "spectral:entry:eigenvalue-exists",
          "spectral:entry:real-eigenvalues",
          "spectral:entry:orthogonal-complement-invariant",
          "spectral:entry:restriction-self-adjoint"
        ],
        "conclusion": "spectral:entry:spectral-theorem",
        "argument": "沿特征方向分解并在低一维不变正交补上归纳。"
      }
    ],
    "chapters": [
      {
        "id": "spectral:chapter:foundation",
        "displayLabel": "Section 1",
        "title": "对象与外部基础",
        "entryIds": [
          "spectral:entry:inner-product-space",
          "spectral:entry:linear-operator",
          "spectral:entry:self-adjoint",
          "spectral:entry:eigenpair",
          "spectral:entry:fta"
        ],
        "inferenceIds": []
      },
      {
        "id": "spectral:chapter:proof",
        "displayLabel": "Section 2",
        "title": "谱定理主线",
        "entryIds": [
          "spectral:entry:eigenvalue-exists",
          "spectral:entry:real-eigenvalues",
          "spectral:entry:orthogonal-complement-invariant",
          "spectral:entry:restriction-self-adjoint",
          "spectral:entry:spectral-theorem"
        ],
        "inferenceIds": [
          "spectral:inference:eigenvalue-exists",
          "spectral:inference:real-eigenvalues",
          "spectral:inference:orthogonal-complement-invariant",
          "spectral:inference:restriction-self-adjoint",
          "spectral:inference:spectral-theorem"
        ]
      }
    ],
    "b0ClaimEntryIds": [
      "spectral:entry:fta"
    ],
    "loops": [
      {
        "id": "spectral:loop:01",
        "displayLabel": "证明 1",
        "title": "找到特征值",
        "resultState": "completed",
        "targetEntryId": "spectral:entry:spectral-theorem",
        "focusEntryId": "spectral:entry:eigenvalue-exists",
        "usedEntryIds": [
          "spectral:entry:linear-operator",
          "spectral:entry:eigenpair",
          "spectral:entry:fta"
        ],
        "deltaIds": [
          "spectral:entry:eigenvalue-exists",
          "spectral:inference:eigenvalue-exists"
        ],
        "resultSummary": "建立复线性算子至少有一个特征值。"
      },
      {
        "id": "spectral:loop:02",
        "displayLabel": "证明 2",
        "title": "证明特征值为实数",
        "resultState": "completed",
        "targetEntryId": "spectral:entry:spectral-theorem",
        "focusEntryId": "spectral:entry:real-eigenvalues",
        "usedEntryIds": [
          "spectral:entry:inner-product-space",
          "spectral:entry:self-adjoint",
          "spectral:entry:eigenpair",
          "spectral:entry:eigenvalue-exists"
        ],
        "deltaIds": [
          "spectral:entry:real-eigenvalues",
          "spectral:inference:real-eigenvalues"
        ],
        "resultSummary": "自伴性把已找到的特征值约束到实数。"
      },
      {
        "id": "spectral:loop:03",
        "displayLabel": "证明 3",
        "title": "建立正交补不变性",
        "resultState": "completed",
        "targetEntryId": "spectral:entry:spectral-theorem",
        "focusEntryId": "spectral:entry:orthogonal-complement-invariant",
        "usedEntryIds": [
          "spectral:entry:self-adjoint",
          "spectral:entry:eigenpair",
          "spectral:entry:real-eigenvalues"
        ],
        "deltaIds": [
          "spectral:entry:orthogonal-complement-invariant",
          "spectral:inference:orthogonal-complement-invariant"
        ],
        "resultSummary": "得到可降低维数的不变正交补。"
      },
      {
        "id": "spectral:loop:04",
        "displayLabel": "证明 4",
        "title": "验证限制仍自伴",
        "resultState": "completed",
        "targetEntryId": "spectral:entry:spectral-theorem",
        "focusEntryId": "spectral:entry:restriction-self-adjoint",
        "usedEntryIds": [
          "spectral:entry:self-adjoint",
          "spectral:entry:orthogonal-complement-invariant"
        ],
        "deltaIds": [
          "spectral:entry:restriction-self-adjoint",
          "spectral:inference:restriction-self-adjoint"
        ],
        "resultSummary": "归纳子问题仍属于同一类自伴算子。"
      },
      {
        "id": "spectral:loop:05",
        "displayLabel": "证明 5",
        "title": "完成维数归纳",
        "resultState": "completed",
        "targetEntryId": "spectral:entry:spectral-theorem",
        "focusEntryId": "spectral:entry:spectral-theorem",
        "usedEntryIds": [
          "spectral:entry:eigenvalue-exists",
          "spectral:entry:real-eigenvalues",
          "spectral:entry:orthogonal-complement-invariant",
          "spectral:entry:restriction-self-adjoint"
        ],
        "deltaIds": [
          "spectral:entry:spectral-theorem",
          "spectral:inference:spectral-theorem"
        ],
        "resultSummary": "建立标准正交特征基并完成谱定理。"
      }
    ]
  },
  "intermediate-value-theorem": {
    "schema": "cmath.project-view-model/v0.1",
    "semanticModel": "cmath.fact-claim-operation/v0.1",
    "project": {
      "id": "cmath:project:intermediate-value-theorem",
      "title": "从闭区间套到介值定理"
    },
    "numberingLedger": {
      "schema": "cmath-gamma.math-map-numbering-ledger/v1",
      "projectId": "cmath:project:intermediate-value-theorem",
      "highWaterMarks": {
        "定义": 3,
        "算法": 2,
        "引理": 4,
        "定理": 2,
        "证明": 5
      },
      "allocations": {
        "ivt:entry:closed-interval": {
          "kind": "定义",
          "number": 1,
          "state": "active"
        },
        "ivt:entry:continuity": {
          "kind": "定义",
          "number": 2,
          "state": "active"
        },
        "ivt:entry:sign-change": {
          "kind": "定义",
          "number": 3,
          "state": "active"
        },
        "ivt:entry:bisection": {
          "kind": "算法",
          "number": 1,
          "state": "active"
        },
        "ivt:entry:level-shift": {
          "kind": "算法",
          "number": 2,
          "state": "active"
        },
        "ivt:entry:nested-interval-theorem": {
          "kind": "定理",
          "number": 1,
          "state": "active"
        },
        "ivt:entry:sign-preservation": {
          "kind": "引理",
          "number": 1,
          "state": "active"
        },
        "ivt:entry:shrinking-intervals": {
          "kind": "引理",
          "number": 2,
          "state": "active"
        },
        "ivt:entry:common-limit": {
          "kind": "引理",
          "number": 3,
          "state": "active"
        },
        "ivt:entry:zero-form": {
          "kind": "引理",
          "number": 4,
          "state": "active"
        },
        "ivt:entry:intermediate-value-theorem": {
          "kind": "定理",
          "number": 2,
          "state": "active"
        },
        "ivt:inference:sign-preservation": {
          "kind": "证明",
          "number": 1,
          "state": "active"
        },
        "ivt:inference:shrinking-intervals": {
          "kind": "证明",
          "number": 2,
          "state": "active"
        },
        "ivt:inference:common-limit": {
          "kind": "证明",
          "number": 3,
          "state": "active"
        },
        "ivt:inference:zero-form": {
          "kind": "证明",
          "number": 4,
          "state": "active"
        },
        "ivt:inference:intermediate-value-theorem": {
          "kind": "证明",
          "number": 5,
          "state": "active"
        }
      }
    },
    "channelOptions": {
      "schema": "cmath-gamma.project-channel/v0.1",
      "projectId": "cmath:project:intermediate-value-theorem",
      "boundaryLabel": "数学分析示例 · 数学地图与 Loop 进展",
      "adapterOptions": {
        "temporalUnitLabel": "Loop",
        "goalHierarchy": {
          "finalGoalId": "ivt:entry:intermediate-value-theorem",
          "milestoneIds": []
        }
      }
    },
    "derivedResearchState": {
      "mathematicalState": {
        "foundationEntryIds": [
          "ivt:entry:closed-interval",
          "ivt:entry:continuity",
          "ivt:entry:sign-change",
          "ivt:entry:bisection",
          "ivt:entry:level-shift"
        ],
        "b0ClaimEntryIds": [
          "ivt:entry:nested-interval-theorem"
        ]
      },
      "researchOverlay": {
        "loopTargetEntryId": "ivt:entry:intermediate-value-theorem",
        "activeSectionIds": [
          "ivt:chapter:foundation",
          "ivt:chapter:proof"
        ],
        "routeDescription": "在实数闭区间上固定连续函数，沿二分构造这一条证明主线建立介值定理。",
        "nextActionDescription": "五个 Loop 已闭合；进展镜头重放同一张数学图的正式增量。"
      }
    },
    "entries": [
      {
        "id": "ivt:entry:closed-interval",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 1",
        "shortTitle": "闭区间",
        "title": "实数闭区间",
        "statement": "给定实数 $a<b$，闭区间 $[a,b]$ 是满足 $a\\le x\\le b$ 的全体实数 $x$ 所成的集合。",
        "chapterIds": [
          "ivt:chapter:foundation"
        ]
      },
      {
        "id": "ivt:entry:continuity",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 2",
        "shortTitle": "连续函数",
        "title": "闭区间上的连续函数",
        "statement": "函数 $f:[a,b]\\to\\mathbb R$ 在 $c\\in[a,b]$ 连续，是指对任意 $\\varepsilon>0$，存在 $\\delta>0$，使得 $x\\in[a,b]$ 且 $|x-c|<\\delta$ 时有 $|f(x)-f(c)|<\\varepsilon$；若每一点都连续，则称 $f$ 在 $[a,b]$ 上连续。",
        "chapterIds": [
          "ivt:chapter:foundation"
        ]
      },
      {
        "id": "ivt:entry:sign-change",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 3",
        "shortTitle": "变号区间",
        "title": "函数的变号区间",
        "statement": "若函数 $f$ 在闭区间 $[u,v]$ 的端点满足 $f(u)\\le0\\le f(v)$，则称 $[u,v]$ 是按此方向记号的变号区间。",
        "chapterIds": [
          "ivt:chapter:foundation"
        ]
      },
      {
        "id": "ivt:entry:bisection",
        "entryClass": "fact",
        "factKind": "algorithm",
        "displayLabel": "算法 1",
        "shortTitle": "二分取区间",
        "title": "变号区间的二分算法",
        "statement": "对变号区间 $[a_n,b_n]$ 取中点 $m_n=(a_n+b_n)/2$；若 $f(m_n)\\ge0$，令 $[a_{n+1},b_{n+1}]=[a_n,m_n]$，否则令 $[a_{n+1},b_{n+1}]=[m_n,b_n]$。",
        "chapterIds": [
          "ivt:chapter:foundation"
        ]
      },
      {
        "id": "ivt:entry:level-shift",
        "entryClass": "fact",
        "factKind": "algorithm",
        "displayLabel": "算法 2",
        "shortTitle": "平移目标值",
        "title": "把目标值平移为零点",
        "statement": "给定目标值 $y$：若 $f(a)\\le y\\le f(b)$，定义 $g(x)=f(x)-y$；若 $f(b)\\le y\\le f(a)$，定义 $g(x)=y-f(x)$。两种情形中，求解 $f(c)=y$ 都等价于求解 $g(c)=0$，且 $g(a)\\le0\\le g(b)$。",
        "chapterIds": [
          "ivt:chapter:foundation"
        ]
      },
      {
        "id": "ivt:entry:nested-interval-theorem",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 1",
        "shortTitle": "闭区间套定理",
        "title": "长度趋于零的闭区间套定理",
        "statement": "若非空闭区间列 $I_n=[a_n,b_n]$ 满足 $I_{n+1}\\subseteq I_n$ 且 $b_n-a_n\\to0$，则存在唯一 $c\\in\\mathbb R$ 使 $c\\in I_n$ 对所有 $n$ 成立，并且 $a_n\\to c$、$b_n\\to c$。",
        "sourceReference": "Nested interval theorem for the complete ordered field of real numbers",
        "chapterIds": [
          "ivt:chapter:foundation"
        ]
      },
      {
        "id": "ivt:entry:sign-preservation",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 1",
        "shortTitle": "二分保持变号",
        "title": "二分步骤保持端点变号",
        "statement": "若 $[a_n,b_n]$ 是变号区间，则二分算法产生的 $[a_{n+1},b_{n+1}]$ 仍满足 $f(a_{n+1})\\le0\\le f(b_{n+1})$。",
        "chapterIds": [
          "ivt:chapter:proof"
        ]
      },
      {
        "id": "ivt:entry:shrinking-intervals",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 2",
        "shortTitle": "得到收缩区间套",
        "title": "二分产生长度趋于零的闭区间套",
        "statement": "二分算法产生的区间列满足 $[a_{n+1},b_{n+1}]\\subseteq[a_n,b_n]$，且 $b_n-a_n=2^{-n}(b_0-a_0)\\to0$。",
        "chapterIds": [
          "ivt:chapter:proof"
        ]
      },
      {
        "id": "ivt:entry:common-limit",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 3",
        "shortTitle": "端点趋于同一点",
        "title": "二分端点收敛到唯一公共点",
        "statement": "存在唯一 $c\\in[a_0,b_0]$，使得 $c\\in[a_n,b_n]$ 对所有 $n$ 成立，并且 $a_n\\to c$、$b_n\\to c$。",
        "chapterIds": [
          "ivt:chapter:proof"
        ]
      },
      {
        "id": "ivt:entry:zero-form",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 4",
        "shortTitle": "变号连续函数有零点",
        "title": "介值定理的零点形式",
        "statement": "若 $f:[a,b]\\to\\mathbb R$ 连续且 $f(a)\\le0\\le f(b)$，则存在 $c\\in[a,b]$ 使得 $f(c)=0$。",
        "chapterIds": [
          "ivt:chapter:proof"
        ]
      },
      {
        "id": "ivt:entry:intermediate-value-theorem",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 2",
        "shortTitle": "介值定理",
        "title": "闭区间上的介值定理",
        "statement": "若 $f:[a,b]\\to\\mathbb R$ 连续，且实数 $y$ 位于 $f(a)$ 与 $f(b)$ 之间，则存在 $c\\in[a,b]$ 使得 $f(c)=y$。",
        "chapterIds": [
          "ivt:chapter:proof"
        ]
      }
    ],
    "inferences": [
      {
        "id": "ivt:inference:sign-preservation",
        "operationKind": "proof",
        "displayLabel": "证明 1",
        "shortTitle": "按中点符号选半区间",
        "title": "二分选择保持变号",
        "statement": "中点值非负时保留左半区间，端点值仍为非正与非负；中点值为负时保留右半区间，同样保持端点变号。",
        "premises": [
          "ivt:entry:sign-change",
          "ivt:entry:bisection"
        ],
        "conclusion": "ivt:entry:sign-preservation",
        "argument": "对 $f(m_n)\\ge0$ 与 $f(m_n)<0$ 两种情形分别代入新区间端点。"
      },
      {
        "id": "ivt:inference:shrinking-intervals",
        "operationKind": "proof",
        "displayLabel": "证明 2",
        "shortTitle": "迭代区间长度",
        "title": "由二分迭代得到收缩区间套",
        "statement": "每一步选取原区间的一半，故新区间包含于原区间且长度减半；归纳得到 $b_n-a_n=2^{-n}(b_0-a_0)$。",
        "premises": [
          "ivt:entry:closed-interval",
          "ivt:entry:bisection",
          "ivt:entry:sign-preservation"
        ],
        "conclusion": "ivt:entry:shrinking-intervals",
        "argument": "用区间包含关系与等比长度公式归纳。"
      },
      {
        "id": "ivt:inference:common-limit",
        "operationKind": "proof",
        "displayLabel": "证明 3",
        "shortTitle": "应用闭区间套定理",
        "title": "由完备性得到公共极限点",
        "statement": "收缩区间列满足闭区间套定理的全部条件，因此交集恰含一点 $c$，并且左右端点都收敛到 $c$。",
        "premises": [
          "ivt:entry:nested-interval-theorem",
          "ivt:entry:shrinking-intervals"
        ],
        "conclusion": "ivt:entry:common-limit",
        "argument": "把二分所得区间列代入闭区间套定理。"
      },
      {
        "id": "ivt:inference:zero-form",
        "operationKind": "proof",
        "displayLabel": "证明 4",
        "shortTitle": "连续性夹出零点",
        "title": "由端点极限和连续性得到零点",
        "statement": "由 $a_n\\to c$、$b_n\\to c$ 与连续性，有 $f(a_n)\\to f(c)$、$f(b_n)\\to f(c)$；而始终 $f(a_n)\\le0\\le f(b_n)$，故 $f(c)\\le0$ 且 $f(c)\\ge0$，于是 $f(c)=0$。",
        "premises": [
          "ivt:entry:continuity",
          "ivt:entry:sign-preservation",
          "ivt:entry:common-limit"
        ],
        "conclusion": "ivt:entry:zero-form",
        "argument": "对保持的端点不等式取极限。"
      },
      {
        "id": "ivt:inference:intermediate-value-theorem",
        "operationKind": "proof",
        "displayLabel": "证明 5",
        "shortTitle": "平移到零点形式",
        "title": "由零点形式推出一般介值定理",
        "statement": "若 $f(a)\\le y\\le f(b)$，取 $g=f-y$；若 $f(b)\\le y\\le f(a)$，取 $g=y-f$。两种情形中 $g$ 都连续并满足 $g(a)\\le0\\le g(b)$；零点形式给出 $g(c)=0$，即 $f(c)=y$。",
        "premises": [
          "ivt:entry:continuity",
          "ivt:entry:level-shift",
          "ivt:entry:zero-form"
        ],
        "conclusion": "ivt:entry:intermediate-value-theorem",
        "argument": "把任意中间值问题化为连续函数的零点问题。"
      }
    ],
    "chapters": [
      {
        "id": "ivt:chapter:foundation",
        "displayLabel": "Section 1",
        "title": "定义、算法与基础定理",
        "entryIds": [
          "ivt:entry:closed-interval",
          "ivt:entry:continuity",
          "ivt:entry:sign-change",
          "ivt:entry:bisection",
          "ivt:entry:level-shift",
          "ivt:entry:nested-interval-theorem"
        ],
        "inferenceIds": []
      },
      {
        "id": "ivt:chapter:proof",
        "displayLabel": "Section 2",
        "title": "介值定理主线",
        "entryIds": [
          "ivt:entry:sign-preservation",
          "ivt:entry:shrinking-intervals",
          "ivt:entry:common-limit",
          "ivt:entry:zero-form",
          "ivt:entry:intermediate-value-theorem"
        ],
        "inferenceIds": [
          "ivt:inference:sign-preservation",
          "ivt:inference:shrinking-intervals",
          "ivt:inference:common-limit",
          "ivt:inference:zero-form",
          "ivt:inference:intermediate-value-theorem"
        ]
      }
    ],
    "b0ClaimEntryIds": [
      "ivt:entry:nested-interval-theorem"
    ],
    "loops": [
      {
        "id": "ivt:loop:01",
        "displayLabel": "证明 1",
        "title": "验证二分保持变号",
        "resultState": "completed",
        "targetEntryId": "ivt:entry:intermediate-value-theorem",
        "focusEntryId": "ivt:entry:sign-preservation",
        "usedEntryIds": [
          "ivt:entry:sign-change",
          "ivt:entry:bisection"
        ],
        "deltaIds": [
          "ivt:entry:sign-preservation",
          "ivt:inference:sign-preservation"
        ],
        "resultSummary": "证明每次二分后仍保留一个变号闭区间。"
      },
      {
        "id": "ivt:loop:02",
        "displayLabel": "证明 2",
        "title": "构造收缩区间套",
        "resultState": "completed",
        "targetEntryId": "ivt:entry:intermediate-value-theorem",
        "focusEntryId": "ivt:entry:shrinking-intervals",
        "usedEntryIds": [
          "ivt:entry:closed-interval",
          "ivt:entry:bisection",
          "ivt:entry:sign-preservation"
        ],
        "deltaIds": [
          "ivt:entry:shrinking-intervals",
          "ivt:inference:shrinking-intervals"
        ],
        "resultSummary": "得到嵌套且长度按二次幂趋于零的闭区间列。"
      },
      {
        "id": "ivt:loop:03",
        "displayLabel": "证明 3",
        "title": "取得唯一公共极限点",
        "resultState": "completed",
        "targetEntryId": "ivt:entry:intermediate-value-theorem",
        "focusEntryId": "ivt:entry:common-limit",
        "usedEntryIds": [
          "ivt:entry:nested-interval-theorem",
          "ivt:entry:shrinking-intervals"
        ],
        "deltaIds": [
          "ivt:entry:common-limit",
          "ivt:inference:common-limit"
        ],
        "resultSummary": "由闭区间套定理得到端点共同收敛到唯一点。"
      },
      {
        "id": "ivt:loop:04",
        "displayLabel": "证明 4",
        "title": "用连续性得到零点",
        "resultState": "completed",
        "targetEntryId": "ivt:entry:intermediate-value-theorem",
        "focusEntryId": "ivt:entry:zero-form",
        "usedEntryIds": [
          "ivt:entry:continuity",
          "ivt:entry:sign-preservation",
          "ivt:entry:common-limit"
        ],
        "deltaIds": [
          "ivt:entry:zero-form",
          "ivt:inference:zero-form"
        ],
        "resultSummary": "端点函数值的符号约束在公共极限点处夹出零值。"
      },
      {
        "id": "ivt:loop:05",
        "displayLabel": "证明 5",
        "title": "推广到任意中间值",
        "resultState": "completed",
        "targetEntryId": "ivt:entry:intermediate-value-theorem",
        "focusEntryId": "ivt:entry:intermediate-value-theorem",
        "usedEntryIds": [
          "ivt:entry:continuity",
          "ivt:entry:level-shift",
          "ivt:entry:zero-form"
        ],
        "deltaIds": [
          "ivt:entry:intermediate-value-theorem",
          "ivt:inference:intermediate-value-theorem"
        ],
        "resultSummary": "把目标值平移到零点问题并建立一般介值定理。"
      }
    ]
  },
  "fundamental-theorem-calculus": {
    "schema": "cmath.project-view-model/v0.1",
    "semanticModel": "cmath.fact-claim-operation/v0.1",
    "project": {
      "id": "cmath:project:fundamental-theorem-calculus",
      "title": "从积分累积函数到微积分基本定理"
    },
    "numberingLedger": {
      "schema": "cmath-gamma.math-map-numbering-ledger/v1",
      "projectId": "cmath:project:fundamental-theorem-calculus",
      "highWaterMarks": {
        "定义": 5,
        "引理": 2,
        "定理": 7,
        "证明": 5
      },
      "allocations": {
        "ftc:entry:continuity": {
          "kind": "定义",
          "number": 1,
          "state": "active"
        },
        "ftc:entry:derivative": {
          "kind": "定义",
          "number": 2,
          "state": "active"
        },
        "ftc:entry:riemann-integral": {
          "kind": "定义",
          "number": 3,
          "state": "active"
        },
        "ftc:entry:accumulation-function": {
          "kind": "定义",
          "number": 4,
          "state": "active"
        },
        "ftc:entry:antiderivative": {
          "kind": "定义",
          "number": 5,
          "state": "active"
        },
        "ftc:entry:continuous-integrability": {
          "kind": "定理",
          "number": 1,
          "state": "active"
        },
        "ftc:entry:integral-additivity": {
          "kind": "定理",
          "number": 2,
          "state": "active"
        },
        "ftc:entry:integral-estimate": {
          "kind": "定理",
          "number": 3,
          "state": "active"
        },
        "ftc:entry:mean-value-theorem": {
          "kind": "定理",
          "number": 4,
          "state": "active"
        },
        "ftc:entry:local-integral-average": {
          "kind": "引理",
          "number": 1,
          "state": "active"
        },
        "ftc:entry:ftc-part-one": {
          "kind": "定理",
          "number": 5,
          "state": "active"
        },
        "ftc:entry:zero-derivative-constant": {
          "kind": "引理",
          "number": 2,
          "state": "active"
        },
        "ftc:entry:newton-leibniz": {
          "kind": "定理",
          "number": 6,
          "state": "active"
        },
        "ftc:entry:fundamental-theorem-calculus": {
          "kind": "定理",
          "number": 7,
          "state": "active"
        },
        "ftc:inference:local-integral-average": {
          "kind": "证明",
          "number": 1,
          "state": "active"
        },
        "ftc:inference:ftc-part-one": {
          "kind": "证明",
          "number": 2,
          "state": "active"
        },
        "ftc:inference:zero-derivative-constant": {
          "kind": "证明",
          "number": 3,
          "state": "active"
        },
        "ftc:inference:newton-leibniz": {
          "kind": "证明",
          "number": 4,
          "state": "active"
        },
        "ftc:inference:fundamental-theorem-calculus": {
          "kind": "证明",
          "number": 5,
          "state": "active"
        }
      }
    },
    "channelOptions": {
      "schema": "cmath-gamma.project-channel/v0.1",
      "projectId": "cmath:project:fundamental-theorem-calculus",
      "boundaryLabel": "微积分示例 · 数学地图与 Loop 进展",
      "adapterOptions": {
        "temporalUnitLabel": "Loop",
        "goalHierarchy": {
          "finalGoalId": "ftc:entry:fundamental-theorem-calculus",
          "milestoneIds": []
        }
      }
    },
    "derivedResearchState": {
      "mathematicalState": {
        "foundationEntryIds": [
          "ftc:entry:continuity",
          "ftc:entry:derivative",
          "ftc:entry:riemann-integral",
          "ftc:entry:accumulation-function",
          "ftc:entry:antiderivative"
        ],
        "b0ClaimEntryIds": [
          "ftc:entry:continuous-integrability",
          "ftc:entry:integral-additivity",
          "ftc:entry:integral-estimate",
          "ftc:entry:mean-value-theorem"
        ]
      },
      "researchOverlay": {
        "loopTargetEntryId": "ftc:entry:fundamental-theorem-calculus",
        "activeSectionIds": [
          "ftc:chapter:foundation",
          "ftc:chapter:proof"
        ],
        "routeDescription": "固定闭区间上的连续函数，沿积分累积函数这一条主线建立微积分基本定理的两个部分。",
        "nextActionDescription": "五个 Loop 已闭合；进展镜头重放同一张数学图的正式增量。"
      }
    },
    "entries": [
      {
        "id": "ftc:entry:continuity",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 1",
        "shortTitle": "闭区间连续",
        "title": "闭区间上的连续函数",
        "statement": "函数 $f:[a,b]\\to\\mathbb R$ 在 $[a,b]$ 上连续，是指它在每个内点连续，并在端点分别右连续与左连续。",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:derivative",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 2",
        "shortTitle": "导数",
        "title": "函数在一点的导数",
        "statement": "若极限 $H'(x)=\\lim_{h\\to0}\\frac{H(x+h)-H(x)}{h}$ 存在，则称 $H$ 在 $x$ 处可导，并称该极限为 $H$ 在 $x$ 处的导数。",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:riemann-integral",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 3",
        "shortTitle": "Riemann 积分",
        "title": "闭区间上的 Riemann 积分",
        "statement": "若函数 $f:[u,v]\\to\\mathbb R$ 的所有带标记分割 Riemann 和在分割直径趋于零时收敛到同一个数，则称 $f$ 在 $[u,v]$ 上 Riemann 可积，并把该数记为 $\\int_u^v f(t)\\,dt$。约定 $\\int_v^u f=-\\int_u^v f$ 且 $\\int_u^u f=0$。",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:accumulation-function",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 4",
        "shortTitle": "积分累积函数",
        "title": "由定积分定义的累积函数",
        "statement": "若 $f$ 在 $[a,b]$ 上可积，则以 $a$ 为基点的积分累积函数定义为 $F(x)=\\int_a^x f(t)\\,dt$，其中 $x\\in[a,b]$。",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:antiderivative",
        "entryClass": "fact",
        "factKind": "definition",
        "displayLabel": "定义 5",
        "shortTitle": "原函数",
        "title": "连续函数的原函数",
        "statement": "若 $G$ 在 $[a,b]$ 上连续、在 $(a,b)$ 上可导，并且 $G'(x)=f(x)$ 对每个 $x\\in(a,b)$ 成立，则称 $G$ 是 $f$ 在 $[a,b]$ 上的一个原函数。",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:continuous-integrability",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 1",
        "shortTitle": "连续函数可积",
        "title": "闭区间上的连续函数 Riemann 可积",
        "statement": "每个连续函数 $f:[a,b]\\to\\mathbb R$ 都在 $[a,b]$ 上 Riemann 可积。",
        "sourceReference": "Riemann integrability theorem for continuous functions on compact intervals",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:integral-additivity",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 2",
        "shortTitle": "积分区间可加",
        "title": "定积分关于区间的可加性",
        "statement": "若 $f$ 在 $[a,b]$ 上 Riemann 可积，则对任意 $u,v,w\\in[a,b]$，有 $\\int_u^w f(t)\\,dt=\\int_u^v f(t)\\,dt+\\int_v^w f(t)\\,dt$。",
        "sourceReference": "Additivity of the oriented Riemann integral over adjacent intervals",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:integral-estimate",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 3",
        "shortTitle": "积分绝对值估计",
        "title": "Riemann 积分的上界估计",
        "statement": "若 $f$ 在包含 $u,v$ 的闭区间上 Riemann 可积，且 $|f(t)|\\le M$，则 $\\left|\\int_u^v f(t)\\,dt\\right|\\le M|v-u|$。",
        "sourceReference": "Order and absolute-value estimate for the Riemann integral",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:mean-value-theorem",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 4",
        "shortTitle": "Lagrange 中值定理",
        "title": "Lagrange 中值定理",
        "statement": "若 $H$ 在 $[u,v]$ 上连续并在 $(u,v)$ 上可导，则存在 $\\xi\\in(u,v)$ 使 $H(v)-H(u)=H'(\\xi)(v-u)$。",
        "sourceReference": "Lagrange mean value theorem",
        "chapterIds": [
          "ftc:chapter:foundation"
        ]
      },
      {
        "id": "ftc:entry:local-integral-average",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 1",
        "shortTitle": "局部积分平均",
        "title": "连续函数的局部积分平均收敛到函数值",
        "statement": "若 $f$ 在 $x\\in(a,b)$ 处连续，则对充分小的非零 $h$，有 $\\lim_{h\\to0}\\frac1h\\int_x^{x+h}f(t)\\,dt=f(x)$。",
        "chapterIds": [
          "ftc:chapter:proof"
        ]
      },
      {
        "id": "ftc:entry:ftc-part-one",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 5",
        "shortTitle": "积分函数求导",
        "title": "微积分基本定理第一部分",
        "statement": "若 $f:[a,b]\\to\\mathbb R$ 连续，并定义 $F(x)=\\int_a^x f(t)\\,dt$，则 $F$ 在 $[a,b]$ 上连续、在 $(a,b)$ 上可导，且 $F'(x)=f(x)$。",
        "chapterIds": [
          "ftc:chapter:proof"
        ]
      },
      {
        "id": "ftc:entry:zero-derivative-constant",
        "entryClass": "claim",
        "claimKind": "lemma",
        "displayLabel": "引理 2",
        "shortTitle": "零导数即常数",
        "title": "导数恒为零的函数是常数",
        "statement": "若 $H$ 在 $[a,b]$ 上连续、在 $(a,b)$ 上可导，并且 $H'(x)=0$ 对所有 $x\\in(a,b)$ 成立，则 $H$ 在 $[a,b]$ 上为常数。",
        "chapterIds": [
          "ftc:chapter:proof"
        ]
      },
      {
        "id": "ftc:entry:newton-leibniz",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 6",
        "shortTitle": "Newton–Leibniz 公式",
        "title": "用任一原函数计算定积分的 Newton–Leibniz 公式",
        "statement": "若 $f:[a,b]\\to\\mathbb R$ 连续，且 $G$ 是 $f$ 在 $[a,b]$ 上的原函数，则 $\\int_a^b f(t)\\,dt=G(b)-G(a)$。",
        "chapterIds": [
          "ftc:chapter:proof"
        ]
      },
      {
        "id": "ftc:entry:fundamental-theorem-calculus",
        "entryClass": "claim",
        "claimKind": "theorem",
        "displayLabel": "定理 7",
        "shortTitle": "微积分基本定理",
        "title": "闭区间上连续函数的微积分基本定理",
        "statement": "若 $f:[a,b]\\to\\mathbb R$ 连续，则积分累积函数 $F(x)=\\int_a^x f(t)\\,dt$ 在 $(a,b)$ 上满足 $F'(x)=f(x)$；并且对 $f$ 的任一原函数 $G$，都有 $\\int_a^b f(t)\\,dt=G(b)-G(a)$。",
        "chapterIds": [
          "ftc:chapter:proof"
        ]
      }
    ],
    "inferences": [
      {
        "id": "ftc:inference:local-integral-average",
        "operationKind": "proof",
        "displayLabel": "证明 1",
        "shortTitle": "用连续性控制积分平均",
        "title": "连续性与积分估计给出局部平均极限",
        "statement": "把局部积分平均与 $f(x)$ 的差写成 $\\frac1h\\int_x^{x+h}(f(t)-f(x))\\,dt$；连续性使被积函数在短区间上一致小，积分估计遂使该差趋于零。",
        "premises": [
          "ftc:entry:continuity",
          "ftc:entry:riemann-integral",
          "ftc:entry:integral-estimate"
        ],
        "conclusion": "ftc:entry:local-integral-average",
        "argument": "给定 $\\varepsilon>0$，取 $\\delta$ 使 $|t-x|<\\delta$ 时 $|f(t)-f(x)|<\\varepsilon$；对 $0<|h|<\\delta$ 应用积分绝对值估计。"
      },
      {
        "id": "ftc:inference:ftc-part-one",
        "operationKind": "proof",
        "displayLabel": "证明 2",
        "shortTitle": "把差商化为积分平均",
        "title": "积分可加性把累积函数差商化为局部平均",
        "statement": "由积分可加性，$F(x+h)-F(x)=\\int_x^{x+h}f(t)\\,dt$；局部积分平均引理给出 $F'(x)=f(x)$，同一积分估计还给出 $F$ 的连续性。",
        "premises": [
          "ftc:entry:continuous-integrability",
          "ftc:entry:integral-additivity",
          "ftc:entry:integral-estimate",
          "ftc:entry:accumulation-function",
          "ftc:entry:local-integral-average"
        ],
        "conclusion": "ftc:entry:ftc-part-one",
        "argument": "先用连续可积性保证 $F$ 有定义，再对差商应用区间可加性与局部平均极限；有界性和积分估计处理连续性。"
      },
      {
        "id": "ftc:inference:zero-derivative-constant",
        "operationKind": "proof",
        "displayLabel": "证明 3",
        "shortTitle": "应用中值定理",
        "title": "由 Lagrange 中值定理推出零导数函数为常数",
        "statement": "任取 $u<v$，中值定理给出 $H(v)-H(u)=H'(\\xi)(v-u)=0$，故任意两点函数值相同。",
        "premises": [
          "ftc:entry:derivative",
          "ftc:entry:mean-value-theorem"
        ],
        "conclusion": "ftc:entry:zero-derivative-constant",
        "argument": "对任意子区间 $[u,v]\\subseteq[a,b]$ 应用中值定理。"
      },
      {
        "id": "ftc:inference:newton-leibniz",
        "operationKind": "proof",
        "displayLabel": "证明 4",
        "shortTitle": "比较积分函数与原函数",
        "title": "积分累积函数与任一原函数只差常数",
        "statement": "令 $F(x)=\\int_a^x f(t)\\,dt$。由第一部分，$(F-G)'=f-f=0$，故 $F-G$ 为常数；代入 $x=a$ 得 $F(x)=G(x)-G(a)$，再令 $x=b$ 即得公式。",
        "premises": [
          "ftc:entry:accumulation-function",
          "ftc:entry:antiderivative",
          "ftc:entry:ftc-part-one",
          "ftc:entry:zero-derivative-constant"
        ],
        "conclusion": "ftc:entry:newton-leibniz",
        "argument": "把两个具有相同导数的函数相减，并用零导数函数为常数。"
      },
      {
        "id": "ftc:inference:fundamental-theorem-calculus",
        "operationKind": "proof",
        "displayLabel": "证明 5",
        "shortTitle": "合并微分与积分结论",
        "title": "合并积分函数求导与 Newton–Leibniz 公式",
        "statement": "第一部分说明连续函数的积分累积函数以原连续函数为导数；Newton–Leibniz 公式说明任一原函数的端点增量等于定积分，两者合起来即为微积分基本定理。",
        "premises": [
          "ftc:entry:ftc-part-one",
          "ftc:entry:newton-leibniz"
        ],
        "conclusion": "ftc:entry:fundamental-theorem-calculus",
        "argument": "逐项读取两个已建立结论，它们恰好组成目标定理的两个断言。"
      }
    ],
    "chapters": [
      {
        "id": "ftc:chapter:foundation",
        "displayLabel": "Section 1",
        "title": "定义与直接采用的基础定理",
        "entryIds": [
          "ftc:entry:continuity",
          "ftc:entry:derivative",
          "ftc:entry:riemann-integral",
          "ftc:entry:accumulation-function",
          "ftc:entry:antiderivative",
          "ftc:entry:continuous-integrability",
          "ftc:entry:integral-additivity",
          "ftc:entry:integral-estimate",
          "ftc:entry:mean-value-theorem"
        ],
        "inferenceIds": []
      },
      {
        "id": "ftc:chapter:proof",
        "displayLabel": "Section 2",
        "title": "微积分基本定理主线",
        "entryIds": [
          "ftc:entry:local-integral-average",
          "ftc:entry:ftc-part-one",
          "ftc:entry:zero-derivative-constant",
          "ftc:entry:newton-leibniz",
          "ftc:entry:fundamental-theorem-calculus"
        ],
        "inferenceIds": [
          "ftc:inference:local-integral-average",
          "ftc:inference:ftc-part-one",
          "ftc:inference:zero-derivative-constant",
          "ftc:inference:newton-leibniz",
          "ftc:inference:fundamental-theorem-calculus"
        ]
      }
    ],
    "b0ClaimEntryIds": [
      "ftc:entry:continuous-integrability",
      "ftc:entry:integral-additivity",
      "ftc:entry:integral-estimate",
      "ftc:entry:mean-value-theorem"
    ],
    "loops": [
      {
        "id": "ftc:loop:01",
        "loopKind": "proof",
        "displayLabel": "证明 1",
        "title": "建立局部积分平均极限",
        "action": "用连续性控制短区间上的函数振幅，并应用积分估计。",
        "effect": "建立局部积分平均引理。",
        "remainingGap": "尚未把积分平均识别为累积函数的差商。",
        "resultState": "completed",
        "isMathematicalLoop": true,
        "targetEntryId": "ftc:entry:fundamental-theorem-calculus",
        "focusEntryId": "ftc:entry:local-integral-average",
        "usedEntryIds": [
          "ftc:entry:continuity",
          "ftc:entry:riemann-integral",
          "ftc:entry:integral-estimate"
        ],
        "deltaIds": [
          "ftc:entry:local-integral-average",
          "ftc:inference:local-integral-average"
        ],
        "resultSummary": "连续性使短区间积分平均收敛到中心点函数值。"
      },
      {
        "id": "ftc:loop:02",
        "loopKind": "proof",
        "displayLabel": "证明 2",
        "title": "证明积分累积函数可导",
        "action": "用积分区间可加性把累积函数差商改写成局部积分平均。",
        "effect": "建立微积分基本定理第一部分。",
        "remainingGap": "尚未说明任一原函数怎样计算定积分。",
        "resultState": "completed",
        "isMathematicalLoop": true,
        "targetEntryId": "ftc:entry:fundamental-theorem-calculus",
        "focusEntryId": "ftc:entry:ftc-part-one",
        "usedEntryIds": [
          "ftc:entry:continuous-integrability",
          "ftc:entry:integral-additivity",
          "ftc:entry:integral-estimate",
          "ftc:entry:accumulation-function",
          "ftc:entry:local-integral-average"
        ],
        "deltaIds": [
          "ftc:entry:ftc-part-one",
          "ftc:inference:ftc-part-one"
        ],
        "resultSummary": "积分累积函数的导数等于原连续函数。"
      },
      {
        "id": "ftc:loop:03",
        "loopKind": "proof",
        "displayLabel": "证明 3",
        "title": "建立零导数函数为常数",
        "action": "在任意子区间上应用 Lagrange 中值定理。",
        "effect": "得到比较两个原函数所需的唯一性引理。",
        "remainingGap": "尚未比较积分累积函数与给定原函数。",
        "resultState": "completed",
        "isMathematicalLoop": true,
        "targetEntryId": "ftc:entry:fundamental-theorem-calculus",
        "focusEntryId": "ftc:entry:zero-derivative-constant",
        "usedEntryIds": [
          "ftc:entry:derivative",
          "ftc:entry:mean-value-theorem"
        ],
        "deltaIds": [
          "ftc:entry:zero-derivative-constant",
          "ftc:inference:zero-derivative-constant"
        ],
        "resultSummary": "导数恒为零的函数在整个闭区间上为常数。"
      },
      {
        "id": "ftc:loop:04",
        "loopKind": "proof",
        "displayLabel": "证明 4",
        "title": "推出 Newton–Leibniz 公式",
        "action": "比较积分累积函数与任一原函数，并在基点确定常数。",
        "effect": "建立用原函数端点差计算定积分的公式。",
        "remainingGap": "尚未把两个部分合并为目标定理。",
        "resultState": "completed",
        "isMathematicalLoop": true,
        "targetEntryId": "ftc:entry:fundamental-theorem-calculus",
        "focusEntryId": "ftc:entry:newton-leibniz",
        "usedEntryIds": [
          "ftc:entry:accumulation-function",
          "ftc:entry:antiderivative",
          "ftc:entry:ftc-part-one",
          "ftc:entry:zero-derivative-constant"
        ],
        "deltaIds": [
          "ftc:entry:newton-leibniz",
          "ftc:inference:newton-leibniz"
        ],
        "resultSummary": "积分累积函数与任一原函数只差由基点决定的常数。"
      },
      {
        "id": "ftc:loop:05",
        "loopKind": "proof",
        "displayLabel": "证明 5",
        "title": "合并微积分基本定理",
        "action": "合并积分函数求导与 Newton–Leibniz 公式。",
        "effect": "建立目标微积分基本定理。",
        "remainingGap": "无；目标 Claim 已建立。",
        "resultState": "completed",
        "isMathematicalLoop": true,
        "targetEntryId": "ftc:entry:fundamental-theorem-calculus",
        "focusEntryId": "ftc:entry:fundamental-theorem-calculus",
        "usedEntryIds": [
          "ftc:entry:ftc-part-one",
          "ftc:entry:newton-leibniz"
        ],
        "deltaIds": [
          "ftc:entry:fundamental-theorem-calculus",
          "ftc:inference:fundamental-theorem-calculus"
        ],
        "resultSummary": "微分与积分的双向联系合并为微积分基本定理。"
      }
    ]
  }
});
