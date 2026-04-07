<template>
  <div class="chat-container">
    <div class="chat-layout">
      <el-card class="chat-shell" shadow="never">
        <div class="chat-header">
          <div class="chat-title">
            <el-icon><ChatRound /></el-icon>
            <h2>AI对话助手</h2>
          </div>
          <el-tag size="small" type="info">{{ activeSessionSummary }}</el-tag>
        </div>

        <el-scrollbar class="chat-messages" :class="{ 'is-positioning': isPositioningMessages }" ref="messagesContainer">
          <div class="messages-inner">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message"
              :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }"
            >
              <div class="message-role-chip">
                {{ message.role === 'user' ? '我' : 'AI' }}
              </div>

              <div class="message-content">
                <div class="message-header">
                  <span class="message-name">{{ message.role === 'user' ? userName : 'AI助手' }}</span>
                  <span class="message-time">{{ message.timestamp }}</span>
                </div>

                <div
                  v-if="message.role === 'assistant'"
                  class="message-text markdown-body"
                  v-html="renderAIMessage(message.content)"
                ></div>
                <div v-else class="message-text">{{ message.content }}</div>

                <div class="message-actions" v-if="message.role === 'user'">
                  <el-button link size="small" @click="retryMessage(message)">
                    <el-icon><Refresh /></el-icon>
                    重试
                  </el-button>
                </div>
              </div>
            </div>

            <div v-if="loading && !hasStreamingMessage" class="message ai-message">
              <div class="message-role-chip">AI</div>
              <div class="message-content">
                <div class="typing-indicator">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>
              </div>
            </div>
          </div>
        </el-scrollbar>

        <div class="quick-questions">
          <el-button
            v-for="question in quickQuestions"
            :key="question"
            class="quick-question-btn"
            round
            plain
            @click="sendQuickQuestion(question)"
          >
            {{ question }}
          </el-button>
        </div>

        <div class="chat-input-area">
          <el-input
            v-model="inputMessage"
            class="chat-input"
            type="textarea"
            :rows="3"
            placeholder="输入您的问题，按Ctrl+Enter发送..."
            @keyup.ctrl.enter="sendMessage"
            resize="none"
          />
          <div class="input-toolbar">
            <span class="toolbar-tip">Ctrl + Enter 发送</span>
            <div class="input-actions">
              <el-button plain @click="startNewSession">
                <el-icon><Plus /></el-icon>
                新建对话
              </el-button>
              <el-button type="primary" class="send-btn" @click="sendMessage" :disabled="!inputMessage.trim() || loading">
                <el-icon><Position /></el-icon>
                发送
              </el-button>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="session-shell" shadow="never">
        <div class="session-header">
          <div class="session-title">
            <el-icon><List /></el-icon>
            <span>会话列表</span>
          </div>
          <el-button size="small" type="primary" plain @click="startNewSession">
            <el-icon><Plus /></el-icon>
            新建
          </el-button>
        </div>

        <el-scrollbar class="session-list" v-loading="sessionLoading">
          <div
            v-for="session in sessionList"
            :key="session.id"
            class="session-item"
            :class="{ active: session.id === currentSessionId }"
            @click="switchSession(session.id)"
          >
            <div class="session-item-title">{{ session.summary }}</div>
            <div class="session-item-meta">
              <span>{{ session.messageCount }}条消息</span>
              <div class="session-meta-right">
                <span>{{ session.updatedAt }}</span>
                <el-button
                  link
                  type="danger"
                  class="session-delete-btn"
                  @click.stop="removeSession(session.id)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>

          <el-empty v-if="!sessionLoading && sessionList.length === 0" description="暂无会话" />
        </el-scrollbar>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatRound, Refresh, Position, Plus, List } from '@element-plus/icons-vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import service from '@/utils/request'
import { localStorageUtil, STORAGE_KEYS } from '@/utils/storage'

const authStore = useAuthStore()

const userName = computed(() => authStore.user?.username || '用户')

const currentSessionId = ref(null)
const sessionList = ref([])
const sessionLoading = ref(false)

const messagesContainer = ref(null)
const messages = ref([])
const inputMessage = ref('')
const loading = ref(false)
const hasStreamingMessage = ref(false)
const isPositioningMessages = ref(false)

marked.setOptions({
  gfm: true,
  breaks: true
})

const quickQuestions = [
  '我最近感觉压力很大',
  '如何缓解焦虑情绪？',
  '推荐一些放松的方法',
  '如何改善睡眠质量？',
  '如何保持积极心态？'
]

const activeSessionSummary = computed(() => {
  const matched = sessionList.value.find((item) => item.id === currentSessionId.value)
  return matched?.summary || '新对话'
})

const getUserId = () => authStore.user?.id || 1
const getSessionStorageKey = () => `${STORAGE_KEYS.CHAT_HISTORY}_active_session_${getUserId()}`

const saveActiveSessionId = (sessionId) => {
  localStorageUtil.set(getSessionStorageKey(), sessionId)
}

const getSavedSessionId = () => {
  const raw = localStorageUtil.get(getSessionStorageKey())
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const formatAIResponse = (content) => {
  return String(content || '').replace(/\r\n/g, '\n').trim()
}

const renderAIMessage = (content) => {
  const raw = String(content || '').trim()
  if (!raw) {
    return ''
  }
  const parsed = marked.parse(raw)
  const html = typeof parsed === 'string' ? parsed : String(parsed)
  return DOMPurify.sanitize(html)
}

const toDisplayTime = (timeLike) => {
  const date = new Date(timeLike)
  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }
  return date.toLocaleTimeString()
}

const toMessageItem = (msg) => ({
  id: msg.id,
  role: msg.role === 'user' ? 'user' : 'assistant',
  content: msg.content,
  timestamp: toDisplayTime(msg.created_at)
})

const toSessionItem = (session) => ({
  id: Number(session.id),
  summary: session.summary || '新对话',
  messageCount: Number(session.message_count || 0),
  updatedAt: toDisplayTime(session.updated_at)
})

const setWelcomeMessage = () => {
  messages.value = [
    {
      id: `welcome_${Date.now()}`,
      role: 'assistant',
      content: '你好！我是仝心 TongXin。有什么我可以帮助您的吗？',
      timestamp: toDisplayTime(new Date())
    }
  ]
}

const fetchSessionList = async () => {
  sessionLoading.value = true
  try {
    const data = await service.get('/messages/sessions', {
      params: { userId: getUserId() }
    })

    // 兼容历史接口返回数组和新接口返回对象两种格式
    const rawSessions = Array.isArray(data) ? data : (data.sessions || [])
    sessionList.value = rawSessions.map(toSessionItem)
  } catch (error) {
    console.error('获取会话列表失败:', error)
    ElMessage.error('获取会话列表失败')
  } finally {
    sessionLoading.value = false
  }
}

const createNewSession = async () => {
  const data = await service.post('/messages/session', {
    userId: getUserId()
  })

  const sessionId = Number(data.sessionId)
  const newItem = {
    id: sessionId,
    summary: data.summary || '新对话',
    messageCount: 0,
    updatedAt: toDisplayTime(new Date())
  }

  sessionList.value = [newItem, ...sessionList.value.filter((item) => item.id !== sessionId)]
  return sessionId
}

const loadChatHistory = async (sessionId) => {
  isPositioningMessages.value = true

  if (!sessionId) {
    setWelcomeMessage()
    await scrollToBottom(true)
    isPositioningMessages.value = false
    return
  }

  try {
    const data = await service.get(`/messages/${sessionId}`)
    const mapped = (data || []).map(toMessageItem)
    if (mapped.length === 0) {
      setWelcomeMessage()
    } else {
      messages.value = mapped
    }
    await scrollToBottom(true)
  } catch (error) {
    console.error('加载聊天记录失败:', error)
    ElMessage.error('加载聊天记录失败')
    setWelcomeMessage()
    await scrollToBottom(true)
  } finally {
    requestAnimationFrame(() => {
      isPositioningMessages.value = false
    })
  }
}

const switchSession = async (sessionId) => {
  if (!sessionId || sessionId === currentSessionId.value) {
    return
  }

  currentSessionId.value = Number(sessionId)
  saveActiveSessionId(currentSessionId.value)
  await loadChatHistory(currentSessionId.value)
}

const removeSession = async (sessionId) => {
  try {
    await ElMessageBox.confirm('删除后该会话的消息将一并移除，确定继续吗？', '删除会话', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await service.delete(`/messages/session/${sessionId}`, {
      params: { userId: getUserId() }
    })

    const deletedActive = Number(sessionId) === currentSessionId.value
    sessionList.value = sessionList.value.filter((item) => item.id !== Number(sessionId))

    if (!deletedActive) {
      ElMessage.success('会话已删除')
      return
    }

    if (sessionList.value.length > 0) {
      const nextId = sessionList.value[0].id
      currentSessionId.value = nextId
      saveActiveSessionId(nextId)
      await loadChatHistory(nextId)
    } else {
      currentSessionId.value = null
      await startNewSession()
    }

    ElMessage.success('会话已删除')
  } catch (error) {
    if (String(error).includes('cancel')) {
      return
    }
    console.error('删除会话失败:', error)
    ElMessage.error('删除会话失败')
  }
}

const startNewSession = async () => {
  try {
    const sessionId = await createNewSession()
    currentSessionId.value = sessionId
    saveActiveSessionId(sessionId)
    setWelcomeMessage()
    ElMessage.success('已开始新的对话')
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error('创建会话失败')
  }
}

const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) {
    return
  }

  if (!currentSessionId.value) {
    try {
      const sessionId = await createNewSession()
      currentSessionId.value = sessionId
      saveActiveSessionId(sessionId)
    } catch (error) {
      ElMessage.error('创建会话失败')
      return
    }
  }

  const message = inputMessage.value.trim()
  inputMessage.value = ''

  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: message,
    timestamp: toDisplayTime(new Date())
  }
  messages.value.push(userMessage)
  scrollToBottom()

  loading.value = true

  try {
    const response = await service.post('/messages', {
      sessionId: currentSessionId.value,
      content: message
    }, {
      timeout: 45000
    })

    let aiResponse = formatAIResponse(response.reply)
    const aiMessageId = Date.now() + 1

    messages.value.push({
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: toDisplayTime(new Date())
    })

    hasStreamingMessage.value = true

    let currentIndex = 0
    const contentLength = aiResponse.length

    const typeInterval = setInterval(() => {
      if (currentIndex < contentLength) {
        const messageIndex = messages.value.findIndex((msg) => msg.id === aiMessageId)
        if (messageIndex !== -1) {
          messages.value[messageIndex].content = aiResponse.substring(0, currentIndex + 1)
          scrollToBottom()
        }
        currentIndex++
        return
      }

      clearInterval(typeInterval)
      loading.value = false
      hasStreamingMessage.value = false
    }, 30)

    const activeId = currentSessionId.value
    await fetchSessionList()
    currentSessionId.value = activeId
    saveActiveSessionId(activeId)
  } catch (error) {
    console.error('发送消息失败:', error)
    const backendMessage = error?.response?.data?.message || error?.response?.data?.error
    const timeoutMessage = String(error?.message || '').toLowerCase().includes('timeout')
      ? 'AI响应较慢，请稍后再试'
      : null
    ElMessage.error(timeoutMessage || backendMessage || '发送消息失败，请稍后重试')
    messages.value.push({
      id: Date.now() + 2,
      role: 'assistant',
      content: '抱歉，消息发送失败，请稍后重试',
      timestamp: toDisplayTime(new Date())
    })
    loading.value = false
    hasStreamingMessage.value = false
  }
}

const sendQuickQuestion = (question) => {
  inputMessage.value = question
  sendMessage()
}

const retryMessage = (message) => {
  inputMessage.value = message.content
  sendMessage()
}

const scrollToBottom = async (immediate = false) => {
  await nextTick()
  const wrapRef = messagesContainer.value?.wrapRef
  if (!wrapRef) {
    return
  }

  const targetTop = wrapRef.scrollHeight
  if (immediate) {
    wrapRef.scrollTop = targetTop
    return
  }

  messagesContainer.value.setScrollTop(targetTop)
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

onMounted(async () => {
  await fetchSessionList()

  const savedSessionId = getSavedSessionId()
  const hasSaved = savedSessionId && sessionList.value.some((item) => item.id === savedSessionId)

  if (hasSaved) {
    currentSessionId.value = savedSessionId
    await loadChatHistory(savedSessionId)
    return
  }

  if (sessionList.value.length > 0) {
    const firstSessionId = sessionList.value[0].id
    currentSessionId.value = firstSessionId
    saveActiveSessionId(firstSessionId)
    await loadChatHistory(firstSessionId)
    return
  }

  await startNewSession()
})
</script>

<style scoped lang="scss">
.chat-container {
  height: calc(100vh - 120px);
  min-height: 620px;
  margin: 0 auto;
  padding: 12px;
}

.chat-layout {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 12px;
}

.chat-shell {
  height: 100%;
  border: none;
  border-radius: 20px;
  background: linear-gradient(180deg, var(--app-plain-bg) 0%, var(--app-surface-strong) 100%);
  box-shadow: var(--app-shadow-soft);

  :deep(.el-card__body) {
    height: 100%;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
}

.session-shell {
  height: 100%;
  border: none;
  border-radius: 20px;
  background: var(--app-surface-strong);
  box-shadow: var(--app-shadow-soft);

  :deep(.el-card__body) {
    height: 100%;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
}

.chat-header,
.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid var(--app-card-header-border);
  background: var(--app-card-header-bg);
  backdrop-filter: blur(6px);
}

.chat-title,
.session-title {
  display: flex;
  align-items: center;
  gap: 10px;

  :deep(.el-icon) {
    color: var(--el-color-primary-dark-2);
    font-size: 20px;
  }

  h2,
  span {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--app-text);
  }
}

.session-list {
  flex: 1;
  padding: 8px;
}

.session-item {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--app-border);
  background: var(--app-surface-strong);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
  }

  &.active {
    border-color: var(--el-color-primary-light-3);
    background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-primary-light-8) 100%);
  }
}

.session-item-title {
  font-size: 14px;
  color: var(--app-text);
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 6px;
}

.session-item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--app-text-soft);
}

.session-meta-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.session-delete-btn {
  padding: 0;
  font-size: 12px;
}

.chat-messages {
  flex: 1;

  :deep(.el-scrollbar__wrap) {
    padding: 18px;
  }

  :deep(.el-scrollbar__bar.is-vertical) {
    width: 9px;
    right: 4px;
  }

  :deep(.el-scrollbar__thumb) {
    background: linear-gradient(180deg, var(--app-scrollbar-1) 0%, var(--app-scrollbar-2) 100%);
    border-radius: 999px;
  }

  &.is-positioning {
    :deep(.el-scrollbar__wrap) {
      visibility: hidden;
    }
  }
}

.messages-inner {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
}

.message {
  display: flex;
  gap: 12px;

  &.user-message {
    flex-direction: row-reverse;

    .message-content {
      align-items: flex-end;

      .message-header {
        justify-content: flex-end;
      }

      .message-text {
        background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-dark-2) 100%);
        color: white;
        border-radius: 14px 14px 4px 14px;
        box-shadow: 0 8px 20px rgba(var(--app-primary-shadow-rgb), 0.25);
      }
    }
  }

  &.ai-message {
    .message-text {
      background: var(--app-surface-strong);
      color: var(--app-text);
      border-radius: 14px 14px 14px 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--app-border);
    }

    .message-role-chip {
      background: var(--el-color-primary-light-8);
      color: var(--el-color-primary-dark-2);
      border-color: var(--el-color-primary-light-5);
    }
  }

  .message-role-chip {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.4px;
    border: 1px solid rgba(var(--app-primary-shadow-rgb), 0.35);
    color: #fff;
    background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-dark-2) 100%);
    box-shadow: 0 6px 14px rgba(var(--app-primary-shadow-rgb), 0.2);
  }

  .message-content {
    flex: 1;
    max-width: 74%;
    display: flex;
    flex-direction: column;

    .message-header {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;

      .message-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--app-text-soft);
        font-family: 'Helvetica Neue', 'PingFang SC', sans-serif;
      }

      .message-time {
        font-size: 12px;
        color: var(--app-text-soft);
      }
    }

    .message-text {
      padding: 14px 16px;
      border-radius: 14px;
      line-height: 1.7;
      word-break: break-word;
      white-space: pre-line;
      font-size: 14px;
      transition: transform 0.2s ease;
    }

    .markdown-body {
      white-space: normal;

      :deep(p) {
        margin: 0 0 10px;
      }

      :deep(p:last-child) {
        margin-bottom: 0;
      }

      :deep(ul),
      :deep(ol) {
        margin: 8px 0 10px 18px;
        padding: 0;
      }

      :deep(li) {
        margin: 4px 0;
      }

      :deep(code) {
        padding: 2px 6px;
        border-radius: 6px;
        background: rgba(15, 23, 42, 0.08);
        font-family: Consolas, 'Courier New', monospace;
        font-size: 12px;
      }

      :deep(pre) {
        margin: 10px 0;
        padding: 10px 12px;
        border-radius: 10px;
        overflow: auto;
        background: rgba(15, 23, 42, 0.08);
        border: 1px solid var(--app-border);
      }

      :deep(pre code) {
        padding: 0;
        background: transparent;
      }

      :deep(blockquote) {
        margin: 10px 0;
        padding: 8px 12px;
        border-left: 3px solid var(--el-color-primary-light-3);
        background: var(--el-color-primary-light-9);
        border-radius: 8px;
      }

      :deep(a) {
        color: var(--el-color-primary-dark-2);
        text-decoration: underline;
      }
    }

    .message-actions {
      margin-top: 8px;
      text-align: right;
    }
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 12px;
  background: var(--el-color-primary-light-9);
  border-radius: 12px;

  .typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--app-text-soft);
    animation: typing 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }
  }
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--app-card-header-border);

  .quick-question-btn {
    margin: 0;
    border-color: var(--el-color-primary-light-7);
    color: var(--el-color-primary-dark-2);
    background: var(--el-color-primary-light-9);

    &:hover {
      background: var(--el-color-primary-light-8);
      border-color: var(--el-color-primary-light-5);
      color: var(--el-color-primary-dark-2);
    }
  }
}

.chat-input-area {
  padding: 14px 16px 16px;
  border-top: 1px solid var(--app-card-header-border);
  background: var(--app-card-header-bg);

  .chat-input {
    :deep(.el-textarea__inner) {
      border-radius: 12px;
      border-color: var(--el-color-primary-light-7);
      padding: 12px 14px;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);

      &:focus {
        border-color: var(--el-color-primary-light-3);
        box-shadow: 0 0 0 2px rgba(var(--app-primary-shadow-rgb), 0.18);
      }
    }
  }

  .input-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;

    .toolbar-tip {
      font-size: 12px;
      color: var(--app-text-soft);
    }

    .input-actions {
      display: flex;
      gap: 8px;

      .send-btn {
        padding: 10px 18px;
      }
    }
  }
}

@media (max-width: 860px) {
  .chat-container {
    height: auto;
    min-height: auto;
  }

  .chat-layout {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(620px, 1fr) 280px;
  }
}
@media (max-width: 768px) {
  .chat-container {
    padding: 8px;
  }

  .chat-header {
    padding: 12px;
  }

  .chat-messages {
    :deep(.el-scrollbar__wrap) {
      padding: 12px;
    }
  }

  .message {
    .message-content {
      max-width: 85%;
    }
  }

  .quick-questions {
    gap: 8px;
    padding: 10px 12px;
  }
}
</style>
