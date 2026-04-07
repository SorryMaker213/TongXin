<template>
  <div class="emotion-tracker">
    <section class="hero">
      <div>
        <h2>自我管理</h2>
        <p>记录情绪、追踪放松训练与对话活跃度，形成可持续的自我调节反馈闭环。</p>
      </div>
    </section>
    
    <!-- 内容区域 -->
    <div class="content">
      <section class="record-calendar-row">
        <!-- 今日情绪记录 -->
        <el-card class="emotion-card" shadow="never">
          <template #header>
            <div class="card-title-center">
              <h3>情绪日记</h3>
            </div>
          </template>

          <div class="today-emotion">
            <div class="emotion-date">{{ todayDate }}</div>
            
            <!-- 情绪选择 -->
            <div class="emotion-selector">
              <h4>今天的心情怎么样？</h4>
              <div class="emotion-options">
                <div 
                  v-for="emotion in emotions" 
                  :key="emotion.value"
                  class="emotion-option"
                  :class="{ 'selected': selectedEmotion === emotion.value }"
                  @click="selectEmotion(emotion.value)"
                >
                  <div class="emotion-icon">{{ emotion.icon }}</div>
                  <div class="emotion-label">{{ emotion.label }}</div>
                </div>
              </div>
            </div>
            
            <!-- 情绪标签 -->
            <div class="emotion-tags">
              <h4>相关标签（可多选）</h4>
              <div class="tag-options">
                <el-tag
                  v-for="tag in emotionTags"
                  :key="tag"
                  :effect="selectedTags.includes(tag) ? 'dark' : 'plain'"
                  :class="{ 'selected': selectedTags.includes(tag) }"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </el-tag>
              </div>
            </div>
            
            <!-- 日记输入 -->
            <div class="emotion-note">
              <h4>今日记录（选填）</h4>
              <el-input
                v-model="emotionNote"
                type="textarea"
                placeholder="记录今天的心情..."
                :rows="4"
              />
            </div>
            
            <!-- 操作按钮 -->
            <div class="emotion-actions">
              <el-button type="primary" :loading="saving" @click="saveEmotion">保存记录</el-button>
              <el-button @click="resetForm">重置</el-button>
            </div>
          </div>
        </el-card>
        
        <!-- 情绪日历 -->
        <el-card class="calendar-card">
          <template #header>
            <div class="calendar-header">
              <h3 class="calendar-title-main">情绪日历</h3>
              <div class="calendar-controls">
                <el-button 
                  link 
                  @click="previousMonth"
                  :disabled="isFirstMonth"
                >
                  <el-icon><ArrowLeft /></el-icon>
                </el-button>
                <span class="calendar-title">{{ currentMonth }}</span>
                <el-button 
                  link 
                  @click="nextMonth"
                  :disabled="isCurrentMonth"
                >
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
                <span class="calendar-title">{{ currentMonth }}</span>
              </div>
            </div>
          </template>
          
          <div class="calendar">
            <!-- 星期标题 -->
            <div class="calendar-weekdays">
              <div class="weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
            </div>
            
            <!-- 日期格子 -->
            <div class="calendar-days">
              <!-- 上个月的日期 -->
              <div 
                v-for="day in prevMonthDays" 
                :key="'prev-' + day"
                class="calendar-day disabled"
              >
                {{ day }}
              </div>
              
              <!-- 当前月的日期 -->
              <div 
                v-for="day in currentMonthDays" 
                :key="day"
                class="calendar-day"
                :class="{ 
                  'selected': day === selectedCalendarDay,
                  'today': day === todayDay && isCurrentMonth,
                  'has-emotion': hasEmotionRecord(day)
                }"
                @click="viewEmotionRecord(day)"
              >
                {{ day }}
                <div 
                  v-if="hasEmotionRecord(day)"
                  class="emotion-indicator"
                  :class="getEmotionClass(getEmotionForDay(day))"
                ></div>
              </div>
              
              <!-- 下个月的日期 -->
              <div 
                v-for="day in nextMonthDays" 
                :key="'next-' + day"
                class="calendar-day disabled"
              >
                {{ day }}
              </div>
            </div>
          </div>
        </el-card>
      </section>

      <el-card class="combined-stats-card">
        <template #header>
          <div class="section-header">
            <h3>综合数据概览</h3>
            <el-button type="danger" plain size="small" :loading="resetting" @click="resetEmotionData">
              重置情绪数据
            </el-button>
          </div>
        </template>

        <div class="combined-stats-grid">
          <div class="summary-item">
            <div class="summary-value">{{ emotionRecords.length }}</div>
            <div class="summary-label">情绪记录数</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ chatSessionCount }}</div>
            <div class="summary-label">对话会话数</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ relaxStats.meditationSessions }}</div>
            <div class="summary-label">冥想次数</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ meditationMinutes }}</div>
            <div class="summary-label">冥想时长(分钟)</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ relaxStats.noisePlayCount }}</div>
            <div class="summary-label">白噪音次数</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">{{ relaxStats.breathingSessions }}</div>
            <div class="summary-label">呼吸训练次数</div>
          </div>
        </div>

        <div class="trend-chart merged-chart">
          <h4>行为数据柱状图</h4>
          <div ref="activityChartRef" class="chart"></div>
        </div>

        <div class="breathing-summary">
          <h4>呼吸类型次数</h4>
          <div class="breathing-tags" v-if="breathingTypeStats.length > 0">
            <el-tag
              v-for="item in breathingTypeStats"
              :key="item.key"
              type="success"
              effect="plain"
            >
              {{ item.label }} {{ item.count }} 次
            </el-tag>
          </div>
          <el-empty v-else description="暂未开始呼吸训练" :image-size="64" />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { localStorageUtil, STORAGE_KEYS } from '@/utils/storage'
import { useAuthStore } from '@/stores/auth'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import service from '@/utils/request'

const authStore = useAuthStore()

// 定义获取当地区域准确时间的工具方法，强制使用东八区（如果需要）保证前端统一显示
const getCSTDate = () => {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  // 仅在发现时区非东八区并且出现跨天偏差时可手动调配。但更安全的是直接使用本地构造。这里直接取客户端动态时间
  return new Date()
}

// 动态响应日期
const today = ref(new Date())

const localDateString = computed(() => {
  const t = today.value
  const year = t.getFullYear()
  const month = String(t.getMonth() + 1).padStart(2, '0')
  const day = String(t.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

const todayDate = computed(() => today.value.toLocaleDateString('zh-CN', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  weekday: 'long'
}))
const todayDay = computed(() => today.value.getDate())

// 情绪选项
const emotions = [
  { value: 'happy', label: '开心', icon: '😊' },
  { value: 'neutral', label: '平静', icon: '😐' },
  { value: 'sad', label: '难过', icon: '😢' },
  { value: 'angry', label: '生气', icon: '😠' },
  { value: 'anxious', label: '焦虑', icon: '😰' },
  { value: 'excited', label: '兴奋', icon: '🤗' }
]

// 选中的情绪
const selectedEmotion = ref('')

// 情绪标签
const emotionTags = [
  '工作', '学习', '家庭', '朋友', '健康', '运动',
  '休息', '娱乐', '社交', '压力', '成就', '挑战'
]

// 选中的标签
const selectedTags = ref([])

// 日记内容
const emotionNote = ref('')

// 保存状态
const saving = ref(false)
const resetting = ref(false)

// 情绪记录数据
const emotionRecords = ref([])
const chatSessionCount = ref(0)
const relaxStats = ref({
  meditationDurationSeconds: 0,
  meditationSessions: 0,
  noisePlayCount: 0,
  breathingSessions: 0,
  breathingByType: {}
})
const activityChartRef = ref(null)
let activityChart = null

const breathingModeLabels = {
  box: '方形呼吸',
  calm: '478 助眠',
  balanced: '共振呼吸',
  release: '缓压呼吸'
}

const getCurrentUserId = () => Number(authStore.user?.id || 1)
const getRelaxStatsUserKey = () => String(getCurrentUserId())

const meditationMinutes = computed(() => {
  const seconds = Number(relaxStats.value.meditationDurationSeconds || 0)
  return Math.round((seconds / 60) * 10) / 10
})

const breathingTypeStats = computed(() => {
  const byType = relaxStats.value.breathingByType || {}

  return Object.keys(breathingModeLabels)
    .map((key) => ({
      key,
      label: breathingModeLabels[key],
      count: Number(byType[key] || 0)
    }))
    .filter((item) => item.count > 0)
})

// 加载情绪记录
const loadEmotionRecords = async () => {
  try {
    const data = await service.get('/emotions', {
      params: { userId: getCurrentUserId() }
    })
    emotionRecords.value = Array.isArray(data.records) ? data.records : []
  } catch (error) {
    emotionRecords.value = []
    ElMessage.error('获取情绪记录失败')
  }
}

const loadRelaxStats = () => {
  const allStats = localStorageUtil.get(STORAGE_KEYS.RELAX_STATS) || {}
  const userStats = allStats[getRelaxStatsUserKey()] || {}

  relaxStats.value = {
    meditationDurationSeconds: Number(userStats.meditationDurationSeconds || 0),
    meditationSessions: Number(userStats.meditationSessions || 0),
    noisePlayCount: Number(userStats.noisePlayCount || 0),
    breathingSessions: Number(userStats.breathingSessions || 0),
    breathingByType: { ...(userStats.breathingByType || {}) }
  }
}

const loadChatSessionCount = async () => {
  try {
    const data = await service.get('/messages/sessions', {
      params: { userId: getCurrentUserId() }
    })

    const sessions = Array.isArray(data) ? data : (data.sessions || [])
    chatSessionCount.value = sessions.length
  } catch (error) {
    chatSessionCount.value = 0
  }
}

// 日历相关
const currentDate = ref(new Date())
const selectedCalendarDay = ref(null)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const currentMonth = computed(() => {
  return currentDate.value.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long' 
  })
})

const isFirstMonth = computed(() => {
  return currentDate.value.getMonth() === 0 && currentDate.value.getFullYear() === 2024
})

const isCurrentMonth = computed(() => {
  return currentDate.value.getMonth() === today.value.getMonth() && 
         currentDate.value.getFullYear() === today.value.getFullYear()
})

const currentMonthDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => i + 1)
})

const prevMonthDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  return Array.from({ length: firstDay }, (_, i) => {
    const prevMonthDays = new Date(year, month, 0).getDate()
    return prevMonthDays - firstDay + i + 1
  })
})

const nextMonthDays = computed(() => {
  const totalCells = 42 // 6行 × 7列
  const filledCells = prevMonthDays.value.length + currentMonthDays.value.length
  const remainingCells = totalCells - filledCells
  return Array.from({ length: remainingCells }, (_, i) => i + 1)
})

// 图表数据
const activityMetrics = computed(() => ([
  { label: '情绪记录', value: emotionRecords.value.length },
  { label: '对话会话', value: chatSessionCount.value },
  { label: '冥想次数', value: relaxStats.value.meditationSessions },
  { label: '白噪音次数', value: relaxStats.value.noisePlayCount },
  { label: '呼吸训练次数', value: relaxStats.value.breathingSessions }
]))

const renderActivityChart = () => {
  if (!activityChartRef.value) {
    return
  }

  if (!activityChart) {
    activityChart = echarts.init(activityChartRef.value)
  }

  const rootStyles = getComputedStyle(document.documentElement)
  const chartPalette = [
    rootStyles.getPropertyValue('--el-color-primary').trim(),
    rootStyles.getPropertyValue('--el-color-primary-light-3').trim(),
    rootStyles.getPropertyValue('--el-color-primary-dark-2').trim(),
    rootStyles.getPropertyValue('--el-color-primary-light-5').trim(),
    rootStyles.getPropertyValue('--el-color-primary-light-7').trim()
  ].filter(Boolean)
  if (chartPalette.length === 0) {
    chartPalette.push('#64748b')
  }
  const labelColor = rootStyles.getPropertyValue('--app-text').trim() || '#334155'

  activityChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '6%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      axisTick: { show: false },
      data: activityMetrics.value.map((item) => item.label)
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        type: 'bar',
        barWidth: '48%',
        data: activityMetrics.value.map((item) => item.value),
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: ({ dataIndex }) => {
            return chartPalette[dataIndex % chartPalette.length]
          }
        },
        label: {
          show: true,
          position: 'top',
          color: labelColor
        }
      }
    ]
  })
}

const handleThemeChange = () => {
  renderActivityChart()
}

const refreshMergedAnalytics = async () => {
  loadRelaxStats()
  await loadEmotionRecords()
  await loadChatSessionCount()
  await nextTick()
  renderActivityChart()
}

const handleResize = () => {
  if (activityChart) {
    activityChart.resize()
  }
}

// 选择情绪
const selectEmotion = (emotion) => {
  selectedEmotion.value = emotion
}

// 切换标签
const toggleTag = (tag) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// 保存情绪记录
const saveEmotion = () => {
  if (!selectedEmotion.value) {
    ElMessage.warning('请选择您的情绪')
    return
  }localDateString
  
  saving.value = true

  service.post('/emotions', {
    userId: getCurrentUserId(),
    date: localDateString.value,
    emotion: selectedEmotion.value,
    tags: [...selectedTags.value],
    note: emotionNote.value
  }).then((data) => {
    const saved = data.record
    const existingIndex = emotionRecords.value.findIndex((item) => item.date === saved.date)

    if (existingIndex > -1) {
      emotionRecords.value[existingIndex] = saved
    } else {
      emotionRecords.value.unshift(saved)
    }

    ElMessage.success('情绪记录已保存')
    resetForm()
    renderActivityChart()
  }).catch(() => {
    ElMessage.error('保存情绪记录失败')
  }).finally(() => {
    saving.value = false
  })
}

const resetEmotionData = async () => {
  try {
    await ElMessageBox.confirm(
      '重置后将删除当前账户的全部情绪记录，且无法恢复。是否继续？',
      '重置情绪数据',
      {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  resetting.value = true

  try {
    await service.delete('/emotions/reset', {
      params: { userId: getCurrentUserId() }
    })

    emotionRecords.value = []
    localStorageUtil.remove(STORAGE_KEYS.EMOTION_RECORDS)
    resetForm()
    renderActivityChart()
    ElMessage.success('情绪数据已重置')
  } catch (error) {
    ElMessage.error('重置情绪数据失败')
  } finally {
    resetting.value = false
  }
}

// 重置表单
const resetForm = () => {
  selectedEmotion.value = ''
  selectedTags.value = []
  emotionNote.value = ''
}

// 查看情绪记录
const viewEmotionRecord = (day) => {
  selectedCalendarDay.value = day
  const date = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const record = emotionRecords.value.find(r => r.date === date)
  
  if (record) {
    ElMessage.info(`日期：${date}\n情绪：${emotions.find(e => e.value === record.emotion)?.label}\n标签：${record.tags.join(', ')}\n记录：${record.note || '无'}`)
  } else {
    ElMessage.info(`该日期暂无情绪记录`)
  }
}

// 是否有情绪记录
const hasEmotionRecord = (day) => {
  const date = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return emotionRecords.value.some(r => r.date === date)
}

// 获取某天的情绪
const getEmotionForDay = (day) => {
  const date = `${currentDate.value.getFullYear()}-${String(currentDate.value.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const record = emotionRecords.value.find(r => r.date === date)
  return record?.emotion || ''
}

// 获取情绪样式类
const getEmotionClass = (emotion) => {
  return emotion || 'empty'
}

// 上个月
const previousMonth = () => {
  selectedCalendarDay.value = null
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

// 下个月
const nextMonth = () => {
  selectedCalendarDay.value = null
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

// 组件挂载
onMounted(async () => {
  await refreshMergedAnalytics()
  window.addEventListener('resize', handleResize)
  window.addEventListener('app-theme-change', handleThemeChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('app-theme-change', handleThemeChange)
  if (activityChart) {
    activityChart.dispose()
    activityChart = null
  }
})
</script>

<style scoped lang="scss">
.emotion-tracker {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: linear-gradient(140deg, var(--el-color-primary-light-9) 0%, var(--app-bg-2) 42%, var(--app-bg-3) 100%);

  h2 {
    margin: 0;
    font-size: 24px;
    color: var(--app-text);
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-soft);
    line-height: 1.6;
  }
}

.content {
  width: 100%;
  padding: 0;
  display: grid;
  gap: 12px;

  .record-calendar-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(320px, 33vw, 420px);
    gap: 12px;
    align-items: stretch;
  }
  
  .emotion-card {
    border: none;
    border-radius: 18px;
    box-shadow: var(--app-shadow-soft);

    .card-title-center {
      width: 100%;
      text-align: center;

      h3 {
        margin: 0;
        font-size: 17px;
        color: var(--app-text);
      }
    }

    :deep(.el-card__header) {
      min-height: 48px;
      display: flex;
      align-items: center;
      padding: 10px 16px;
    }

    :deep(.el-card__body) {
      padding: 14px 16px 16px;
      height: 100%;
      box-sizing: border-box;
    }
    
    .today-emotion {
      .emotion-date {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 10px;
        text-align: center;
        color: var(--app-text);
      }
      
      h4 {
        margin: 12px 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--app-text);
      }
      
      .emotion-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px;
        margin-bottom: 16px;
        
        .emotion-option {
          padding: 12px 10px;
          min-height: 110px;
          border: 2px solid var(--app-border);
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          background: var(--app-plain-bg);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          
          &:hover {
            transform: translateY(-2px);
            border-color: var(--el-color-primary-light-3);
            background: var(--el-color-primary-light-9);
          }
          
          &.selected {
            border-color: var(--el-color-primary);
            background: linear-gradient(145deg, var(--el-color-primary-light-9), var(--el-color-primary-light-8));
            transform: translateY(-2px);
          }
          
          .emotion-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--app-surface-strong);
            border: 1px solid var(--app-border);
            font-size: 26px;
            margin-bottom: 8px;
          }
          
          .emotion-label {
            font-size: 14px;
            color: var(--app-text);
            padding: 0 6px;
          }
        }
      }
      
      .tag-options {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
        
        .el-tag {
          cursor: pointer;
          min-height: 30px;
          
          &.selected {
            background: var(--el-color-primary);
            color: white;
            border-color: var(--el-color-primary);
          }
        }
      }

      .emotion-note :deep(.el-textarea__inner) {
        border-radius: 12px;
        min-height: 108px;
      }
      
      .emotion-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 20px;

        :deep(.el-button) {
          height: 36px;
          min-width: 96px;
          border-radius: 10px;
          padding: 0 14px;
        }
      }
    }
  }
}

.calendar-card {
  border: none;
  border-radius: 18px;
  box-shadow: var(--app-shadow-soft);
  justify-self: end;
  width: 100%;

  :deep(.el-card) {
    height: 100%;
  }

  :deep(.el-card__header) {
    min-height: 68px;
    display: flex;
    align-items: center;
    padding: 10px 14px;
  }

  :deep(.el-card__body) {
    padding: 10px 14px 14px;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    box-sizing: border-box;
  }

  .calendar-header {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    .calendar-title-main {
      margin: 0;
      font-size: 17px;
      color: var(--app-text);
      text-align: center;
    }
    
    .calendar-controls {
      display: flex;
      align-items: center;
      gap: 10px;

      :deep(.el-button) {
        width: 28px;
        height: 28px;
      }
      
      .calendar-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--app-text);
      }
    }
  }
  
  .calendar {
    width: 100%;
    aspect-ratio: 1 / 1;
    max-width: 100%;

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 6px;
      
      .weekday {
        text-align: center;
        font-weight: 600;
        color: var(--app-text-soft);
        padding: 6px;
      }
    }
    
    .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      
      .calendar-day {
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover {
          background: var(--el-color-primary-light-9);
          color: var(--app-text);
        }
        
        &.today {
          background: var(--el-color-primary-light-9);
          font-weight: 600;
          color: var(--el-color-primary-dark-2);
        }

        &.selected {
          background: var(--el-color-primary-light-8);
          border: 1px solid var(--el-color-primary-light-3);
          color: var(--el-color-primary-dark-2);
          font-weight: 700;
        }
        
        &.disabled {
          color: var(--app-text-soft);
          opacity: 0.55;
          cursor: not-allowed;
        }
        
        &.has-emotion {
          position: relative;
        }
      }
      
      .emotion-indicator {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        margin-top: 4px;
        
        &.happy {
          background: #67c23a;
        }
        
        &.neutral {
          background: #e6a23c;
        }
        
        &.sad {
          background: #f56c6c;
        }
        
        &.angry {
          background: #f56c6c;
        }
        
        &.anxious {
          background: #e6a23c;
        }
        
        &.excited {
          background: #909399;
        }
        
        &.empty {
          background: transparent;
        }
      }
    }
  }
}

.combined-stats-card {
  border: none;
  border-radius: 18px;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.08);

  .section-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    h3 {
      margin: 0;
    }
  }

  :deep(.el-card__header) {
    min-height: 60px;
    display: flex;
    align-items: center;
    padding: 14px 18px;
  }

  :deep(.el-card__body) {
    padding: 16px 18px 18px;
  }

  .combined-stats-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
  }

  .merged-chart {
    margin-top: 14px;

    h4 {
      margin: 0 0 10px;
      font-size: 14px;
      color: var(--app-text);
    }
  }

  .summary-item {
    border: 1px solid var(--el-color-primary-light-7);
    border-radius: 10px;
    padding: 12px 10px;
    text-align: center;
    background: linear-gradient(145deg, var(--el-color-primary-light-9) 0%, var(--app-plain-bg) 100%);
  }

  .summary-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--app-text);
    line-height: 1.2;
  }

  .summary-label {
    margin-top: 4px;
    font-size: 13px;
    color: var(--app-text-soft);
  }

  .trend-chart {
    height: 320px;

    .chart {
      width: 100%;
      height: 100%;
      background: var(--app-plain-bg);
      border-radius: 8px;
      border: 1px solid var(--app-border);
    }
  }

  .breathing-summary {
    margin-top: 12px;

    h4 {
      margin: 0 0 8px;
      font-size: 14px;
      color: var(--app-text);
    }

    .breathing-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content .record-calendar-row {
    grid-template-columns: 1fr;
  }

  .calendar-card {
    justify-self: stretch;
    max-width: none;
  }

  .combined-stats-card .combined-stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 14px 16px;

    h2 {
      font-size: 22px;
    }

    p {
      font-size: 14px;
    }
  }

  .content {
    gap: 12px;
  }

  .emotion-card .emotion-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .combined-stats-card .combined-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
