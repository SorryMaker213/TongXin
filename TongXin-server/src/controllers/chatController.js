const db = require('../config/db');
const aiConfig = require('../config/aiConfig');
const { buildSessionSummary } = require('../utils/helpers');
const { chatCompletion } = require('../services/langchainService');
const ragService = require('../services/ragService');

const buildFallbackReply = (content) => {
    const fallbackReplies = {
        压力: ['压力大时可以试试深呼吸，慢慢放松', '我们可以一起梳理让你有压力的事情'],
        焦虑: ['焦虑很正常，我在这里陪着你', '可以试着把担心的事情说出来，会轻松很多'],
        抑郁: ['感受到你的困扰，我在这里陪着你', '你的感受很重要，慢慢来'],
        失眠: ['睡前放松、不看手机，睡眠会好很多', '规律作息对睡眠非常重要'],
        伤心: ['难过的时候有人陪伴很重要', '我在这里倾听你'],
        default: ['我在这里倾听你，慢慢说', '谢谢你愿意分享，我会一直陪着你']
    };

    let matchedReply = fallbackReplies.default[0];
    for (const [keyword, replies] of Object.entries(fallbackReplies)) {
        if (keyword !== 'default' && String(content || '').toLowerCase().includes(keyword)) {
            matchedReply = replies[Math.floor(Math.random() * replies.length)];
            break;
        }
    }
    return matchedReply;
};

exports.createSession = async (req, res) => {
    try {
        const userId = req.body.userId || 1;
        const defaultSummary = '新对话';
        const [result] = await db.query('INSERT INTO chat_sessions (user_id, summary) VALUES (?, ?)', [userId, defaultSummary]);
        res.json({ sessionId: result.insertId, summary: defaultSummary });
    } catch (e) {
        res.status(500).json({ error: '创建会话失败' });
    }
};

exports.getSessions = async (req, res) => {
    try {
        const userId = Number(req.query.userId || 1);
        const [rows] = await db.query(
            `SELECT s.id, s.summary, s.created_at, s.updated_at,
         (SELECT content FROM chat_messages m1 WHERE m1.session_id = s.id AND m1.role = 'user' ORDER BY m1.created_at ASC LIMIT 1) AS first_user_message,
         (SELECT created_at FROM chat_messages m2 WHERE m2.session_id = s.id ORDER BY m2.created_at DESC LIMIT 1) AS last_message_at,
         (SELECT COUNT(*) FROM chat_messages m3 WHERE m3.session_id = s.id) AS message_count
       FROM chat_sessions s WHERE s.user_id = ? ORDER BY COALESCE(last_message_at, s.updated_at, s.created_at) DESC`,
            [userId]
        );

        const sessions = rows.map((row) => ({
            id: row.id,
            summary: row.summary || buildSessionSummary(row.first_user_message),
            created_at: row.created_at,
            updated_at: row.last_message_at || row.updated_at || row.created_at,
            message_count: Number(row.message_count || 0)
        }));
        res.json({ sessions });
    } catch (e) {
        res.status(500).json({ error: '获取会话列表失败' });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        const cleanedSessionId = String(req.params.sessionId || '').replace(/[^0-9]/g, '');
        const sessionId = Number(cleanedSessionId);
        const userId = Number(req.query.userId || req.body?.userId || 1);

        if (!sessionId) return res.status(400).json({ error: '会话ID无效' });

        const [result] = await db.query('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: '会话不存在或无权限删除' });

        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: '删除会话失败' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [req.params.sessionId]);
        res.json(rows);
    } catch (e) {
        res.json([]);
    }
};

exports.reindexManualRag = async (req, res) => {
    try {
        const force = String(req.query.force || req.body?.force || '').toLowerCase();
        const forceRebuild = force === '1' || force === 'true' || force === 'yes';
        const result = await ragService.ensureManualIndexed(forceRebuild);
        return res.json({ success: true, result });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message || '手册向量重建失败' });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const sessionId = Number(req.body.sessionId);
        const content = String(req.body.content || '').trim();
        if (!sessionId || !content) return res.status(400).json({ error: '缺少参数' });

        const [sessionRows] = await db.query('SELECT user_id FROM chat_sessions WHERE id = ? LIMIT 1', [sessionId]);
        if (!Array.isArray(sessionRows) || sessionRows.length === 0) {
            return res.status(404).json({ error: '会话不存在' });
        }
        const userId = Number(sessionRows[0].user_id || 1);

        await db.query("INSERT INTO chat_messages (session_id, content, role) VALUES (?, ?, 'user')", [sessionId, content]);

        const sessionSummary = buildSessionSummary(content);
        await db.query(
            `UPDATE chat_sessions SET summary = CASE WHEN summary IS NULL OR summary = '' OR summary = '新对话' THEN ? ELSE summary END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [sessionSummary, sessionId]
        );

        const [historyRows] = await db.query('SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId]);
        const historyMessages = historyRows.map((row) => ({ role: row.role, content: row.content }));
        const limitedMessages = historyMessages.slice(-aiConfig.chatSettings.historyLimit);

        let ragContextText = '';
        try {
            await ragService.ensureManualIndexed();
            await ragService.upsertUserEmotionSummary(userId);
            const ragContext = await ragService.retrieveRagContext({ userId, queryText: content });
            ragContextText = ragContext.contextText || '';
        } catch (ragError) {
            console.error('RAG 检索失败，降级为普通对话:', ragError.message);
        }

        const ragPromptPrefix = ragContextText
            ? `以下是检索到的参考信息，请优先结合这些信息给出建议；若资料不足，请明确说明并给出稳妥建议。\n\n${ragContextText}\n\n`
            : '';

        const messages = [
            { role: 'system', content: `${aiConfig.chatSettings.systemPrompt}\n\n${ragPromptPrefix}请避免脱离心理健康主题，不要编造不存在的病史。` },
            ...limitedMessages
        ];

        let aiReply;

        try {
            aiReply = await chatCompletion(messages);
            if (!aiReply) throw new Error('模型返回内容为空');
        } catch (apiErr) {
            aiReply = buildFallbackReply(content);
            console.error('DeepSeek API 调用失败:', apiErr.message);
        }

        await db.query("INSERT INTO chat_messages (session_id, content, role) VALUES (?, ?, 'assistant')", [sessionId, aiReply]);
        await db.query('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);

        res.json({ success: true, reply: aiReply, sessionSummary });
    } catch (err) {
        console.error('服务器内部错误:', err);
        res.status(500).json({ success: false, error: '服务器错误', message: err.message });
    }
};
