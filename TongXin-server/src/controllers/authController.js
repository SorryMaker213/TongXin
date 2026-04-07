const db = require('../config/db');
const { emailRegex, buildToken, resolveUserIdFromRequest } = require('../utils/helpers');

const normalizeAge = (rawAge) => {
    if (rawAge === undefined || rawAge === null || rawAge === '') return { value: null };
    const age = Number(rawAge);
    if (!Number.isInteger(age)) return { error: '年龄必须为整数' };
    if (age < 1 || age > 120) return { error: '年龄需在 1 到 120 之间' };
    return { value: age };
};

const normalizeGender = (rawGender) => {
    if (rawGender === undefined || rawGender === null || rawGender === '') return { value: null };
    const genderText = String(rawGender).trim().toLowerCase();
    if (genderText === 'male' || genderText === '男') return { value: 'male' };
    if (genderText === 'female' || genderText === '女') return { value: 'female' };
    return { error: '性别仅支持 男 或 女' };
};

exports.register = async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();

        if (!username || !email) return res.status(400).json({ code: 400, msg: '用户名和邮箱不能为空' });
        if (!emailRegex.test(email)) return res.status(400).json({ code: 400, msg: '邮箱格式不正确' });

        const [exists] = await db.query(
            'SELECT id, username, email FROM users WHERE email = ? OR username = ? LIMIT 1',
            [email, username]
        );

        if (exists.length > 0) {
            if (exists[0].email === email) return res.status(409).json({ code: 409, msg: '该邮箱已注册，请直接登录' });
            return res.status(409).json({ code: 409, msg: '用户名已存在，请更换用户名' });
        }

        const [result] = await db.query('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
        const [rows] = await db.query('SELECT id, username, email, age, gender, created_at FROM users WHERE id = ? LIMIT 1', [result.insertId]);

        return res.json({ code: 0, msg: '注册成功', data: { user: rows[0] } });
    } catch (error) {
        console.error('注册失败:', error.message);
        return res.status(500).json({ code: 500, msg: '注册失败，请稍后重试' });
    }
};

exports.login = async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();

        if (!username || !email) return res.status(400).json({ code: 400, msg: '用户名和邮箱不能为空' });

        const [rows] = await db.query(
            'SELECT id, username, email, age, gender, created_at FROM users WHERE username = ? AND email = ? LIMIT 1',
            [username, email]
        );

        if (rows.length === 0) return res.status(401).json({ code: 401, msg: '用户名和邮箱不匹配' });

        const user = rows[0];
        const token = buildToken(user.id);

        return res.json({ code: 0, msg: '登录成功', data: { token, user } });
    } catch (error) {
        console.error('登录失败:', error.message);
        return res.status(500).json({ code: 500, msg: '登录失败，请稍后重试' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = resolveUserIdFromRequest(req);
        const username = (req.body.username || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();
        const hasAge = Object.prototype.hasOwnProperty.call(req.body, 'age');
        const hasGender = Object.prototype.hasOwnProperty.call(req.body, 'gender');
        const ageResult = normalizeAge(hasAge ? req.body.age : null);
        const genderResult = normalizeGender(hasGender ? req.body.gender : null);

        if (!Number.isInteger(userId) || userId <= 0) return res.status(401).json({ code: 401, msg: '用户未登录或身份无效' });
        if (!username || !email) return res.status(400).json({ code: 400, msg: '用户名和邮箱不能为空' });
        if (username.length < 3 || username.length > 50) return res.status(400).json({ code: 400, msg: '用户名长度需在 3 到 50 个字符之间' });
        if (!emailRegex.test(email)) return res.status(400).json({ code: 400, msg: '邮箱格式不正确' });
        if (ageResult.error) return res.status(400).json({ code: 400, msg: ageResult.error });
        if (genderResult.error) return res.status(400).json({ code: 400, msg: genderResult.error });

        const [currentRows] = await db.query('SELECT id, age, gender FROM users WHERE id = ? LIMIT 1', [userId]);
        if (currentRows.length === 0) return res.status(404).json({ code: 404, msg: '用户不存在' });

        const [usernameRows] = await db.query('SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1', [username, userId]);
        if (usernameRows.length > 0) return res.status(409).json({ code: 409, msg: '该用户名已被占用' });

        const [emailRows] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, userId]);
        if (emailRows.length > 0) return res.status(409).json({ code: 409, msg: '该邮箱已被注册' });

        const currentUser = currentRows[0];
        const nextAge = hasAge ? ageResult.value : currentUser.age;
        const nextGender = hasGender ? genderResult.value : currentUser.gender;

        await db.query(
            'UPDATE users SET username = ?, email = ?, age = ?, gender = ? WHERE id = ?',
            [username, email, nextAge, nextGender, userId]
        );

        const [updatedRows] = await db.query('SELECT id, username, email, age, gender, created_at, updated_at FROM users WHERE id = ? LIMIT 1', [userId]);

        return res.json({ code: 0, msg: '个人资料已更新', data: { user: updatedRows[0] } });
    } catch (error) {
        console.error('更新个人资料失败:', error.message);
        return res.status(500).json({ code: 500, msg: '更新失败，请稍后重试' });
    }
};

exports.entry = async (req, res) => {
    try {
        const username = (req.body.username || '').trim();
        const email = (req.body.email || '').trim().toLowerCase();

        if (!username || !email) return res.status(400).json({ code: 400, msg: '用户名和邮箱不能为空' });
        if (!emailRegex.test(email)) return res.status(400).json({ code: 400, msg: '邮箱格式不正确' });

        const [emailRows] = await db.query('SELECT id, username, email, age, gender, created_at FROM users WHERE email = ? LIMIT 1', [email]);
        if (emailRows.length > 0) {
            const emailUser = emailRows[0];
            if (emailUser.username === username) {
                return res.json({ code: 0, msg: '登录成功', data: { token: buildToken(emailUser.id), user: emailUser, action: 'login' } });
            }
            return res.status(409).json({ code: 409, msg: '该邮箱已被注册' });
        }

        const [usernameRows] = await db.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
        if (usernameRows.length > 0) return res.status(409).json({ code: 409, msg: '该用户名已被占用' });

        const [insertResult] = await db.query('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
        const [newUserRows] = await db.query('SELECT id, username, email, age, gender, created_at FROM users WHERE id = ? LIMIT 1', [insertResult.insertId]);

        const newUser = newUserRows[0];
        return res.json({
            code: 0, msg: '已自动注册并登录',
            data: { token: buildToken(newUser.id), user: newUser, action: 'register-login' }
        });
    } catch (error) {
        console.error('统一认证失败:', error.message);
        return res.status(500).json({ code: 500, msg: '认证失败，请稍后重试' });
    }
};
