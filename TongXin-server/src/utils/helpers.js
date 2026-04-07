const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildSessionSummary = (text) => {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '新对话';
    }
    return normalized.length > 28 ? `${normalized.slice(0, 28)}...` : normalized;
};

const buildToken = (userId) => {
    return `token_${userId}_${Date.now()}`;
};

const extractUserIdFromToken = (authorization) => {
    const raw = String(authorization || '');
    const match = raw.match(/^Bearer\s+token_(\d+)_\d+$/i);
    if (!match) {
        return null;
    }
    const userId = Number(match[1]);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
};

const resolveUserIdFromRequest = (req) => {
    const byToken = extractUserIdFromToken(req.headers.authorization);
    if (byToken) {
        return byToken;
    }
    const byBody = Number(req.body.userId);
    if (Number.isInteger(byBody) && byBody > 0) {
        return byBody;
    }
    return null;
};

const decodeHtmlEntities = (text) => {
    return String(text || '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x2F;/g, '/');
};

const stripHtml = (html) => {
    return decodeHtmlEntities(String(html || '').replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
};

const uniqueStrings = (items = []) => {
    return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));
};

module.exports = {
    emailRegex,
    buildSessionSummary,
    buildToken,
    extractUserIdFromToken,
    resolveUserIdFromRequest,
    decodeHtmlEntities,
    stripHtml,
    uniqueStrings
};
