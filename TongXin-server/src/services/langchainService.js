const axios = require('axios');
const { ChatOpenAI } = require('@langchain/openai');
const { SystemMessage, HumanMessage, AIMessage } = require('@langchain/core/messages');
const aiConfig = require('../config/aiConfig');

let chatModel = null;
let warnedEmbeddingFallback = false;

const LOCAL_EMBEDDING_DIMENSIONS = aiConfig.embedding.fallbackDimensions || 256;

const tokenizeText = (text) => {
    const normalized = String(text || '').toLowerCase();
    const tokens = normalized.match(/[a-z0-9_]+|[\u4e00-\u9fa5]/g);
    return Array.isArray(tokens) ? tokens : [];
};

const hashToken = (token) => {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
};

const buildLocalEmbedding = (text) => {
    const vector = new Array(LOCAL_EMBEDDING_DIMENSIONS).fill(0);
    const tokens = tokenizeText(text);

    for (const token of tokens) {
        const index = hashToken(token) % LOCAL_EMBEDDING_DIMENSIONS;
        vector[index] += 1;
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (norm > 0) {
        for (let i = 0; i < vector.length; i += 1) {
            vector[i] = vector[i] / norm;
        }
    }

    return vector;
};

const logEmbeddingFallback = (error) => {
    if (!warnedEmbeddingFallback) {
        warnedEmbeddingFallback = true;
        console.error(
            '智谱 Embedding 不可用，已降级为本地哈希向量。请检查 embedding 模型/账号权限。原因:',
            error?.message || error
        );
    }
};

const getChatModel = () => {
    if (!chatModel) {
        const deepseekApiKey = String(aiConfig?.auth?.deepseekApiKey || '').trim();
        if (!deepseekApiKey) {
            throw new Error('aiConfig.auth.deepseekApiKey 未配置');
        }

        chatModel = new ChatOpenAI({
            apiKey: deepseekApiKey,
            model: aiConfig.modelParams.model,
            temperature: aiConfig.modelParams.temperature,
            maxTokens: aiConfig.modelParams.max_tokens,
            configuration: {
                baseURL: aiConfig.api.baseURL
            },
            timeout: aiConfig.api.timeout
        });
    }
    return chatModel;
};

const callZhipuEmbeddings = async (inputs) => {
    const apiKey = String(aiConfig?.auth?.zhipuApiKey || '').trim();
    if (!apiKey) {
        throw new Error('aiConfig.auth.zhipuApiKey 未配置');
    }

    const baseURL = String(aiConfig.embedding.baseURL || '').replace(/\/$/, '');
    const path = aiConfig.embedding.path || '/embeddings';
    const url = `${baseURL}${path}`;

    const response = await axios.post(
        url,
        {
            model: aiConfig.embedding.model,
            input: inputs
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: aiConfig.api.timeout
        }
    );

    const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
    if (rows.length === 0) {
        throw new Error(`智谱 Embedding 返回为空: ${JSON.stringify(response.data || {})}`);
    }

    const vectors = rows
        .sort((a, b) => Number(a.index || 0) - Number(b.index || 0))
        .map((item) => item.embedding)
        .filter((vector) => Array.isArray(vector) && vector.length > 0);

    if (vectors.length !== inputs.length) {
        throw new Error(`智谱 Embedding 返回向量数量异常: expected=${inputs.length}, actual=${vectors.length}`);
    }

    return vectors;
};

const toLangChainMessage = (message) => {
    const role = String(message?.role || '').toLowerCase();
    const content = String(message?.content || '');

    if (role === 'system') return new SystemMessage(content);
    if (role === 'assistant') return new AIMessage(content);
    return new HumanMessage(content);
};

const normalizeResponseText = (responseContent) => {
    if (typeof responseContent === 'string') return responseContent;

    if (Array.isArray(responseContent)) {
        return responseContent
            .map((item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item.text === 'string') return item.text;
                return '';
            })
            .join('')
            .trim();
    }

    return String(responseContent || '').trim();
};

const chatCompletion = async (messages) => {
    const model = getChatModel();
    const langChainMessages = (messages || []).map(toLangChainMessage);
    const response = await model.invoke(langChainMessages);
    return normalizeResponseText(response.content);
};

const embedDocuments = async (texts) => {
    const docs = Array.isArray(texts) ? texts.map((item) => String(item || '')) : [];
    if (docs.length === 0) return [];

    try {
        const batchSize = Math.max(1, Number(aiConfig.embedding.batchSize || 16));
        const allVectors = [];

        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = docs.slice(i, i + batchSize);
            const vectors = await callZhipuEmbeddings(batch);
            allVectors.push(...vectors);
        }

        return allVectors;
    } catch (error) {
        logEmbeddingFallback(error);
        return docs.map((text) => buildLocalEmbedding(text));
    }
};

const embedQuery = async (text) => {
    const queryText = String(text || '');
    try {
        const vectors = await callZhipuEmbeddings([queryText]);
        return vectors[0];
    } catch (error) {
        logEmbeddingFallback(error);
        return buildLocalEmbedding(queryText);
    }
};

module.exports = {
    chatCompletion,
    embedDocuments,
    embedQuery
};
