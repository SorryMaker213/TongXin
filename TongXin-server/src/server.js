const app = require('./app');
const db = require('./config/db');
const env = require('./config/env');
const aiConfig = require('./config/aiConfig');
const ragService = require('./services/ragService');

const ensureAssessmentResultsTable = async () => {
    await db.query(`
    CREATE TABLE IF NOT EXISTS assessment_results (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      tool_key VARCHAR(100) NOT NULL,
      tool_title VARCHAR(255) NOT NULL,
      test_id VARCHAR(120) NOT NULL,
      total_questions INT NOT NULL,
      answers_json LONGTEXT NOT NULL,
      scores_json LONGTEXT NOT NULL,
      result_level VARCHAR(255) NULL,
      result_summary TEXT NULL,
      result_reference TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_assessment_results_user_id (user_id),
      KEY idx_assessment_results_created_at (created_at),
      CONSTRAINT fk_assessment_results_user_id
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};

const ensureEmotionRecordsTable = async () => {
    await db.query(`
    CREATE TABLE IF NOT EXISTS emotion_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      record_date DATE NOT NULL,
      emotion VARCHAR(32) NOT NULL,
      tags_json TEXT NULL,
      note TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_emotion_user_date (user_id, record_date),
      KEY idx_emotion_records_user_id (user_id),
      KEY idx_emotion_records_date (record_date),
      CONSTRAINT fk_emotion_records_user_id
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};

const ensureRagDocumentsTable = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS rag_documents (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            source_type ENUM('manual','emotion_summary') NOT NULL,
            user_id BIGINT UNSIGNED NULL,
            source_key VARCHAR(120) NOT NULL,
            chunk_index INT NOT NULL DEFAULT 0,
            content TEXT NOT NULL,
            embedding_json LONGTEXT NOT NULL,
            metadata_json LONGTEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uk_rag_source (source_type, user_id, source_key, chunk_index),
            KEY idx_rag_source_type (source_type),
            KEY idx_rag_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
};

const ensureUsersLegacyColumnsRemoved = async () => {
    const legacyColumns = ['passward', 'password', 'password_hash'];
    for (const columnName of legacyColumns) {
        const [columns] = await db.query('SHOW COLUMNS FROM users LIKE ?', [columnName]);
        if (Array.isArray(columns) && columns.length > 0) {
            await db.query(`ALTER TABLE users DROP COLUMN \`${columnName}\``);
        }
    }
};

const ensureUsersProfileColumns = async () => {
    const [ageColumns] = await db.query('SHOW COLUMNS FROM users LIKE ?', ['age']);
    if (!Array.isArray(ageColumns) || ageColumns.length === 0) {
        await db.query('ALTER TABLE users ADD COLUMN age TINYINT UNSIGNED NULL AFTER email');
    } else {
        await db.query('ALTER TABLE users MODIFY COLUMN age TINYINT UNSIGNED NULL');
    }

    const [genderColumns] = await db.query('SHOW COLUMNS FROM users LIKE ?', ['gender']);
    if (!Array.isArray(genderColumns) || genderColumns.length === 0) {
        await db.query("ALTER TABLE users ADD COLUMN gender ENUM('male','female') NULL AFTER age");
    } else {
        await db.query("ALTER TABLE users MODIFY COLUMN gender ENUM('male','female') NULL");
    }
};

const startServer = async () => {
    try {
        if (!aiConfig?.auth?.deepseekApiKey || String(aiConfig.auth.deepseekApiKey).trim() === '') {
            console.error('Fatal error: DeepSeek API key is not configured.');
            process.exit(1);
        }

        await db.query('SELECT 1');
        await ensureUsersLegacyColumnsRemoved();
        await ensureUsersProfileColumns();
        await ensureAssessmentResultsTable();
        await ensureEmotionRecordsTable();
        await ensureRagDocumentsTable();
        console.log('数据库连接及表结构检查成功');

        app.listen(env.PORT, () => {
            console.log(`服务器运行在 http://localhost:${env.PORT}`);
            console.log('AI 对话 + 上下文记忆 已开启');

            setTimeout(async () => {
                try {
                    const result = await ragService.ensureManualIndexed(true);
                    if (result?.skipped) {
                        console.log(`RAG 知识库索引已跳过：${result?.message || '无可用知识文件'}（当前向量 ${result?.count || 0} 条）`);
                    } else {
                        console.log(`RAG 知识库索引构建完成，共 ${result?.count || 0} 条向量片段，文件数 ${result?.files || 0}`);
                    }
                } catch (error) {
                    console.error('RAG 知识库索引初始化失败:', error.message);
                }
            }, 0);
        });
    } catch (error) {
        console.error('服务器启动失败:', error.message);
    }
};

startServer();
