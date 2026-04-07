import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 公共页面
import Login from '@/views/auth/Login.vue'
import NotFound from '@/views/NotFound.vue'

// 布局和页面
import AdminLayout from '@/layouts/AdminLayout.vue'
import Chat from '@/views/chat/Chat.vue'
import EmotionTracker from '@/views/emotion/EmotionTracker.vue'
import PsychAssessment from '@/views/assessment/PsychAssessment.vue'
import AssessmentDetail from '@/views/assessment/AssessmentDetail.vue'
import AssessmentQuiz from '@/views/assessment/AssessmentQuiz.vue'
import Tools from '@/views/tools/Tools.vue'
import Profile from '@/views/profile/Profile.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 重定向根路径到登录页
    {
      path: '/',
      redirect: '/login'
    },

    // 登录页
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { public: true, title: '登录' }
    },

    // 应用路由（需要登录）
    {
      path: '/app',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/app/chat'
        },
        {
          path: 'chat',
          name: 'ai-chat',
          component: Chat,
          meta: { title: 'AI聊天' }
        },
        {
          path: 'emotion',
          name: 'mood-tracker',
          component: EmotionTracker,
          meta: { title: '自我管理' }
        },
        {
          path: 'assessment',
          name: 'psych-assessment',
          component: PsychAssessment,
          meta: { title: '心理测评' }
        },
        {
          path: 'assessment/:toolKey',
          name: 'psych-assessment-detail',
          component: AssessmentDetail,
          meta: { title: '心理测评详情' }
        },
        {
          path: 'assessment/:toolKey/quiz',
          name: 'psych-assessment-quiz',
          component: AssessmentQuiz,
          meta: { title: '心理测评问卷' }
        },
        {
          path: 'tools',
          name: 'self-service',
          component: Tools,
          meta: { title: '放松训练' }
        },
        {
          path: 'analytics',
          redirect: '/app/emotion'
        },
        {
          path: 'profile',
          name: 'admin-profile',
          component: Profile,
          meta: { title: '个人中心' }
        }
      ]
    },

    // 404页面
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound,
      meta: { public: true, title: '页面未找到' }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 仝心`
  }

  const authStore = useAuthStore()

  // 公开页面直接放行
  if (to.meta.public) {
    if (authStore.isLoggedIn && to.path === '/login') {
      return next('/app')
    }
    return next()
  }

  // 检查登录状态
  if (!authStore.isLoggedIn) {
    return next('/login')
  }

  next()
})

export default router