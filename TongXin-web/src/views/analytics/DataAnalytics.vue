<template>
  <div class="data-analytics">
    <!-- 时间范围选择 -->
    <div class="time-range-selector">
      <el-radio-group v-model="timeRange" size="large">
        <el-radio-button value="week">本周</el-radio-button>
        <el-radio-button value="month">本月</el-radio-button>
        <el-radio-button value="year">本年</el-radio-button>
        <el-radio-button value="custom">自定义</el-radio-button>
      </el-radio-group>

      <div class="time-range-actions">
        <el-date-picker
          v-if="timeRange === 'custom'"
          v-model="customDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="custom-range-picker"
          @change="updateData"
        />

        <el-button type="primary" class="update-btn" @click="updateData">
          <el-icon><Refresh /></el-icon>
          更新数据
        </el-button>
      </div>
    </div>
    
    <!-- 数据概览 -->
    <div class="data-overview">
      <el-card class="overview-card">
        <div class="overview-content">
          <div class="overview-icon emotion-icon">
            <el-icon><Collection /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-value">{{ emotionRecordsCount }}</div>
            <div class="overview-label">情绪记录数</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="overview-card">
        <div class="overview-content">
          <div class="overview-icon chat-icon">
            <el-icon><ChatRound /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-value">{{ chatSessionsCount }}</div>
            <div class="overview-label">对话会话数</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="overview-card">
        <div class="overview-content">
          <div class="overview-icon test-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-value">{{ testCount }}</div>
            <div class="overview-label">测试完成数</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="overview-card">
        <div class="overview-content">
          <div class="overview-icon relax-icon">
            <el-icon><Timer /></el-icon>
          </div>
          <div class="overview-info">
            <div class="overview-value">{{ relaxMinutes }}</div>
            <div class="overview-label">放松练习时长(分钟)</div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 图表区域 -->
    <div class="charts-container">
      <!-- 情绪趋势图 -->
      <el-card class="chart-card">
        <template #header>
          <h3>情绪变化趋势</h3>
        </template>
        <div id="emotionTrendChart" class="chart"></div>
      </el-card>
      
      <!-- 情绪分布饼图 -->
      <el-card class="chart-card">
        <template #header>
          <h3>情绪分布</h3>
        </template>
        <div id="emotionDistributionChart" class="chart"></div>
      </el-card>
      
      <!-- 工具使用统计 -->
      <el-card class="chart-card">
        <template #header>
          <h3>工具使用统计</h3>
        </template>
        <div id="toolUsageChart" class="chart"></div>
      </el-card>
      
      <!-- 每日活动统计 -->
      <el-card class="chart-card">
        <template #header>
          <h3>每日活动统计</h3>
        </template>
        <div id="dailyActivityChart" class="chart"></div>
      </el-card>
    </div>
    
    <!-- 数据报告 -->
    <el-card class="report-card">
      <template #header>
        <div class="report-header">
          <h3>数据报告</h3>
          <div class="report-actions">
            <el-button type="primary" @click="generateReport">
              <el-icon><Document /></el-icon>
              生成报告
            </el-button>
            <el-dropdown @command="downloadReport">
              <el-button type="success">
                <el-icon><Download /></el-icon>
                导出数据
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pdf">PDF格式</el-dropdown-item>
                  <el-dropdown-item command="excel">Excel格式</el-dropdown-item>
                  <el-dropdown-item command="image">图片格式</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </template>
      
      <div class="report-content" v-if="reportContent">
        <h4>{{ reportTitle }}</h4>
        <div v-html="reportContent"></div>
      </div>
      
      <div class="no-report" v-else>
        <el-empty description="点击生成报告查看详细数据分析" />
      </div>
    </el-card>
    
    <!-- 数据导出对话框 -->
    <el-dialog
      v-model="showExportDialog"
      title="数据导出"
      width="500px"
    >
      <div class="export-dialog-content">
        <el-form>
          <el-form-item label="导出内容">
            <el-checkbox-group v-model="exportOptions">
              <el-checkbox label="emotion">情绪记录</el-checkbox>
              <el-checkbox label="chat">聊天记录</el-checkbox>
              <el-checkbox label="test">测试结果</el-checkbox>
              <el-checkbox label="usage">使用统计</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          
          <el-form-item label="导出格式">
            <el-radio-group v-model="exportFormat">
              <el-radio label="csv">CSV</el-radio>
              <el-radio label="json">JSON</el-radio>
              <el-radio label="excel">Excel</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showExportDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmExport">确认导出</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Refresh, Download, ArrowDown, Collection, 
  ChatRound, Document, Timer 
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { localStorageUtil, STORAGE_KEYS } from '@/utils/storage'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 时间范围
const timeRange = ref('week')
const customDateRange = ref([])

// 数据概览
const emotionRecordsCount = ref(0)
const chatSessionsCount = ref(0)
const testCount = ref(0)
const relaxMinutes = ref(0)

// 图表实例
let emotionTrendChart = null
let emotionDistributionChart = null
let toolUsageChart = null
let dailyActivityChart = null

// 报告相关
const reportContent = ref('')
const reportTitle = ref('')

// 导出相关
const showExportDialog = ref(false)
const exportOptions = ref(['emotion'])
const exportFormat = ref('csv')

// 初始化图表
const initCharts = () => {
  // 情绪趋势图
  emotionTrendChart = echarts.init(document.getElementById('emotionTrendChart'))
  
  // 情绪分布饼图
  emotionDistributionChart = echarts.init(document.getElementById('emotionDistributionChart'))
  
  // 工具使用统计
  toolUsageChart = echarts.init(document.getElementById('toolUsageChart'))
  
  // 每日活动统计
  dailyActivityChart = echarts.init(document.getElementById('dailyActivityChart'))
}

// 更新数据
const updateData = () => {
  loadData()
  updateCharts()
}

// 加载数据
const loadData = () => {
  // 加载情绪记录
  const emotionRecords = localStorageUtil.get(STORAGE_KEYS.EMOTION_RECORDS) || []
  emotionRecordsCount.value = emotionRecords.length
  
  // 加载聊天记录
  const chatHistory = localStorageUtil.get(STORAGE_KEYS.CHAT_HISTORY) || {}
  chatSessionsCount.value = chatHistory.messages?.length || 0
  
  // 加载测试记录
  const testHistory = localStorageUtil.get(STORAGE_KEYS.TEST_HISTORY) || []
  testCount.value = testHistory.length
  
  // 模拟放松练习时长
  relaxMinutes.value = Math.floor(Math.random() * 100) + 20
}

// 更新图表
const updateCharts = () => {
  // 情绪趋势图数据
  const emotionTrendOption = {
    title: {
      text: '',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a}: {c}'
    },
    legend: {
      data: ['开心', '平静', '难过', '焦虑'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '开心',
        type: 'line',
        data: [3, 2, 4, 3, 5, 4, 3],
        smooth: true,
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '平静',
        type: 'line',
        data: [2, 3, 2, 4, 3, 5, 4],
        smooth: true,
        itemStyle: { color: '#409eff' }
      },
      {
        name: '难过',
        type: 'line',
        data: [1, 0, 1, 0, 2, 1, 0],
        smooth: true,
        itemStyle: { color: '#909399' }
      },
      {
        name: '焦虑',
        type: 'line',
        data: [0, 1, 0, 2, 1, 0, 1],
        smooth: true,
        itemStyle: { color: '#f56c6c' }
      }
    ]
  }
  
  // 情绪分布饼图数据
  const emotionDistributionOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{a}<br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['开心', '平静', '难过', '焦虑', '生气', '兴奋']
    },
    series: [
      {
        name: '情绪分布',
        type: 'pie',
        radius: '70%',
        center: ['60%', '50%'],
        data: [
          { value: 35, name: '开心', itemStyle: { color: '#67c23a' } },
          { value: 30, name: '平静', itemStyle: { color: '#409eff' } },
          { value: 15, name: '难过', itemStyle: { color: '#909399' } },
          { value: 10, name: '焦虑', itemStyle: { color: '#f56c6c' } },
          { value: 5, name: '生气', itemStyle: { color: '#e6a23c' } },
          { value: 5, name: '兴奋', itemStyle: { color: '#909399' } }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  // 工具使用统计数据
  const toolUsageOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['呼吸训练', '冥想', '白噪音', '焦虑测试', '抑郁测试', '压力测试']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '使用次数',
        type: 'bar',
        data: [15, 8, 12, 6, 4, 5],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }
  
  // 每日活动统计数据
  const dailyActivityOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['情绪记录', '对话次数', '工具使用'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '情绪记录',
        type: 'bar',
        data: [1, 1, 0, 1, 1, 1, 1],
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '对话次数',
        type: 'bar',
        data: [3, 2, 4, 5, 3, 2, 1],
        itemStyle: { color: '#409eff' }
      },
      {
        name: '工具使用',
        type: 'bar',
        data: [2, 1, 3, 2, 4, 1, 2],
        itemStyle: { color: '#e6a23c' }
      }
    ]
  }
  
  // 更新图表
  emotionTrendChart.setOption(emotionTrendOption)
  emotionDistributionChart.setOption(emotionDistributionOption)
  toolUsageChart.setOption(toolUsageOption)
  dailyActivityChart.setOption(dailyActivityOption)
}

// 生成报告
const generateReport = () => {
  const now = new Date()
  reportTitle.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 - 心理健康数据分析报告`
  
  reportContent.value = `
    <h5>数据概览</h5>
    <p>在所选时间范围内，您共记录了 ${emotionRecordsCount.value} 条情绪记录，进行了 ${chatSessionsCount.value} 次对话，完成了 ${testCount.value} 次心理健康测试，累计放松练习时长为 ${relaxMinutes.value} 分钟。</p>
    
    <h5>情绪分析</h5>
    <p>您的主要情绪为平静和开心，这表明您的整体心理状态良好。建议继续保持积极的生活态度和良好的生活习惯。</p>
    
    <h5>使用建议</h5>
    <ul>
      <li>继续坚持每日情绪记录，有助于更好地了解自己的情绪变化</li>
      <li>定期进行心理健康测试，及时发现潜在的心理问题</li>
      <li>适当增加放松练习的频率，缓解日常压力</li>
      <li>保持规律的作息和健康的饮食习惯</li>
    </ul>
    
    <h5>注意事项</h5>
    <p>本报告仅供参考，不能替代专业的医疗诊断。如果您感到持续的焦虑、抑郁或其他心理困扰，请及时寻求专业心理咨询师的帮助。</p>
  `
}

// 下载报告
const downloadReport = (format) => {
  switch (format) {
    case 'pdf':
      ElMessage.success('PDF报告生成中...')
      break
    case 'excel':
      ElMessage.success('Excel报告生成中...')
      break
    case 'image':
      ElMessage.success('图片报告生成中...')
      break
  }
}

// 确认导出
const confirmExport = () => {
  if (exportOptions.value.length === 0) {
    ElMessage.warning('请选择至少一项导出内容')
    return
  }
  
  ElMessage.success(`已选择导出 ${exportOptions.value.join('、')}，格式为 ${exportFormat.value}`)
  showExportDialog.value = false
}

// 监听窗口大小变化，调整图表大小
const handleResize = () => {
  emotionTrendChart?.resize()
  emotionDistributionChart?.resize()
  toolUsageChart?.resize()
  dailyActivityChart?.resize()
}

// 监听时间范围变化
watch(timeRange, () => {
  updateData()
})

// 组件挂载
onMounted(() => {
  initCharts()
  loadData()
  updateCharts()
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  // 销毁图表实例
  emotionTrendChart?.dispose()
  emotionDistributionChart?.dispose()
  toolUsageChart?.dispose()
  dailyActivityChart?.dispose()
})
</script>

<style scoped lang="scss">
.data-analytics {
  display: grid;
  gap: 16px;

  .time-range-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 64px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(191, 219, 254, 0.8);
    background: linear-gradient(135deg, #f8fbff 0%, #f2fbf5 100%);

    .time-range-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: 12px;
    }

    .custom-range-picker {
      width: 280px;
    }

    .update-btn {
      height: 40px;
      padding: 0 16px;
      border-radius: 10px;
    }
  }
  
  .data-overview {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    
    .overview-card {
      :deep(.el-card__body) {
        padding: 18px;
      }

      .overview-content {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 74px;
        
        .overview-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
          
          &.emotion-icon {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          
          &.chat-icon {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
          }
          
          &.test-icon {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
          }
          
          &.relax-icon {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
          }
        }
        
        .overview-info {
          .overview-value {
            font-size: 30px;
            font-weight: 700;
            color: #333;
            line-height: 1.1;
          }
          
          .overview-label {
            font-size: 14px;
            color: #64748b;
          }
        }
      }
    }
  }
  
  .charts-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 16px;
    
    .chart-card {
      :deep(.el-card__header) {
        min-height: 60px;
        display: flex;
        align-items: center;
        padding: 14px 18px;

        h3 {
          margin: 0;
          font-size: 17px;
        }
      }

      :deep(.el-card__body) {
        padding: 14px 16px 18px;
      }

      .chart {
        height: 320px;
      }
    }
  }
  
  .report-card {
    :deep(.el-card__header) {
      min-height: 60px;
      padding: 14px 18px;
    }

    :deep(.el-card__body) {
      padding: 16px 18px 20px;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h3 {
        margin: 0;
      }
      
      .report-actions {
        display: flex;
        gap: 10px;

        :deep(.el-button) {
          height: 40px;
          border-radius: 10px;
          padding: 0 16px;
        }
      }
    }
    
    .report-content {
      padding: 4px 0;
      
      h4 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }
      
      h5 {
        margin: 16px 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      p {
        margin: 8px 0;
        line-height: 1.6;
        color: #666;
      }
      
      ul {
        margin: 8px 0;
        padding-left: 20px;
        
        li {
          margin-bottom: 4px;
          line-height: 1.6;
          color: #666;
        }
      }
    }
    
    .no-report {
      padding: 24px 0;
    }
  }
  
  .export-dialog-content {
    padding: 12px 0 8px;
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .data-analytics .charts-container {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .data-analytics .time-range-selector {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;

    .time-range-actions {
      margin-left: 0;
      flex-direction: column;
      align-items: stretch;
    }

    .custom-range-picker {
      width: 100%;
    }
  }
  
  .data-analytics .data-overview {
    grid-template-columns: 1fr;
  }
  
  .data-analytics .charts-container {
    grid-template-columns: 1fr;
  }
  
  .data-analytics .report-card .report-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    
    .report-actions {
      flex-direction: column;
    }
  }
}
</style>