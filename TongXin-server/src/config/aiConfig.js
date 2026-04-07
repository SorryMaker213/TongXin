module.exports = {
    // 凭证配置（为便于开箱即用，直接放在配置文件中）
    auth: {
        deepseekApiKey: 'sk-67316d8542214c9dabbe35ed1eae1841',
        zhipuApiKey: 'c43d0ec83f794ffd91ff2a8cb28b304a.Xem7XEBfTK0ZsqHn'
    },

    // API 基础配置（OpenAI 兼容）
    api: {
        baseURL: 'https://api.deepseek.com/v1',
        timeout: 30000
    },

    // 大模型调用参数配置
    modelParams: {
        model: 'deepseek-chat',
        temperature: 0.8,
        max_tokens: 3000
    },

    // 对话设定与上下文管理
    chatSettings: {
        // 携带的最近历史消息条数限制
        historyLimit: 15,
        // 背景人设（系统提示词）
        systemPrompt: '你是专业温暖的心理健康助手，只回答心理健康相关内容，共情、安全、治愈'
    },

    // Embedding 配置（用于 RAG）
    embedding: {
        provider: 'zhipu',
        baseURL: 'https://open.bigmodel.cn/api/paas/v4',
        path: '/embeddings',
        model: 'embedding-3',
        batchSize: 16,
        fallbackDimensions: 256
    },

    // RAG 配置
    rag: {
        manualChunkSize: 800,
        manualChunkOverlap: 120,
        emotionLookbackDays: 7,
        minSimilarity: 0.2,
        topK: {
            manual: 3,
            emotion: 2
        }
    }
};
