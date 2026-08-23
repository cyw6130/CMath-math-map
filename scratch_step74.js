  function formatMissingEntryChecklist(missingCandidates) {
    if (!Array.isArray(missingCandidates) || !missingCandidates.length) return "";
    return missingCandidates.map((cand) => {
      const numStr = cand.num !== undefined ? ` ${cand.num}` : "";
      const nameStr = cand.name ? ` (${cand.name})` : "";
      return `- [ ] 【${cand.type}】${cand.type}${numStr}${nameStr}｜p${cand.page}｜${cand.statement}`;
    }).join("\n");
  }

  function findMissingExtractionCandidates(text, entries, { aliases = {} } = {}) {
    if (typeof text !== "string" || !text.trim()) return [];
    const entryList = Array.isArray(entries) ? entries : [];

    // 1. 拆分页面并记录页码
    const pageSegments = [];
    const pageRegex = /\[\[PAGE\s+(\d+)\]\]/gu;
    const matches = [...text.matchAll(pageRegex)];
    if (matches.length === 0) {
      return [];
    }
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const page = Number(match[1]);
      const startIndex = match.index + match[0].length;
      const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      const pageText = text.slice(startIndex, endIndex);
      pageSegments.push({ page, text: pageText });
    }

    const rawCandidates = [];

    // 2. 匹配规则：行首或段首开头的正式数学对象声明
    const declPattern = /(?:^|\n)\s*(?:[*_#>\-]*\s*)*(?:(Definition|Lemma|Proposition|Theorem|Def\.|Lem\.|Prop\.|Thm\.|定义|引理|命题|定理)\s*(\d+(?:[.\-]\d+)*)?(?:\s*[(\[（]([^)\n\]）]+)[)\]）])?|([A-Z][A-Za-z0-9\s\-]+(?:\s+Theorem|\s+Lemma|\s+Proposition|\s+Definition)))(?:[.:：\s\-—–]+([^\n]+))?/giu;

    for (const { page, text: pageText } of pageSegments) {
      if (!Number.isInteger(page) || page <= 0) continue;

      for (const match of pageText.matchAll(declPattern)) {
        const fullMatch = match[0];
        const rawKind = match[1] || "";
        const rawNum = match[2] || "";
        const rawParenName = match[3] || "";
        const namedThm = match[4] || "";
        const initialStatement = match[5] || "";

        let type = "";
        const lowerKind = rawKind.toLowerCase();
        if (lowerKind.startsWith("def") || lowerKind === "定义") type = "definition";
        else if (lowerKind.startsWith("lem") || lowerKind === "引理") type = "lemma";
        else if (lowerKind.startsWith("prop") || lowerKind === "命题") type = "proposition";
        else if (lowerKind.startsWith("thm") || lowerKind === "theorem" || lowerKind === "定理") type = "theorem";
        else if (namedThm) {
          const lowerNamed = namedThm.toLowerCase();
          if (lowerNamed.includes("definition")) type = "definition";
          else if (lowerNamed.includes("lemma")) type = "lemma";
          else if (lowerNamed.includes("proposition")) type = "proposition";
          else type = "theorem";
        }

        if (!type) continue;

        let name = "";
        if (rawParenName && rawParenName.trim()) {
          name = rawParenName.trim();
        } else if (namedThm && namedThm.trim()) {
          name = namedThm.trim();
        } else if (rawNum) {
          name = `${rawKind || type} ${rawNum}`.trim();
        } else {
          name = rawKind || type;
        }

        let num = undefined;
        if (rawNum) {
          const parsedInt = Number.parseInt(rawNum, 10);
          num = Number.isInteger(parsedInt) && !rawNum.includes(".") ? parsedInt : rawNum;
        }

        // 获取紧接着的陈述文本
        let statement = (initialStatement || "").trim();
        if (statement.length < 10) {
          const matchEnd = match.index + match[0].length;
          const rest = pageText.slice(matchEnd, matchEnd + 300);
          const lines = rest.split("\n").map((l) => l.trim()).filter(Boolean);
          if (lines.length) {
            statement = (statement ? `${statement} ` : "") + lines[0];
          }
        }
        statement = statement.replace(/\s+/gu, " ").slice(0, 200).trim();

        // 过滤无效声明
        if (!statement || statement.length < 5) continue;
        if (/^(?:is defined in|proving|references?|section|chapter)\b/iu.test(statement)) continue;

        // 排除自然语言概念词（如仅提及 "handle-1", "concept"）
        if (!rawNum && !rawParenName && !namedThm) {
          continue;
        }

        const evidence = `[[PAGE ${page}]] ${fullMatch.trim().split("\n")[0]}`;

        rawCandidates.push({
          type,
          num,
          name,
          statement,
          page,
          evidence,
        });
      }
    }

    // 3. 与已有 entryList 去重比对
    const missing = [];

    const normalizeStr = (str) => {
      if (typeof str !== "string") return "";
      return str
        .replace(/^paper:(?:thm|claim|lemma|prop|def|fact|b0):/iu, "")
        .replace(/^(?:theorem|lemma|proposition|definition|claim|fact|b0|定理|引理|命题|定义)\s*[:：·\-_]?\s*/iu, "")
        .toLowerCase()
        .replace(/[-_:：·\s()（）$\\]+/gu, " ")
        .trim();
    };

    for (const cand of rawCandidates) {
      const candNameNorm = normalizeStr(cand.name);
      const candStatementNorm = normalizeStr(cand.statement);

      let exists = false;
      for (const entry of entryList) {
        if (!entry || typeof entry !== "object") continue;
        const entryType = entry.type ?? entry.claimKind ?? entry.factKind ?? entry.kind ?? "";
        const entryNameNorm = normalizeStr(entry.name ?? entry.title ?? entry.shortTitle ?? "");
        const entryStmtNorm = normalizeStr(entry.statement ?? "");
        const entryIdNorm = normalizeStr(entry.id ?? "");

        // (a) 相同 ID 或通过 aliases 映射
        if (entry.id && (entry.id.includes(candNameNorm) || (cand.num !== undefined && entry.id.endsWith(`:${cand.num}`)))) {
          if (entryType === cand.type || !entryType) {
            exists = true;
            break;
          }
        }

        // (b) 相同类型 + 相同数字编号
        if (cand.num !== undefined && entry.num !== undefined) {
          if (String(cand.num) === String(entry.num) && (entryType === cand.type || !entryType)) {
            exists = true;
            break;
          }
        }

        // (c) 相同页码 + 相同类型 + (名称匹配或编号匹配)
        if (entry.page === cand.page && entryType === cand.type) {
          if (candNameNorm && entryNameNorm && (candNameNorm === entryNameNorm || candNameNorm.includes(entryNameNorm) || entryNameNorm.includes(candNameNorm))) {
            exists = true;
            break;
          }
          if (cand.num !== undefined && (entry.num === cand.num || entryIdNorm.includes(String(cand.num)))) {
            exists = true;
            break;
          }
        }

        // (d) 名称高度一致（长度 >= 3）且类型兼容
        if (candNameNorm && entryNameNorm && candNameNorm.length >= 3 && entryNameNorm.length >= 3) {
          if (candNameNorm === entryNameNorm || candNameNorm.includes(entryNameNorm) || entryNameNorm.includes(candNameNorm)) {
            if (entryType === cand.type || !entryType) {
              exists = true;
              break;
            }
          }
        }

        // (e) Statement 相似度（前 30 个字符高度重合）
        if (candStatementNorm && entryStmtNorm && candStatementNorm.length >= 20 && entryStmtNorm.length >= 20) {
          const candPrefix = candStatementNorm.slice(0, 30);
          const entryPrefix = entryStmtNorm.slice(0, 30);
          if (candPrefix === entryPrefix || candStatementNorm.includes(entryPrefix) || entryStmtNorm.includes(candPrefix)) {
            exists = true;
            break;
          }
        }
      }

      if (!exists) {
        const alreadyInMissing = missing.some((m) =>
          m.type === cand.type &&
          ((cand.num !== undefined && m.num === cand.num) || (m.page === cand.page && normalizeStr(m.name) === candNameNorm))
        );
        if (!alreadyInMissing) {
          const typePrefix = cand.type === "definition" ? "def" : (cand.type === "lemma" ? "lemma" : (cand.type === "proposition" ? "prop" : "thm"));
          const idSlug = cand.name.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || (cand.num ? `item-${cand.num}` : "item");
          const id = `paper:${typePrefix}:${idSlug}`;
          missing.push({
            id,
            type: cand.type,
            num: cand.num,
            name: cand.name,
            statement: cand.statement,
            page: cand.page,
            evidence: cand.evidence,
          });
        }
      }
    }

    return missing;
  }

  function buildCanonicalEntryIndex(entries, aliases = {}) {