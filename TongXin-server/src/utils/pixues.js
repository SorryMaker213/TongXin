const axios = require('axios');
const vm = require('vm');
const env = require('../config/env');
const { stripHtml, uniqueStrings } = require('./helpers');

let pixuesCache = { expireAt: 0, data: null };
const pixuesPageCache = new Map();

const toSafeJson = (value) => JSON.parse(JSON.stringify(value, (key, current) => {
    if (typeof current === 'function') return undefined;
    return current;
}));

const parseForcedOptions = (rawText) => {
    const raw = String(rawText || '');
    const cleanTitle = raw.split(/A\./)[0].trim().replace(/：$/, '');
    const optionParts = raw.split(/[AB]\./).slice(1).map((item) => item.trim());
    return {
        title: cleanTitle,
        options: {
            A: optionParts[0] || '选项A',
            B: optionParts[1] || '选项B'
        }
    };
};

const getLikertOptionText = (toolKey, value) => {
    const fivePoint = toolKey === 'big-five'
        ? { 1: '完全不同意', 2: '不同意', 3: '中性', 4: '同意', 5: '完全同意' }
        : { 1: '完全不符合', 2: '不太符合', 3: '有点符合', 4: '比较符合', 5: '非常符合' };
    return fivePoint[value] || `${value}分`;
};

const normalizeResultLevels = (resultLevels = {}) => {
    return Object.entries(resultLevels)
        .map(([key, value]) => ({
            key, max: Number(value.max), desc: value.desc, color: value.color
        }))
        .sort((a, b) => a.max - b.max);
};

const buildDimensionScores = (tool, scores) => {
    const dimensionNames = tool.dimensionNames || {};
    return Object.entries(scores)
        .filter(([key]) => key.endsWith('Score'))
        .map(([key, value]) => {
            const baseKey = key.replace(/Score$/, '');
            return {
                key: baseKey,
                name: dimensionNames[baseKey] || baseKey,
                scoreKey: key,
                value: Number(value)
            };
        });
};

const calculateAssessmentScores = (toolKey, tool, answers) => {
    const rules = tool.scoring || {};
    if (toolKey === 'mbti') {
        const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
        Object.entries(rules).forEach(([dim, config]) => {
            (config.questions || []).forEach((questionId) => {
                const answer = answers[questionId];
                if (answer && config[answer]) {
                    counts[config[answer]] += 1;
                }
            });
        });
        const type = (counts.E >= counts.I ? 'E' : 'I') + (counts.S >= counts.N ? 'S' : 'N') + (counts.T >= counts.F ? 'T' : 'F') + (counts.J >= counts.P ? 'J' : 'P');
        return { type, counts };
    }
    if (toolKey === 'scl90') {
        const scores = {};
        let totalScore = 0;
        Object.entries(rules).forEach(([dim, ids]) => {
            const sum = ids.reduce((acc, id) => acc + Number(answers[id] || 0), 0);
            scores[`${dim}Score`] = sum;
            totalScore += sum;
        });
        scores.totalScore = totalScore;
        return scores;
    }
    if (toolKey === 'sds') {
        const reverseItems = tool.reverseItems || [];
        const scores = {};
        Object.entries(rules).forEach(([dim, ids]) => {
            const sum = ids.reduce((acc, id) => {
                const answer = Number(answers[id] || 0);
                return acc + (reverseItems.includes(id) ? (6 - answer) : answer);
            }, 0);
            scores[`${dim}Score`] = Math.round(sum * 1.25);
        });
        return scores;
    }
    if (toolKey === 'big-five' && Array.isArray(tool.dimensions)) {
        const scores = {};
        tool.dimensions.forEach((dimension) => {
            const dimensionQuestions = (tool.questions || []).filter((q) => q.dimension === dimension.key);
            const sum = dimensionQuestions.reduce((acc, q) => {
                const answer = Number(answers[q.id] || 0);
                return acc + (q.reverse ? (6 - answer) : answer);
            }, 0);
            const maxScore = dimensionQuestions.length * 5;
            const minScore = dimensionQuestions.length;
            scores[`${dimension.key}Score`] = Math.round(((sum - minScore) / (maxScore - minScore)) * 100);
        });
        return scores;
    }

    const scores = {};
    Object.entries(rules).forEach(([dim, ids]) => {
        const sum = ids.reduce((acc, id) => acc + Number(answers[id] || 0), 0);
        if (toolKey === 'love-lang') {
            scores[`${dim}Score`] = sum;
        } else {
            const avgScore = sum / ids.length;
            scores[`${dim}Score`] = Math.round(((avgScore - 1) / 4) * 100);
        }
    });
    return scores;
};

const buildAssessmentSummary = (toolKey, tool, scores) => {
    if (toolKey === 'mbti' && scores.type && tool.types?.[scores.type]) {
        const info = tool.types[scores.type];
        return {
            level: info.name || scores.type,
            summary: info.desc || `你的类型是 ${scores.type}`,
            reference: `MBTI类型：${scores.type}`
        };
    }

    if (tool.attachmentTypes) {
        const entries = Object.entries(tool.attachmentTypes);
        let matched = entries.find(([typeKey, config]) => {
            if (typeof config.condition === 'function') {
                return config.condition(scores);
            }
            return false;
        });

        if (!matched) {
            matched = entries[entries.length - 1];
        }

        const [typeKey, info] = matched;
        return {
            level: info.name || typeKey,
            summary: info.desc || '已完成依恋类型分析',
            reference: `依恋类型：${info.name || typeKey}`
        };
    }

    if (tool.resultLevels) {
        const keys = Object.keys(scores).filter((key) => key.endsWith('Score'));
        const scoreKey = keys.includes('totalScore') ? 'totalScore' : keys[0];
        const value = Number(scores[scoreKey] || 0);

        const levels = normalizeResultLevels(tool.resultLevels);
        const matched = levels.find((item) => value <= item.max) || levels.slice(-1)[0];

        return {
            level: matched?.desc || '已完成评估',
            summary: matched?.desc || '已生成测评结果',
            reference: `核心分数 ${scoreKey}: ${value}`,
            scoreKey,
            scoreValue: value
        };
    }

    return {
        level: '已完成评估',
        summary: `${tool.title || '测评'} 已完成，建议结合近期状态持续观察。`,
        reference: '已生成评估摘要'
    };
};

const buildFrontendTool = (toolKey, tool) => {
    const base = {
        toolKey,
        title: tool.title,
        description: tool.description,
        perPage: Number(tool.perPage || 10),
        total: Number(tool.total || (tool.questions || []).length),
        scale: tool.scale,
        sourceUrl: `${env.PIXUES_BASE_URL}/${toolKey}/index.html`
    };

    const normalizedQuestions = (tool.questions || []).map((q) => {
        if (tool.scale === 'forced') {
            const parsed = parseForcedOptions(q.text);
            return {
                id: q.id,
                title: parsed.title,
                options: [
                    { value: 'A', label: parsed.options.A },
                    { value: 'B', label: parsed.options.B }
                ]
            };
        }

        return {
            id: q.id,
            title: q.text,
            options: [1, 2, 3, 4, 5].map((value) => ({
                value,
                label: getLikertOptionText(toolKey, value)
            }))
        };
    });

    return {
        ...base,
        questions: normalizedQuestions,
        dimensionNames: tool.dimensionNames || {},
        dimensions: Array.isArray(tool.dimensions) ? toSafeJson(tool.dimensions) : [],
        resultLevels: normalizeResultLevels(tool.resultLevels || {}),
        mbtiTypes: toolKey === 'mbti' ? toSafeJson(tool.types || {}) : undefined,
        attachmentTypes: tool.attachmentTypes
            ? Object.entries(tool.attachmentTypes).map(([key, info]) => ({
                key, name: info.name, desc: info.desc
            }))
            : undefined
    };
};

const getPixuesQuestionsDb = async () => {
    const now = Date.now();
    if (pixuesCache.data && pixuesCache.expireAt > now) { return pixuesCache.data; }
    const PIXUES_QUESTIONS_URL = `${env.PIXUES_BASE_URL}/data/questions.js`;
    const response = await axios.get(PIXUES_QUESTIONS_URL, { timeout: 15000 });
    const sandbox = {};
    vm.runInNewContext(`${String(response.data || '')}; this.__PIXUES_DB__ = QUESTIONS_DB;`, sandbox, { timeout: 1000 });
    const dbData = sandbox.__PIXUES_DB__ || {};
    pixuesCache = { data: dbData, expireAt: now + env.PIXUES_CACHE_TTL };
    return dbData;
};

const getPixuesPage = async (url) => {
    const now = Date.now();
    const cached = pixuesPageCache.get(url);
    if (cached && cached.expireAt > now) return cached.html;
    const response = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = String(response.data || '');
    pixuesPageCache.set(url, { html, expireAt: now + env.PIXUES_CACHE_TTL });
    return html;
};

const parseIntroSections = (indexHtml) => {
    const sections = [];
    const headingMatches = [...String(indexHtml || '').matchAll(/<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)];
    for (let i = 0; i < headingMatches.length; i += 1) {
        const current = headingMatches[i];
        const next = headingMatches[i + 1];
        const title = stripHtml(current[2]);
        if (!title || /题目|第\s*\d+\s*\//.test(title)) continue;
        const start = current.index + current[0].length;
        const end = next ? next.index : String(indexHtml || '').length;
        const block = String(indexHtml || '').slice(start, end);
        const paragraphTexts = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
            .map((item) => stripHtml(item[1])).filter((line) => line.length >= 10);
        const listTexts = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
            .map((item) => stripHtml(item[1]).replace(/^•\s*/, '')).filter((line) => line.length >= 4);
        const content = paragraphTexts[0] || '';
        const points = uniqueStrings(listTexts).slice(0, 6);
        if (!content && points.length === 0) continue;
        sections.push({ title, content, points });
        if (sections.length >= 8) break;
    }
    return sections;
};

const extractQuotedTexts = (sourceText) => {
    const quoted = [];
    const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
    let match = regex.exec(String(sourceText || ''));
    while (match) {
        const raw = match[1] || match[2] || '';
        const text = raw.replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\t/g, ' ')
            .replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\s+/g, ' ').trim();
        if (text.length >= 8 && /[\u4e00-\u9fff]/.test(text)) quoted.push(text);
        match = regex.exec(String(sourceText || ''));
    }
    return uniqueStrings(quoted);
};

const extractDimensionAdviceMap = (reportHtml, dimensionKeys = []) => {
    const map = {};
    const source = String(reportHtml || '');
    dimensionKeys.forEach((key) => {
        const adviceMatch = source.match(new RegExp(`${key}\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'm'));
        if (!adviceMatch) return;
        const tips = extractQuotedTexts(adviceMatch[1]).slice(0, 6);
        if (tips.length > 0) map[key] = tips;
    });
    return map;
};

const extractDimensionAnalysisMap = (reportHtml, dimensionKeys = []) => {
    const map = {};
    const source = String(reportHtml || '');
    dimensionKeys.forEach((key) => {
        const blockMatch = source.match(new RegExp(`${key}\\s*:\\s*\\{([\\s\\S]*?)\\}\\s*,?`, 'm'));
        if (!blockMatch) return;
        const block = blockMatch[1];
        const high = (block.match(/high\\s*:\\s*["']([^"']+)["']/) || [])[1] || '';
        const medium = (block.match(/medium\\s*:\\s*["']([^"']+)["']/) || [])[1] || '';
        const low = (block.match(/low\\s*:\\s*["']([^"']+)["']/) || [])[1] || '';
        const desc = (block.match(/description\\s*:\\s*["']([^"']+)["']/) || [])[1] || '';
        if (high || medium || low || desc) map[key] = { high, medium, low, desc };
    });
    return map;
};

const getPixuesToolContent = async (toolKey, tool) => {
    const contentCacheKey = `tool-content:${toolKey}`;
    const now = Date.now();
    const cache = pixuesPageCache.get(contentCacheKey);
    if (cache && cache.expireAt > now) return cache.content;

    const [indexHtml, reportHtml] = await Promise.all([
        getPixuesPage(`${env.PIXUES_BASE_URL}/${toolKey}/`),
        getPixuesPage(`${env.PIXUES_BASE_URL}/${toolKey}/report.html`)
    ]);

    const descriptionMatch = indexHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const introDescription = descriptionMatch ? stripHtml(descriptionMatch[1]) : (tool?.description || '');
    const introSections = parseIntroSections(indexHtml);

    const scriptTexts = [...String(reportHtml || '').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
        .map((item) => String(item[1] || ''));
    const reportQuotedTexts = uniqueStrings(scriptTexts.flatMap((script) => extractQuotedTexts(script)));

    const deepAnalysis = reportQuotedTexts.filter((text) => /分析|状态|特征|表现|倾向|压力|关系|人格|情绪/.test(text)).slice(0, 24);
    const detailedAnalysis = reportQuotedTexts.filter((text) => /影响|维度|说明|结果|风险|优势|挑战|评估|解释/.test(text)).slice(0, 24);
    const managementSuggestions = reportQuotedTexts.filter((text) => /建议|保持|学习|练习|改善|调整|管理|规律|支持|帮助/.test(text)).slice(0, 36);

    const sectionTitles = [...String(reportHtml || '').matchAll(/<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)]
        .map((item) => stripHtml(item[2])).filter((title) => title.length >= 2).slice(0, 12);

    const dimensionKeys = Object.keys(tool?.dimensionNames || {});
    const content = {
        intro: { sourceUrl: `${env.PIXUES_BASE_URL}/${toolKey}/`, description: introDescription, sections: introSections },
        reportTemplate: {
            sourceUrl: `${env.PIXUES_BASE_URL}/${toolKey}/report.html`,
            sectionTitles, deepAnalysis, detailedAnalysis, managementSuggestions,
            dimensionAnalysisMap: extractDimensionAnalysisMap(reportHtml, dimensionKeys),
            dimensionAdviceMap: extractDimensionAdviceMap(reportHtml, dimensionKeys)
        }
    };
    pixuesPageCache.set(contentCacheKey, { content, expireAt: now + env.PIXUES_CACHE_TTL });
    return content;
};

module.exports = {
    getPixuesQuestionsDb,
    buildFrontendTool,
    getPixuesToolContent,
    calculateAssessmentScores,
    buildAssessmentSummary,
    buildDimensionScores,
    toSafeJson
};
