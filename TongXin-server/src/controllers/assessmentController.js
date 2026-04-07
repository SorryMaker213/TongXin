const db = require('../config/db');
const env = require('../config/env');
const { getPixuesQuestionsDb, buildFrontendTool, getPixuesToolContent, calculateAssessmentScores, buildAssessmentSummary, buildDimensionScores, toSafeJson } = require('../utils/pixues');

exports.getCatalog = async (req, res) => {
    try {
        const dbData = await getPixuesQuestionsDb();
        const tests = Object.entries(dbData).map(([toolKey, tool]) => ({
            toolKey, title: tool.title, description: tool.description,
            total: Number(tool.total || (tool.questions || []).length),
            perPage: Number(tool.perPage || 10), scale: tool.scale,
            sourceUrl: `${env.PIXUES_BASE_URL}/${toolKey}/index.html`
        }));
        return res.json({ source: env.PIXUES_BASE_URL, count: tests.length, tests });
    } catch (error) {
        return res.status(500).json({ error: '获取测评目录失败' });
    }
};

exports.getTestDetails = async (req, res) => {
    try {
        const { toolKey } = req.params;
        const dbData = await getPixuesQuestionsDb();
        const tool = dbData[toolKey];
        if (!tool) return res.status(404).json({ error: '量表不存在' });
        return res.json({ source: env.PIXUES_BASE_URL, tool: buildFrontendTool(toolKey, tool) });
    } catch (error) {
        return res.status(500).json({ error: '获取量表详情失败' });
    }
};

exports.getTestContent = async (req, res) => {
    try {
        const { toolKey } = req.params;
        const dbData = await getPixuesQuestionsDb();
        const tool = dbData[toolKey];
        if (!tool) return res.status(404).json({ error: '量表不存在' });
        const content = await getPixuesToolContent(toolKey, tool);
        return res.json({ toolKey, toolTitle: tool.title, content });
    } catch (error) {
        return res.status(500).json({ error: '获取量表内容失败' });
    }
};

exports.submitTest = async (req, res) => {
    try {
        const userId = Number(req.body.userId || 1);
        const toolKey = String(req.body.toolKey || '').trim();
        const answers = req.body.answers || {};

        if (!toolKey || typeof answers !== 'object') return res.status(400).json({ error: '参数不完整' });

        const dbData = await getPixuesQuestionsDb();
        const tool = dbData[toolKey];
        if (!tool) return res.status(404).json({ error: '量表不存在' });

        const questionIds = (tool.questions || []).map((q) => Number(q.id));
        const answeredCount = questionIds.filter((id) => answers[id] !== undefined && answers[id] !== null && answers[id] !== '').length;
        if (answeredCount < questionIds.length) return res.status(400).json({ error: '请先完成全部题目后提交' });

        const testId = `${toolKey}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const scores = calculateAssessmentScores(toolKey, tool, answers);
        const summary = buildAssessmentSummary(toolKey, tool, scores);
        const dimensionScores = buildDimensionScores(tool, scores);

        const [insert] = await db.query(
            `INSERT INTO assessment_results
       (user_id, tool_key, tool_title, test_id, total_questions, answers_json, scores_json, result_level, result_summary, result_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, toolKey, tool.title || toolKey, testId, questionIds.length, JSON.stringify(answers), JSON.stringify(scores), summary.level, summary.summary, summary.reference]
        );

        return res.json({
            success: true, historyId: insert.insertId,
            result: {
                toolKey, toolTitle: tool.title, testId, totalQuestions: questionIds.length,
                scores: toSafeJson(scores), dimensionScores, coreScoreKey: summary.scoreKey || null,
                coreScoreValue: summary.scoreValue ?? null, level: summary.level,
                summary: summary.summary, reference: summary.reference,
                completedAt: new Date().toISOString(), sourceUrl: `${env.PIXUES_BASE_URL}/${toolKey}/index.html`
            }
        });
    } catch (error) {
        return res.status(500).json({ error: '提交测评失败' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const userId = Number(req.query.userId || 1);
        const [rows] = await db.query(
            `SELECT id, tool_key, tool_title, test_id, total_questions, result_level, result_summary, result_reference, created_at
       FROM assessment_results WHERE user_id = ? ORDER BY created_at DESC`,
            [userId]
        );
        return res.json({ history: rows });
    } catch (error) {
        return res.status(500).json({ error: '获取测评历史失败' });
    }
};

exports.getHistoryDetails = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = Number(req.query.userId || 1);

        const [rows] = await db.query(
            `SELECT id, user_id, tool_key, tool_title, test_id, total_questions, answers_json, scores_json, result_level, result_summary, result_reference, created_at
       FROM assessment_results WHERE id = ? AND user_id = ? LIMIT 1`,
            [id, userId]
        );

        if (rows.length === 0) return res.status(404).json({ error: '测评记录不存在' });

        const row = rows[0];
        const answers = JSON.parse(row.answers_json || '{}');
        const scores = JSON.parse(row.scores_json || '{}');

        return res.json({
            record: {
                id: Number(row.id), user_id: Number(row.user_id), tool_key: row.tool_key, tool_title: row.tool_title,
                test_id: row.test_id, total_questions: Number(row.total_questions), result_level: row.result_level,
                result_summary: row.result_summary, result_reference: row.result_reference, created_at: row.created_at,
                answers, scores
            }
        });
    } catch (error) {
        return res.status(500).json({ error: '获取测评记录失败' });
    }
};

exports.deleteHistory = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = Number(req.query.userId || 1);

        if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: '参数无效' });

        const [result] = await db.query('DELETE FROM assessment_results WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
        if (!result || Number(result.affectedRows || 0) === 0) return res.status(404).json({ error: '测评记录不存在或无权限删除' });

        return res.json({ success: true, id });
    } catch (error) {
        return res.status(500).json({ error: '删除测评记录失败' });
    }
};
