const fs = require('fs');
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const db = require('../config/db');
const aiConfig = require('../config/aiConfig');
const { embedDocuments, embedQuery } = require('./langchainService');

let manualIndexingPromise = null;
const SUPPORTED_KB_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);

const parseJsonArray = (value) => {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const cosineSimilarity = (vectorA = [], vectorB = []) => {
    if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) return -1;
    if (vectorA.length === 0 || vectorB.length === 0 || vectorA.length !== vectorB.length) return -1;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i += 1) {
        const a = Number(vectorA[i] || 0);
        const b = Number(vectorB[i] || 0);
        dot += a * b;
        normA += a * a;
        normB += b * b;
    }

    if (normA === 0 || normB === 0) return -1;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const resolveKnowledgeBaseRoot = () => {
    const candidatePaths = [
        path.resolve(__dirname, '..', '..', '..', 'Kb'),
        path.resolve(__dirname, '..', '..', 'Kb')
    ];

    for (const candidate of candidatePaths) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
    }

    return null;
};

const listKnowledgeFiles = (baseDir) => {
    const files = [];

    const walk = (currentDir) => {
        const items = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(currentDir, item.name);
            if (item.isDirectory()) {
                walk(fullPath);
                continue;
            }

            const ext = path.extname(item.name || '').toLowerCase();
            if (!SUPPORTED_KB_EXTENSIONS.has(ext)) continue;
            files.push(fullPath);
        }
    };

    walk(baseDir);
    return files.sort((a, b) => a.localeCompare(b));
};

const splitManualText = async (rawText) => {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: aiConfig.rag.manualChunkSize,
        chunkOverlap: aiConfig.rag.manualChunkOverlap,
        separators: ['\n## ', '\n### ', '\n\n', '\n', '。', '，', ' ']
    });

    const docs = await splitter.createDocuments([rawText]);
    return docs
        .map((doc) => String(doc.pageContent || '').trim())
        .filter(Boolean);
};

const ensureManualIndexed = async (force = false) => {
    if (manualIndexingPromise && !force) {
        return manualIndexingPromise;
    }

    manualIndexingPromise = (async () => {
        const [existingRows] = await db.query(
            'SELECT COUNT(*) AS count FROM rag_documents WHERE source_type = ?',
            ['manual']
        );
        const existingCount = Number(existingRows?.[0]?.count || 0);

        const buildSkipResult = (reason, message) => ({
            skipped: true,
            reason,
            message,
            count: existingCount,
            files: 0
        });

        const kbRoot = resolveKnowledgeBaseRoot();
        if (!kbRoot) {
            return buildSkipResult('kb_not_found', '未找到 Kb 目录，跳过知识库索引');
        }

        const knowledgeFiles = listKnowledgeFiles(kbRoot);
        if (knowledgeFiles.length === 0) {
            return buildSkipResult('kb_empty', 'Kb 目录中没有可用知识文件（支持 .md/.markdown/.txt），跳过知识库索引');
        }

        if (!force && existingCount > 0) {
            return buildSkipResult('already_indexed', '已有知识库向量，跳过重复构建');
        }

        const preparedFiles = [];

        for (const filePath of knowledgeFiles) {
            const rawText = fs.readFileSync(filePath, 'utf8');
            const chunks = await splitManualText(rawText);
            if (chunks.length === 0) continue;
            preparedFiles.push({ filePath, chunks });
        }

        if (preparedFiles.length === 0) {
            return buildSkipResult('kb_content_empty', 'Kb 知识文件内容为空，跳过知识库索引');
        }

        await db.query('DELETE FROM rag_documents WHERE source_type = ?', ['manual']);

        let totalChunks = 0;
        let indexedFiles = 0;

        for (const { filePath, chunks } of preparedFiles) {
            const vectors = await embedDocuments(chunks);
            const sourceKey = path.relative(kbRoot, filePath).replace(/\\/g, '/');

            for (let i = 0; i < chunks.length; i += 1) {
                const chunk = chunks[i];
                const embedding = vectors[i] || [];
                await db.query(
                    `INSERT INTO rag_documents (source_type, user_id, source_key, chunk_index, content, embedding_json, metadata_json)
                     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
                    [
                        'manual',
                        sourceKey,
                        i,
                        chunk,
                        JSON.stringify(embedding),
                        JSON.stringify({ path: filePath, chunkIndex: i })
                    ]
                );
            }

            totalChunks += chunks.length;
            indexedFiles += 1;
        }

        return { skipped: false, count: totalChunks, files: indexedFiles };
    })();

    try {
        return await manualIndexingPromise;
    } catch (error) {
        manualIndexingPromise = null;
        throw error;
    } finally {
        if (force) {
            manualIndexingPromise = null;
        }
    }
};

const buildEmotionSummary = (rows, days) => {
    if (!Array.isArray(rows) || rows.length === 0) return '';

    const emotionCount = {};
    const tagCount = {};

    for (const row of rows) {
        const emotion = String(row.emotion || '').trim();
        if (emotion) emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;

        const tags = parseJsonArray(row.tags_json);
        for (const tag of tags) {
            const key = String(tag || '').trim();
            if (!key) continue;
            tagCount[key] = (tagCount[key] || 0) + 1;
        }
    }

    const topEmotions = Object.entries(emotionCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([emotion, count]) => `${emotion}(${count}次)`)
        .join('、') || '暂无明显主导情绪';

    const topTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => `${tag}(${count})`)
        .join('、') || '无';

    const recentNotes = rows
        .filter((row) => String(row.note || '').trim())
        .slice(0, 5)
        .map((row) => `${row.record_date}: ${String(row.note || '').trim()}`)
        .join('\n');

    return [
        `用户最近${days}天共记录${rows.length}条情绪日记。`,
        `高频情绪：${topEmotions}。`,
        `高频标签：${topTags}。`,
        recentNotes ? `近期关键日记内容：\n${recentNotes}` : '近期无文字日记补充。'
    ].join('\n');
};

const upsertUserEmotionSummary = async (userId, lookbackDays = aiConfig.rag.emotionLookbackDays) => {
    const normalizedUserId = Number(userId);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) return null;

    const [rows] = await db.query(
        `SELECT DATE_FORMAT(record_date, '%Y-%m-%d') AS record_date, emotion, tags_json, note
         FROM emotion_records
         WHERE user_id = ?
           AND record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         ORDER BY record_date DESC`,
        [normalizedUserId, lookbackDays]
    );

    const summaryText = buildEmotionSummary(rows, lookbackDays);

    if (!summaryText) {
        await db.query(
            'DELETE FROM rag_documents WHERE source_type = ? AND user_id = ? AND source_key = ?',
            ['emotion_summary', normalizedUserId, `recent_${lookbackDays}d`]
        );
        return null;
    }

    const embedding = await embedQuery(summaryText);
    const sourceKey = `recent_${lookbackDays}d`;

    await db.query(
        `INSERT INTO rag_documents (source_type, user_id, source_key, chunk_index, content, embedding_json, metadata_json)
         VALUES (?, ?, ?, 0, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           content = VALUES(content),
           embedding_json = VALUES(embedding_json),
           metadata_json = VALUES(metadata_json),
           updated_at = CURRENT_TIMESTAMP`,
        [
            'emotion_summary',
            normalizedUserId,
            sourceKey,
            summaryText,
            JSON.stringify(embedding),
            JSON.stringify({ lookbackDays })
        ]
    );

    return summaryText;
};

const scoreRowsByQuery = (rows, queryVector) => {
    return (rows || [])
        .map((row) => {
            const embedding = parseJsonArray(row.embedding_json);
            const score = cosineSimilarity(queryVector, embedding);
            return { ...row, score };
        })
        .filter((row) => Number.isFinite(row.score) && row.score > aiConfig.rag.minSimilarity)
        .sort((a, b) => b.score - a.score);
};

const normalizeGenderLabel = (gender) => {
    const value = String(gender || '').trim().toLowerCase();
    if (value === 'male') return '男';
    if (value === 'female') return '女';
    return '未填写';
};

const retrieveRagContext = async ({ userId, queryText }) => {
    const text = String(queryText || '').trim();
    const normalizedUserId = Number(userId);
    if (!text) return { contextText: '', manualHits: [], emotionHits: [] };

    const queryVector = await embedQuery(text);

    const [manualRows] = await db.query(
        `SELECT id, content, embedding_json
         FROM rag_documents
         WHERE source_type = ?`,
        ['manual']
    );

    const manualHits = scoreRowsByQuery(manualRows, queryVector).slice(0, aiConfig.rag.topK.manual);

    let emotionHits = [];
    let userProfileText = '';
    if (Number.isInteger(normalizedUserId) && normalizedUserId > 0) {
        const [emotionRows] = await db.query(
            `SELECT id, content, embedding_json
             FROM rag_documents
             WHERE source_type = ? AND user_id = ?`,
            ['emotion_summary', normalizedUserId]
        );
        emotionHits = scoreRowsByQuery(emotionRows, queryVector).slice(0, aiConfig.rag.topK.emotion);

        const [userRows] = await db.query(
            'SELECT age, gender FROM users WHERE id = ? LIMIT 1',
            [normalizedUserId]
        );
        if (Array.isArray(userRows) && userRows.length > 0) {
            const profile = userRows[0];
            const ageText = Number.isInteger(Number(profile.age)) ? `${Number(profile.age)}岁` : '未填写';
            const genderText = normalizeGenderLabel(profile.gender);
            userProfileText = `年龄：${ageText}；性别：${genderText}`;
        }
    }

    const manualContext = manualHits
        .map((row, index) => `${index + 1}. ${String(row.content || '').trim().slice(0, 600)}`)
        .join('\n');

    const emotionContext = emotionHits
        .map((row, index) => `${index + 1}. ${String(row.content || '').trim().slice(0, 800)}`)
        .join('\n');

    const sections = [];
    if (userProfileText) sections.push(`【用户概况】\n${userProfileText}`);
    if (emotionContext) sections.push(`【用户近期心理活动线索】\n${emotionContext}`);
    if (manualContext) sections.push(`【心理治疗操作手册参考】\n${manualContext}`);

    return {
        contextText: sections.join('\n\n'),
        manualHits,
        emotionHits
    };
};

module.exports = {
    ensureManualIndexed,
    upsertUserEmotionSummary,
    retrieveRagContext
};
