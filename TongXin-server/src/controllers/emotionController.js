const db = require('../config/db');
const ragService = require('../services/ragService');

exports.getEmotions = async (req, res) => {
    try {
        const userId = Number(req.query.userId || 1);
        if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: '用户ID无效' });

        const [rows] = await db.query(
            `SELECT id, user_id, DATE_FORMAT(record_date, '%Y-%m-%d') AS record_date, emotion, tags_json, note, created_at, updated_at
       FROM emotion_records WHERE user_id = ? ORDER BY record_date DESC`,
            [userId]
        );

        const records = rows.map((row) => ({
            id: Number(row.id),
            date: row.record_date,
            emotion: row.emotion,
            tags: (() => {
                try { const parsed = JSON.parse(row.tags_json || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
            })(),
            note: row.note || '',
            userId: Number(row.user_id),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        return res.json({ records });
    } catch (error) {
        return res.status(500).json({ error: '获取情绪记录失败' });
    }
};

exports.saveEmotion = async (req, res) => {
    try {
        const userId = Number(req.body.userId || 1);
        const emotion = String(req.body.emotion || '').trim();
        const date = String(req.body.date || '').trim();
        const note = String(req.body.note || '');
        const tags = Array.isArray(req.body.tags) ? req.body.tags.map((item) => String(item || '').trim()).filter(Boolean) : [];

        if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: '用户ID无效' });
        if (!date || Number.isNaN(new Date(date).getTime())) return res.status(400).json({ error: '日期格式无效' });
        if (!emotion) return res.status(400).json({ error: '情绪不能为空' });

        await db.query(
            `INSERT INTO emotion_records (user_id, record_date, emotion, tags_json, note)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE emotion = VALUES(emotion), tags_json = VALUES(tags_json), note = VALUES(note), updated_at = CURRENT_TIMESTAMP`,
            [userId, date, emotion, JSON.stringify(tags), note]
        );

        const [rows] = await db.query(
            `SELECT id, user_id, DATE_FORMAT(record_date, '%Y-%m-%d') AS record_date, emotion, tags_json, note, created_at, updated_at
       FROM emotion_records WHERE user_id = ? AND record_date = ? LIMIT 1`,
            [userId, date]
        );

        const row = rows[0];

        try {
            await ragService.upsertUserEmotionSummary(userId);
        } catch (error) {
            console.error('更新用户情绪向量摘要失败:', error.message);
        }

        return res.json({
            success: true,
            record: {
                id: Number(row.id), date: row.record_date, emotion: row.emotion,
                tags: (() => { try { const parsed = JSON.parse(row.tags_json || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })(),
                note: row.note || '', userId: Number(row.user_id), createdAt: row.created_at, updatedAt: row.updated_at
            }
        });
    } catch (error) {
        return res.status(500).json({ error: '保存情绪记录失败' });
    }
};

exports.resetEmotions = async (req, res) => {
    try {
        const userId = Number(req.query.userId || req.body?.userId || 1);
        if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: '用户ID无效' });

        const [result] = await db.query('DELETE FROM emotion_records WHERE user_id = ?', [userId]);

        try {
            await ragService.upsertUserEmotionSummary(userId);
        } catch (error) {
            console.error('重置后更新向量摘要失败:', error.message);
        }

        return res.json({ success: true, deletedCount: Number(result.affectedRows || 0) });
    } catch (error) {
        return res.status(500).json({ error: '重置情绪数据失败' });
    }
};
