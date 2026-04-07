const getTextEnv = (name, fallback = '') => {
    const value = process.env[name];
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
};

const getNumberEnv = (name, fallback) => {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
};

module.exports = {
    PORT: getNumberEnv('PORT', 3000),
    PIXUES_BASE_URL: getTextEnv('PIXUES_BASE_URL', 'https://www.pixues.com'),
    PIXUES_CACHE_TTL: getNumberEnv('PIXUES_CACHE_TTL', 1000 * 60 * 30)
};
