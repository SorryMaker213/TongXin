<template>
  <div class="assessment-page">
    <section class="hero">
      <div>
        <h2>心理测评中心</h2>
        <p>先选量表，再进入问卷。问卷采用单题单页模式，提交后生成结构化报告并写入历史。</p>
      </div>
      <a class="source-link" href="https://www.pixues.com/" target="_blank" rel="noreferrer">数据来源：Pixues</a>
    </section>

    <section class="grid-layout">
      <el-card class="catalog-card" shadow="never">
        <template #header>
          <div class="card-title">测试表单</div>
        </template>

        <el-input v-model="searchKeyword" placeholder="搜索量表..." clearable class="catalog-search" />

        <el-scrollbar class="catalog-scroll" v-loading="catalogLoading">
          <div
            v-for="test in filteredTests"
            :key="test.toolKey"
            class="catalog-item"
            :class="{ active: test.toolKey === selectedToolKey }"
            @click="startAssessment(test.toolKey)"
          >
            <div class="catalog-item-header">
              <span class="catalog-name">{{ test.title }}</span>
              <el-tag size="small" effect="plain">{{ test.total }}题</el-tag>
            </div>
            <p class="catalog-desc">{{ test.description }}</p>
          </div>

          <el-empty v-if="!catalogLoading && filteredTests.length === 0" description="未找到匹配量表" />
        </el-scrollbar>
      </el-card>

      <el-card class="history-card" shadow="never">
        <template #header>
          <div class="card-title">历史评测记录</div>
        </template>

        <el-scrollbar class="history-scroll" v-loading="historyLoading">
          <div
            v-for="item in historyRecords"
            :key="item.id"
            class="history-item"
            :class="{ active: item.id === activeHistoryId }"
            @click="goHistoryReport(item)"
          >
            <div class="history-top-row">
              <div class="history-title">{{ item.tool_title }}</div>
              <el-button
                type="danger"
                link
                size="small"
                class="history-delete-btn"
                @click.stop="deleteHistoryRecord(item)"
              >
                删除
              </el-button>
            </div>
            <div class="history-meta">{{ formatTime(item.created_at) }}</div>
            <div class="history-level">{{ item.result_level || '已完成评估' }}</div>
          </div>

          <el-empty v-if="!historyLoading && historyRecords.length === 0" description="暂无历史记录" />
        </el-scrollbar>
      </el-card>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import service from '@/utils/request'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const catalogLoading = ref(false)
const historyLoading = ref(false)

const searchKeyword = ref('')
const tests = ref([])
const selectedToolKey = ref('')

const historyRecords = ref([])
const activeHistoryId = ref(null)

const userId = computed(() => authStore.user?.id || 1)

const filteredTests = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) {
    return tests.value
  }

  return tests.value.filter((item) => {
    return String(item.title || '').toLowerCase().includes(keyword) || String(item.description || '').toLowerCase().includes(keyword)
  })
})

const formatTime = (timeLike) => {
  const date = new Date(timeLike)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString()
}

const fetchCatalog = async () => {
  catalogLoading.value = true
  try {
    const data = await service.get('/assessments/catalog')
    tests.value = data.tests || []
    if (!selectedToolKey.value && tests.value.length > 0) {
      selectedToolKey.value = tests.value[0].toolKey
    }
  } catch (error) {
    console.error('获取量表目录失败:', error)
    ElMessage.error('获取量表目录失败')
  } finally {
    catalogLoading.value = false
  }
}

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    const data = await service.get('/assessments/history', {
      params: { userId: userId.value }
    })
    historyRecords.value = data.history || []
  } catch (error) {
    console.error('获取历史测评失败:', error)
    ElMessage.error('获取历史测评失败')
  } finally {
    historyLoading.value = false
  }
}

const startAssessment = (toolKey) => {
  if (!toolKey) return
  selectedToolKey.value = toolKey
  router.push(`/app/assessment/${toolKey}`)
}

const goHistoryReport = (item) => {
  if (!item || !item.tool_key || !item.id) {
    ElMessage.warning('历史记录数据不完整，无法跳转')
    return
  }
  activeHistoryId.value = item.id
  router.push(`/app/assessment/${item.tool_key}/quiz?historyId=${item.id}`)
}

const deleteHistoryRecord = async (item) => {
  if (!item || !item.id) {
    return
  }

  try {
    await ElMessageBox.confirm(
      '删除后将无法恢复，确定要删除该条历史记录吗？',
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await service.delete(`/assessments/history/${item.id}`, {
      params: { userId: userId.value }
    })

    if (activeHistoryId.value === item.id) {
      activeHistoryId.value = null
    }

    historyRecords.value = historyRecords.value.filter((record) => record.id !== item.id)
    ElMessage.success('历史记录已删除')
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    console.error('删除历史记录失败:', error)
    ElMessage.error(error?.response?.data?.error || '删除历史记录失败')
  }
}

onMounted(async () => {
  await Promise.all([fetchCatalog(), fetchHistory()])
})
</script>

<style scoped lang="scss">
.assessment-page {
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
  border: 1px solid var(--app-border);
  background: linear-gradient(140deg, var(--el-color-primary-light-9) 0%, var(--app-bg-2) 42%, var(--app-bg-3) 100%);
}

.hero h2 {
  margin: 0;
  font-size: 24px;
  color: var(--app-text);
}

.hero p {
  margin: 8px 0 0;
  color: var(--app-text-soft);
  line-height: 1.6;
}

.source-link {
  color: var(--el-color-primary-dark-2);
  text-decoration: none;
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--app-surface-strong);
}

.grid-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 12px;
  min-height: 640px;
}

.catalog-card,
.history-card {
  border: none;
  border-radius: 18px;
  box-shadow: var(--app-shadow-soft);
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.catalog-search {
  margin-bottom: 12px;
}

.catalog-scroll,
.history-scroll {
  max-height: 560px;
}

.catalog-scroll :deep(.el-scrollbar__view) {
  padding-right: 18px;
  box-sizing: border-box;
}

.catalog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.catalog-item:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.catalog-item.active {
  border-color: var(--el-color-primary-light-3);
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-color-primary-light-8) 100%);
}

.catalog-item-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.catalog-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text);
}

.catalog-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--app-text-soft);
  line-height: 1.5;
}

.history-item {
  padding: 10px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.history-item.active {
  border-color: var(--el-color-primary-light-3);
  background: var(--el-color-primary-light-9);
}

.history-title {
  font-size: 14px;
  color: var(--app-text);
  font-weight: 600;
}

.history-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.history-delete-btn {
  padding: 0;
  font-size: 12px;
}

.history-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text-soft);
}

.history-level {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text);
}

@media (max-width: 1280px) {
  .grid-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
}

@media (max-width: 900px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
  }

  .catalog-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
