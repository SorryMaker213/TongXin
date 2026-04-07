<template>
  <div class="detail-page" v-loading="loading">
    <section v-if="tool" class="hero">
      <div class="hero-main">
        <el-button link @click="goBack">返回测评中心</el-button>
        <h2>{{ tool.title }}</h2>
        <p>{{ introDescription }}</p>

        <div class="meta-row">
          <el-tag effect="plain">题量 {{ tool.total }}</el-tag>
          <el-tag effect="plain" type="success">预计 {{ estimatedMinutes }} 分钟</el-tag>
        </div>
      </div>

      <div class="hero-actions">
        <el-button size="large" type="primary" @click="startQuiz">开始问卷</el-button>
      </div>
    </section>

    <section class="content-grid" v-if="tool">
      <el-card shadow="never" class="intro-card">
        <template #header>
          <div class="card-title">问卷介绍</div>
        </template>

        <div v-if="introSections.length > 0" class="section-list">
          <article v-for="(section, index) in introSections" :key="`${section.title}-${index}`" class="section-item">
            <h3>{{ section.title }}</h3>
            <p v-if="section.content">{{ section.content }}</p>
            <ul v-if="Array.isArray(section.points) && section.points.length > 0">
              <li v-for="point in section.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>
        <el-empty v-else description="暂无详细介绍" />
      </el-card>
    </section>

    <el-empty v-if="!loading && !tool" description="问卷不存在或加载失败" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import service from '@/utils/request'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const tool = ref(null)
const content = ref(null)

const toolKey = computed(() => String(route.params.toolKey || '').trim())

const introDescription = computed(() => {
  return content.value?.intro?.description || tool.value?.description || '请根据实际情况作答，完成后可获得多维分析结果。'
})

const introSections = computed(() => {
  return content.value?.intro?.sections || []
})

const estimatedMinutes = computed(() => {
  if (!tool.value || !tool.value.total) {
    return '--'
  }
  const minute = Math.ceil(Number(tool.value.total) * 0.4)
  return minute > 0 ? minute : 1
})

const goBack = () => {
  router.push('/app/assessment')
}

const startQuiz = () => {
  if (!toolKey.value) return
  router.push(`/app/assessment/${toolKey.value}/quiz`)
}

const loadDetail = async () => {
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
  } catch (error) {
    console.error('加载问卷详情失败:', error)
    ElMessage.error('加载问卷详情失败')
    tool.value = null
    content.value = null
  } finally {
    loading.value = false
  }
}

watch(toolKey, () => {
  loadDetail()
}, { immediate: true })
</script>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero {
  border: 1px solid var(--app-border);
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(120deg, var(--el-color-primary-light-9) 0%, var(--app-bg-2) 48%, var(--app-bg-3) 100%);
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.hero-main h2 {
  margin: 8px 0 0;
  font-size: 28px;
  color: var(--app-text);
}

.hero-main p {
  margin: 10px 0 0;
  color: var(--app-text-soft);
  line-height: 1.8;
}

.meta-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-actions {
  display: flex;
  align-items: center;
}

.content-grid {
  display: block;
}

.intro-card {
  border: none;
  border-radius: 16px;
  box-shadow: var(--app-shadow-soft);
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-item {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 12px;
  background: var(--app-surface-strong);
}

.section-item h3 {
  margin: 0;
  font-size: 16px;
  color: var(--app-text);
}

.section-item p {
  margin: 8px 0 0;
  line-height: 1.8;
  color: var(--app-text-soft);
}

.section-item ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--app-text-soft);
}

.section-item li {
  margin-bottom: 6px;
  line-height: 1.7;
}
@media (max-width: 1024px) {
  .hero {
    flex-direction: column;
  }
}
</style>
