<template>
  <div class="quiz-page" v-loading="loading">
    <div class="quiz-header" v-if="tool">
      <div>
        <el-button link @click="goDetail">返回问卷详情</el-button>
        <h2>{{ tool.title }}</h2>
        <p>{{ tool.description || '请根据近两周真实状态作答。' }}</p>
      </div>
    </div>

    <section v-if="tool && !result" class="quiz-layout">
      <el-card class="question-card" shadow="never">
        <div class="question-number">第 {{ currentIndex + 1 }} 题 / 共 {{ tool.total }} 题</div>
        <h3 class="question-title">{{ currentQuestion.title }}</h3>

        <div class="option-list">
          <button
            v-for="option in currentQuestion.options"
            :key="option.value"
            type="button"
            class="option-btn"
            :class="{ active: answers[currentQuestion.id] === option.value }"
            @click="selectOption(option.value)"
          >
            <span class="option-label">{{ option.value }}</span>
            <span class="option-text">{{ option.label }}</span>
          </button>
        </div>

        <div class="question-actions">
          <el-button :disabled="currentIndex === 0" @click="prevQuestion">上一题</el-button>
          <el-button type="primary" plain :loading="submitting" @click="submitAssessment">立即提交</el-button>
        </div>
      </el-card>

      <el-card class="status-card" shadow="never">
        <template #header>
          <div class="status-title">作答状态</div>
        </template>

        <div class="status-grid">
          <button
            v-for="item in questionStatusList"
            :key="item.id"
            type="button"
            class="status-ball"
            :class="item.status"
            @click="jumpToQuestion(item.index)"
          >
            {{ item.index + 1 }}
          </button>
        </div>

        <div class="status-legend">
          <div class="legend-item"><span class="dot current"></span>当前题</div>
          <div class="legend-item"><span class="dot answered"></span>已作答</div>
          <div class="legend-item"><span class="dot pending"></span>未作答</div>
        </div>

        <div class="status-timer">
          <span class="status-timer-label">实时计时</span>
          <strong class="status-timer-value">{{ liveTimerText }}</strong>
        </div>
      </el-card>
    </section>

    <el-card v-if="result" class="result-card" shadow="never">
      <div class="result-header">
        <h3>评测报告</h3>
        <el-tag type="success" effect="dark">{{ result.level }}</el-tag>
      </div>

      <div class="result-grid">
        <div class="result-item">
          <div class="label">完成时间</div>
          <div class="value">{{ formatTime(result.completedAt) }}</div>
        </div>
        <div class="result-item">
          <div class="label">总题数</div>
          <div class="value">{{ result.totalQuestions }}</div>
        </div>
        <div class="result-item">
          <div class="label">用时</div>
          <div class="value">{{ durationText }}</div>
        </div>
      </div>

      <div class="radar-wrapper" v-if="dimensionMetrics.length > 1">
        <div class="radar-layout">
          <canvas ref="radarCanvasRef" class="radar-canvas" width="360" height="260"></canvas>
          <div class="radar-score-list">
            <div v-for="item in dimensionMetrics" :key="item.scoreKey" class="radar-score-item">
              <span class="radar-score-name">{{ item.name }}</span>
              <span class="radar-score-value">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="analysis-block" v-if="deepAnalysisList.length > 0">
        <h4>深度分析</h4>
        <p v-for="(item, idx) in deepAnalysisList" :key="`deep-${idx}`">{{ item }}</p>
      </div>

      <div class="analysis-block" v-if="detailedAnalysisList.length > 0">
        <h4>详细分析</h4>
        <p v-for="(item, idx) in detailedAnalysisList" :key="`detail-${idx}`">{{ item }}</p>
      </div>

      <div class="analysis-block" v-if="managementSuggestionsSummary.hasAny">
        <h4>管理建议</h4>

        <div v-if="managementSuggestionsSummary.focusDimensions.length > 0" class="suggestion-card focus">
          <h5>重点关注领域</h5>
          <div v-for="item in managementSuggestionsSummary.focusDimensions" :key="`focus-${item.key}`" class="dimension-suggestion">
            <div class="dimension-suggestion-head">
              <span class="dimension-suggestion-name">{{ item.name }}</span>
              <el-tag size="small" effect="dark" :type="item.riskTagType">{{ item.riskLabel }}</el-tag>
              <span class="dimension-suggestion-score">{{ item.value }}分</span>
            </div>
            <p v-if="item.summary">{{ item.summary }}</p>
            <ul v-if="item.tips.length > 0">
              <li v-for="(tip, tipIndex) in item.tips" :key="`focus-${item.key}-${tipIndex}`">{{ tip }}</li>
            </ul>
          </div>
        </div>

        <div v-if="managementSuggestionsSummary.improveDimensions.length > 0" class="suggestion-card improve">
          <h5>建议优化领域</h5>
          <div v-for="item in managementSuggestionsSummary.improveDimensions" :key="`improve-${item.key}`" class="dimension-suggestion">
            <div class="dimension-suggestion-head">
              <span class="dimension-suggestion-name">{{ item.name }}</span>
              <el-tag size="small" effect="dark" :type="item.riskTagType">{{ item.riskLabel }}</el-tag>
              <span class="dimension-suggestion-score">{{ item.value }}分</span>
            </div>
            <p v-if="item.summary">{{ item.summary }}</p>
            <ul v-if="item.tips.length > 0">
              <li v-for="(tip, tipIndex) in item.tips" :key="`improve-${item.key}-${tipIndex}`">{{ tip }}</li>
            </ul>
          </div>
        </div>

        <div v-if="managementSuggestionsSummary.strengthDimensions.length > 0" class="suggestion-card strength">
          <h5>优势维度</h5>
          <div v-for="item in managementSuggestionsSummary.strengthDimensions" :key="`strength-${item.key}`" class="dimension-suggestion">
            <div class="dimension-suggestion-head">
              <span class="dimension-suggestion-name">{{ item.name }}</span>
              <el-tag size="small" effect="dark" :type="item.riskTagType">{{ item.riskLabel }}</el-tag>
              <span class="dimension-suggestion-score">{{ item.value }}分</span>
            </div>
            <p v-if="item.summary">{{ item.summary }}</p>
            <ul v-if="item.tips.length > 0">
              <li v-for="(tip, tipIndex) in item.tips" :key="`strength-${item.key}-${tipIndex}`">{{ tip }}</li>
            </ul>
          </div>
        </div>

        <div v-if="managementSuggestionsSummary.generalItems.length > 0" class="suggestion-card general">
          <h5>通用建议</h5>
          <ul>
            <li v-for="(item, idx) in managementSuggestionsSummary.generalItems" :key="`general-${idx}`">{{ item }}</li>
          </ul>
        </div>
      </div>

      <div class="result-actions">
        <el-button @click="restart">再测一次</el-button>
        <el-button type="primary" @click="goCenter">返回测评中心</el-button>
      </div>
    </el-card>

    <el-empty v-if="!loading && !tool" description="量表不存在或加载失败" />
  </div>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import service from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const tool = ref(null)
const content = ref(null)
const answers = ref({})
const currentIndex = ref(0)
const result = ref(null)
const autoJumpTimer = ref(null)
const radarCanvasRef = ref(null)
const elapsedSeconds = ref(0)
const finalDurationSeconds = ref(null)
const timerId = ref(null)

const userId = computed(() => authStore.user?.id || 1)
const toolKey = computed(() => String(route.params.toolKey || '').trim())
const historyId = computed(() => {
  const raw = Number(route.query.historyId)
  return Number.isInteger(raw) && raw > 0 ? raw : null
})

const currentQuestion = computed(() => {
  if (!tool.value || !Array.isArray(tool.value.questions) || tool.value.questions.length === 0) {
    return { id: 0, title: '', options: [] }
  }
  return tool.value.questions[currentIndex.value]
})

const questionStatusList = computed(() => {
  if (!tool.value) return []
  return tool.value.questions.map((question, index) => {
    const answer = answers.value[question.id]
    const answered = answer !== undefined && answer !== null && answer !== ''
    const status = index === currentIndex.value ? 'current' : (answered ? 'answered' : 'pending')
    return {
      id: question.id,
      index,
      status
    }
  })
})

const sanitizedReference = computed(() => {
  if (!result.value) return ''
  return String(result.value.reference || '')
    .replace('参考 Pixues 量表规则生成；', '')
    .replace('参考 Pixues 量表规则生成;', '')
    .trim() || '已生成评估摘要。'
})

const durationText = computed(() => {
  const durationSeconds = finalDurationSeconds.value ?? result.value?.durationSeconds ?? null
  if (durationSeconds === null || durationSeconds === undefined) {
    return historyId.value ? '--' : formatDuration(elapsedSeconds.value)
  }
  return formatDuration(durationSeconds)
})

const liveTimerText = computed(() => {
  const totalSeconds = Math.max(0, Number(elapsedSeconds.value) || 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const dimensionMetrics = computed(() => {
  if (!result.value || !result.value.scores) {
    return []
  }

  if (Array.isArray(result.value.dimensionScores) && result.value.dimensionScores.length > 0) {
    return result.value.dimensionScores
      .filter((item) => item.scoreKey !== 'totalScore')
      .map((item) => ({
        key: item.key,
        name: item.name,
        scoreKey: item.scoreKey,
        value: Number(item.value || 0)
      }))
  }

  const dimensionNames = tool.value?.dimensionNames || {}
  return Object.entries(result.value.scores)
    .filter(([key]) => key.endsWith('Score') && key !== 'totalScore')
    .map(([scoreKey, value]) => {
      const key = scoreKey.replace(/Score$/, '')
      return {
        key,
        name: dimensionNames[key] || key,
        scoreKey,
        value: Number(value || 0)
      }
    })
})

const normalizedDimensionMetrics = computed(() => {
  const metrics = dimensionMetrics.value
  if (metrics.length === 0) {
    return []
  }

  const maxRaw = Math.max(...metrics.map((item) => Number(item.value || 0)), 1)
  const shouldScaleByRawMax = maxRaw <= 40

  return metrics.map((item) => {
    const rawValue = Number(item.value || 0)
    const normalizedValue = shouldScaleByRawMax
      ? Math.round((rawValue / maxRaw) * 100)
      : Math.min(100, Math.max(0, rawValue))

    return {
      ...item,
      normalizedValue
    }
  })
})

const resolveLevelByScore = (normalizedValue) => {
  if (normalizedValue >= 70) return 'high'
  if (normalizedValue >= 50) return 'medium'
  return 'low'
}

const getRiskLabel = (level) => {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  return '低风险'
}

const getRiskTagType = (level) => {
  if (level === 'high') return 'danger'
  if (level === 'medium') return 'warning'
  return 'success'
}

const buildFallbackSummary = (dimension, level) => {
  if (level === 'high') {
    return `${dimension.name}得分较高（${dimension.value}分），建议优先处理该维度相关压力源并安排可执行的减压动作。`
  }
  if (level === 'medium') {
    return `${dimension.name}处于中等水平（${dimension.value}分），建议通过作息、运动和情绪管理进行持续优化。`
  }
  return `${dimension.name}当前状态相对稳定（${dimension.value}分），建议保持现有有效做法并定期复盘。`
}

const deepAnalysisList = computed(() => {
  if (!result.value) return []
  const reportTemplate = content.value?.reportTemplate || {}
  const map = reportTemplate.dimensionAnalysisMap || {}
  const list = []

  normalizedDimensionMetrics.value.forEach((dimension) => {
    const level = resolveLevelByScore(dimension.normalizedValue)
    const profile = map[dimension.key] || {}
    const picked = profile[level] || profile.desc
    if (picked) {
      list.push(`${dimension.name}（${dimension.value}分）：${picked}`)
      return
    }

    if (level === 'high') {
      list.push(`${dimension.name}得分较高（${dimension.value}分），当前压力负荷或风险较明显，建议优先进行干预。`)
    } else if (level === 'medium') {
      list.push(`${dimension.name}得分中等（${dimension.value}分），处于可优化阶段，建议建立稳定调节策略。`)
    } else {
      list.push(`${dimension.name}得分较低（${dimension.value}分），整体状态稳定，可继续保持已有习惯。`)
    }
  })

  if (list.length < 3) {
    const fallback = (reportTemplate.deepAnalysis || []).slice(0, 3 - list.length)
    list.push(...fallback)
  }

  return list.slice(0, 6)
})

const detailedAnalysisList = computed(() => {
  const reportTemplate = content.value?.reportTemplate || {}
  const details = [...(reportTemplate.detailedAnalysis || [])]

  normalizedDimensionMetrics.value.forEach((dimension) => {
    const levelText = resolveLevelByScore(dimension.normalizedValue) === 'high'
      ? '偏高'
      : (resolveLevelByScore(dimension.normalizedValue) === 'medium' ? '中等' : '偏低')
    details.push(`${dimension.name}当前得分为 ${dimension.value}（${levelText}），建议结合近期生活与工作事件进行阶段性复盘。`)
  })

  return Array.from(new Set(details)).slice(0, 8)
})

const managementSuggestionsSummary = computed(() => {
  const reportTemplate = content.value?.reportTemplate || {}
  const adviceMap = reportTemplate.dimensionAdviceMap || {}
  const focusDimensions = []
  const improveDimensions = []
  const strengthDimensions = []

  normalizedDimensionMetrics.value
    .slice()
    .sort((a, b) => b.value - a.value)
    .forEach((dimension) => {
      const level = resolveLevelByScore(dimension.normalizedValue)
      const originalTips = Array.isArray(adviceMap[dimension.key]) ? adviceMap[dimension.key] : []
      const uniqueTips = Array.from(new Set(originalTips.map((tip) => String(tip || '').trim()).filter(Boolean)))
      const tips = level === 'high' ? uniqueTips.slice(0, 3) : (level === 'medium' ? uniqueTips.slice(0, 2) : uniqueTips.slice(0, 1))

      const item = {
        key: dimension.key,
        name: dimension.name,
        value: dimension.value,
        normalizedValue: dimension.normalizedValue,
        riskLabel: getRiskLabel(level),
        riskTagType: getRiskTagType(level),
        summary: tips.length > 0 ? '' : buildFallbackSummary(dimension, level),
        tips
      }

      if (level === 'high') {
        focusDimensions.push(item)
        return
      }

      if (level === 'medium') {
        improveDimensions.push(item)
        return
      }

      strengthDimensions.push(item)
    })

  const generalItems = Array.from(new Set(reportTemplate.managementSuggestions || [])).slice(0, 8)

  return {
    focusDimensions,
    improveDimensions,
    strengthDimensions,
    generalItems,
    hasAny: focusDimensions.length > 0 || improveDimensions.length > 0 || strengthDimensions.length > 0 || generalItems.length > 0
  }
})

const normalizePercent = (value, maxValue) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return 0
  const percent = (num / maxValue) * 100
  if (percent <= 100) return Math.round(percent)
  return 100
}

const formatDuration = (secondsLike) => {
  const totalSeconds = Math.max(1, Number(secondsLike) || 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}分${String(seconds).padStart(2, '0')}秒`
  }
  return `${totalSeconds}秒`
}

const stopTimer = () => {
  if (timerId.value) {
    clearInterval(timerId.value)
    timerId.value = null
  }
}

const startTimer = () => {
  stopTimer()
  elapsedSeconds.value = 0
  finalDurationSeconds.value = null
  if (historyId.value) {
    return
  }

  timerId.value = setInterval(() => {
    if (!result.value && !loading.value) {
      elapsedSeconds.value += 1
    }
  }, 1000)
}

const formatTime = (timeLike) => {
  const date = new Date(timeLike)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

const goDetail = () => {
  router.push(`/app/assessment/${toolKey.value}`)
}

const goCenter = () => {
  router.push('/app/assessment')
}

const buildResultFromHistoryRecord = (record, loadedTool) => {
  const scores = record?.scores || {}
  const scoreKeys = Object.keys(scores).filter((key) => key.endsWith('Score'))
  const coreScoreKey = scoreKeys.includes('totalScore') ? 'totalScore' : (scoreKeys[0] || null)
  const coreScoreValue = coreScoreKey ? Number(scores[coreScoreKey]) : null

  const dimensionNames = loadedTool?.dimensionNames || {}
  const dimensionScores = scoreKeys
    .filter((key) => key !== 'totalScore')
    .map((scoreKey) => {
      const key = scoreKey.replace(/Score$/, '')
      return {
        key,
        name: dimensionNames[key] || key,
        scoreKey,
        value: Number(scores[scoreKey] || 0)
      }
    })

  return {
    toolKey: record.tool_key,
    toolTitle: record.tool_title,
    totalQuestions: record.total_questions,
    scores,
    dimensionScores,
    coreScoreKey,
    coreScoreValue,
    level: record.result_level || '已完成评估',
    summary: record.result_summary || '已完成评估，建议结合近期状态持续观察。',
    reference: record.result_reference || '已生成评估摘要。',
    durationSeconds: record.duration_seconds ? Number(record.duration_seconds) : null,
    completedAt: record.created_at,
    sourceUrl: `${window.location.origin}/app/assessment/${record.tool_key}`
  }
}

const loadTool = async () => {
  if (!toolKey.value) {
    tool.value = null
    content.value = null
    return
  }

  loading.value = true
  try {
    const [toolData, contentData] = await Promise.all([
      service.get(`/assessments/tests/${toolKey.value}`),
      service.get(`/assessments/content/${toolKey.value}`)
    ])

    tool.value = toolData.tool
    content.value = contentData.content
    answers.value = {}
    currentIndex.value = 0
    result.value = null
    startTimer()

    if (historyId.value) {
      stopTimer()
      const historyData = await service.get(`/assessments/history/${historyId.value}`, {
        params: { userId: userId.value }
      })
      result.value = buildResultFromHistoryRecord(historyData.record, tool.value)
      finalDurationSeconds.value = result.value.durationSeconds ?? null
      await nextTick()
      drawRadarChart()
    }
  } catch (error) {
    console.error('获取量表详情失败:', error)
    ElMessage.error('获取量表详情失败')
    stopTimer()
    tool.value = null
    content.value = null
  } finally {
    loading.value = false
  }
}

const jumpToQuestion = (index) => {
  if (!tool.value) return
  if (index < 0 || index >= tool.value.total) return
  currentIndex.value = index
}

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1
  }
}

const selectOption = (value) => {
  if (!tool.value || submitting.value || !currentQuestion.value.id) {
    return
  }

  answers.value[currentQuestion.value.id] = value

  if (autoJumpTimer.value) {
    clearTimeout(autoJumpTimer.value)
  }

  autoJumpTimer.value = setTimeout(async () => {
    if (!tool.value) return
    if (currentIndex.value < tool.value.total - 1) {
      currentIndex.value += 1
      return
    }
    await submitAssessment()
  }, 220)
}

const submitAssessment = async () => {
  if (!tool.value || submitting.value) return

  const unansweredIndex = tool.value.questions.findIndex((question) => {
    const answer = answers.value[question.id]
    return answer === undefined || answer === null || answer === ''
  })

  if (unansweredIndex !== -1) {
    currentIndex.value = unansweredIndex
    ElMessage.warning('请先完成全部题目')
    return
  }

  submitting.value = true
  const capturedDurationSeconds = Math.max(1, elapsedSeconds.value)
  const payloadAnswers = { ...answers.value }
  try {
    const data = await service.post('/assessments/submit', {
      userId: userId.value,
      toolKey: tool.value.toolKey,
      answers: payloadAnswers
    })

    finalDurationSeconds.value = capturedDurationSeconds
    stopTimer()
    result.value = {
      ...data.result,
      durationSeconds: capturedDurationSeconds
    }
    ElMessage.success('测评完成，报告已生成并写入历史记录')
    await nextTick()
    drawRadarChart()
  } catch (error) {
    console.error('提交测评失败:', error)
    ElMessage.error(error?.response?.data?.error || '提交测评失败')
  } finally {
    submitting.value = false
  }
}

const restart = () => {
  if (historyId.value) {
    router.replace(`/app/assessment/${toolKey.value}/quiz`)
  }
  answers.value = {}
  currentIndex.value = 0
  result.value = null
  startTimer()
}

const getCssVar = (name, fallback) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const drawRadarChart = () => {
  const canvas = radarCanvasRef.value
  if (!canvas || dimensionMetrics.value.length < 2) {
    return
  }

  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.34
  const labels = dimensionMetrics.value.map((item) => item.name)
  const values = dimensionMetrics.value.map((item) => item.value)
  const maxValue = Math.max(100, ...values.map((v) => Math.ceil(v / 10) * 10))
  const stepAngle = (Math.PI * 2) / labels.length

  ctx.clearRect(0, 0, width, height)

  const ringColor = getCssVar('--el-color-primary-light-8', '#dbeafe')
  const axisColor = getCssVar('--el-color-primary-light-7', '#bfdbfe')
  const primaryColor = getCssVar('--el-color-primary', '#0ea5e9')
  const labelColor = getCssVar('--app-text', '#0f172a')

  ctx.strokeStyle = ringColor
  ctx.lineWidth = 1
  for (let ring = 1; ring <= 5; ring += 1) {
    ctx.beginPath()
    for (let i = 0; i < labels.length; i += 1) {
      const angle = i * stepAngle - Math.PI / 2
      const x = centerX + Math.cos(angle) * radius * (ring / 5)
      const y = centerY + Math.sin(angle) * radius * (ring / 5)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()
    ctx.stroke()
  }

  ctx.strokeStyle = axisColor
  for (let i = 0; i < labels.length; i += 1) {
    const angle = i * stepAngle - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
    ctx.stroke()
  }

  ctx.beginPath()
  values.forEach((value, i) => {
    const angle = i * stepAngle - Math.PI / 2
    const x = centerX + Math.cos(angle) * radius * normalizePercent(value, maxValue) / 100
    const y = centerY + Math.sin(angle) * radius * normalizePercent(value, maxValue) / 100
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.closePath()
  ctx.fillStyle = primaryColor
  ctx.globalAlpha = 0.24
  ctx.strokeStyle = primaryColor
  ctx.lineWidth = 2
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.stroke()

  ctx.fillStyle = primaryColor
  values.forEach((value, i) => {
    const angle = i * stepAngle - Math.PI / 2
    const x = centerX + Math.cos(angle) * radius * normalizePercent(value, maxValue) / 100
    const y = centerY + Math.sin(angle) * radius * normalizePercent(value, maxValue) / 100
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.fillStyle = labelColor
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  labels.forEach((label, i) => {
    const angle = i * stepAngle - Math.PI / 2
    const distance = radius + 26
    const x = centerX + Math.cos(angle) * distance
    const y = centerY + Math.sin(angle) * distance
    ctx.fillText(label, x, y)
  })
}

const handleThemeChange = async () => {
  if (!result.value) return
  await nextTick()
  drawRadarChart()
}

window.addEventListener('app-theme-change', handleThemeChange)

watch([toolKey, historyId], () => {
  loadTool()
}, { immediate: true })

watch(dimensionMetrics, async () => {
  if (!result.value) return
  await nextTick()
  drawRadarChart()
})

onUnmounted(() => {
  window.removeEventListener('app-theme-change', handleThemeChange)
  stopTimer()
  if (autoJumpTimer.value) {
    clearTimeout(autoJumpTimer.value)
    autoJumpTimer.value = null
  }
})
</script>

<style scoped lang="scss">
.quiz-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: linear-gradient(120deg, var(--el-color-primary-light-9) 0%, var(--app-bg-2) 50%, var(--app-plain-bg) 100%);
}

.quiz-header h2 {
  margin: 6px 0 0;
  color: var(--app-text);
  font-size: 24px;
}

.quiz-header p {
  margin: 8px 0 0;
  color: var(--app-text-soft);
  line-height: 1.7;
}

.quiz-meta {
  min-width: 240px;
  color: var(--app-text);
  font-weight: 600;
}

.quiz-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 12px;
}

.question-card,
.status-card,
.result-card {
  border: none;
  border-radius: 18px;
  background: var(--app-surface-strong);
  box-shadow: var(--app-shadow-soft);
}

.question-number {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary-dark-2);
  font-size: 12px;
}

.question-title {
  margin: 14px 0 22px;
  font-size: 24px;
  line-height: 1.75;
  color: var(--app-text);
  text-align: center;
}

.option-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  max-width: 760px;
  margin: 0 auto;
}

.option-btn {
  width: 136px;
  min-height: 94px;
  border: 1.5px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-strong);
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-btn:hover {
  border-color: var(--el-color-primary-light-3);
  box-shadow: 0 8px 18px rgba(var(--app-primary-shadow-rgb), 0.18);
}

.option-btn.active {
  border-color: var(--el-color-primary);
  background: linear-gradient(160deg, var(--el-color-primary-light-8) 0%, var(--el-color-primary-light-9) 100%);
  box-shadow: 0 10px 22px rgba(var(--app-primary-shadow-rgb), 0.18);
}

.option-label {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--app-border);
  color: var(--app-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.option-btn.active .option-label {
  background: var(--el-color-primary);
  color: #fff;
}

.option-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--app-text);
  text-align: center;
}

.question-actions {
  margin-top: 18px;
  display: flex;
  justify-content: space-between;
}

.status-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

.status-ball {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--app-border);
  background: var(--app-plain-bg);
  color: var(--app-text);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-ball.pending {
  background: var(--app-plain-bg);
}

.status-ball.answered {
  background: rgba(34, 197, 94, 0.16);
  border-color: #22c55e;
  color: #166534;
}

.status-ball.current {
  background: var(--el-color-primary-light-8);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary-dark-2);
  transform: scale(1.06);
}

.status-legend {
  margin-top: 14px;
}

.status-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  min-height: 360px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--app-text-soft);
  margin-bottom: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot.current {
  background: var(--el-color-primary);
}

.dot.answered {
  background: #22c55e;
}

.dot.pending {
  background: #cbd5e1;
}

.status-timer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px dashed var(--app-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.status-timer-label {
  font-size: 12px;
  color: var(--app-text-soft);
}

.status-timer-value {
  font-size: 16px;
  color: var(--app-text);
  letter-spacing: 0.5px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-header h3 {
  margin: 0;
  font-size: 23px;
  color: var(--app-text);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.result-item {
  padding: 10px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 12px;
  background: var(--el-color-primary-light-9);
}

.result-item .label {
  font-size: 12px;
  color: var(--app-text-soft);
}

.result-item .value {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.radar-wrapper {
  margin-bottom: 14px;
  display: flex;
  justify-content: center;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--el-color-primary-light-7);
  background: linear-gradient(160deg, var(--el-color-primary-light-9) 0%, var(--app-plain-bg) 100%);
}

.radar-layout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.radar-canvas {
  width: 360px;
  max-width: 100%;
  height: 260px;
}

.radar-score-list {
  width: 220px;
  max-width: 100%;
}

.radar-score-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 10px;
  background: var(--el-color-primary-light-9);
  margin-bottom: 8px;
}

.radar-score-name {
  font-size: 13px;
  color: var(--app-text);
}

.radar-score-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--el-color-primary-dark-2);
}

.analysis-block {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-strong);
}

.analysis-block h4 {
  margin: 0 0 8px;
  color: var(--app-text);
  font-size: 17px;
}

.analysis-block p,
.analysis-block li {
  margin: 6px 0;
  color: var(--app-text-soft);
  line-height: 1.8;
}

.suggestion-card {
  border-radius: 12px;
  border: 1px solid var(--app-border);
  padding: 12px;
  margin-bottom: 10px;
  background: var(--app-surface-strong);
}

.suggestion-card h5 {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--app-text);
}

.suggestion-card p,
.suggestion-card li {
  margin: 6px 0;
  color: var(--app-text-soft);
  line-height: 1.8;
}

.dimension-suggestion + .dimension-suggestion {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(148, 163, 184, 0.4);
}

.dimension-suggestion-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.dimension-suggestion-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--app-text);
}

.dimension-suggestion-score {
  margin-left: auto;
  font-size: 13px;
  font-weight: 700;
  color: var(--app-text);
}

.suggestion-card.focus {
  border-color: #fecaca;
  background: #fef2f2;
}

.suggestion-card.improve {
  border-color: #fde68a;
  background: #fffbeb;
}

.suggestion-card.strength {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.suggestion-card.general {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-color-primary-light-9);
}

.reference {
  margin: 12px 0;
  line-height: 1.7;
  color: var(--app-text-soft);
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1200px) {
  .quiz-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quiz-header {
    flex-direction: column;
  }

  .quiz-meta {
    width: 100%;
  }

  .radar-layout {
    flex-direction: column;
  }

  .radar-score-list {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .result-grid {
    grid-template-columns: 1fr;
  }

  .option-btn {
    width: calc(50% - 8px);
    min-width: 132px;
  }

  .question-actions,
  .result-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
