<template>
  <div class="login-page">
    <div class="ambient ambient-b"></div>

    <div class="login-theme-switcher">
      <ThemeSwitcher />
    </div>

    <div class="brand-block">
      <img class="brand-logo" src="/logo.png" alt="仝心 Logo" />
      <div class="brand-copy">
        <span class="brand-name">仝心</span>
        <p>AI心理健康助手</p>
      </div>
    </div>

    <section class="login-shell">
      <div class="login-form">
        <h2>统一登录入口</h2>
        <p class="form-subtitle">输入用户名和邮箱，系统将自动判断登录或注册</p>

        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          label-position="top"
          class="form"
        >
          <el-form-item label="用户名" prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              size="large"
              prefix-icon="User"
            />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model="loginForm.email"
              placeholder="请输入邮箱"
              size="large"
              prefix-icon="Message"
            />
          </el-form-item>

          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleAuthEntry"
          >
            {{ loading ? '处理中...' : '进入系统' }}
          </el-button>
        </el-form>
      </div>
    </section>

    <el-dialog
      v-model="profileDialogVisible"
      title="完善个人信息"
      width="420px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <p class="dialog-tip">检测到您是新用户，请先填写年龄和性别。</p>

      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-position="top"
      >
        <el-form-item label="年龄" prop="age">
          <el-input-number
            v-model="profileForm.age"
            :min="1"
            :max="120"
            :step="1"
            controls-position="right"
            style="width: 100%"
            placeholder="请输入年龄"
          />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="profileForm.gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="authStore.logout">退出登录</el-button>
        <el-button type="primary" :loading="profileSubmitting" @click="submitProfileCompletion">
          {{ profileSubmitting ? '保存中...' : '保存并进入系统' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { authEntry, updateProfile } from '@/api/auth'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'

const router = useRouter()
const authStore = useAuthStore()

// 表单引用
const loginFormRef = ref(null)

// 加载状态
const loading = ref(false)

// 登录表单
const loginForm = ref({
  username: '',
  email: ''
})

const profileDialogVisible = ref(false)
const profileFormRef = ref(null)
const profileSubmitting = ref(false)
const profileForm = ref({
  age: null,
  gender: ''
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] }
  ]
}

const profileRules = {
  age: [
    { required: true, message: '请输入年龄', trigger: 'change' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ]
}

// 处理登录
const handleAuthEntry = async () => {
  // 表单验证
  if (!loginFormRef.value) return
  
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const response = await authEntry({
      username: loginForm.value.username,
      email: loginForm.value.email
    })

    if (response.code !== 0) {
      throw new Error(response.msg || '登录失败')
    }

    authStore.login(response.data.user, response.data.token)

    if (response?.data?.action === 'register-login') {
      profileForm.value = {
        age: authStore.user?.age || null,
        gender: authStore.user?.gender || ''
      }
      profileDialogVisible.value = true
      ElMessage.info('欢迎新用户，请完善年龄和性别')
      return
    }

    ElMessage.success(response.msg || '登录成功')
    router.push('/app')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error.message || '认证失败')
  } finally {
    loading.value = false
  }
}

const submitProfileCompletion = async () => {
  if (!profileFormRef.value) return

  const valid = await profileFormRef.value.validate().catch(() => false)
  if (!valid) return

  profileSubmitting.value = true
  try {
    const payload = {
      username: authStore.user?.username || loginForm.value.username,
      email: authStore.user?.email || loginForm.value.email,
      age: Number(profileForm.value.age),
      gender: profileForm.value.gender
    }

    const response = await updateProfile(payload)
    if (response.code !== 0) {
      throw new Error(response.msg || '完善信息失败')
    }

    const updatedUser = response?.data?.user
    if (updatedUser) {
      authStore.updateProfile(updatedUser)
    }

    profileDialogVisible.value = false
    ElMessage.success('资料完善成功')
    router.push('/app')
  } catch (error) {
    ElMessage.error(error?.response?.data?.msg || error.message || '保存失败，请稍后重试')
  } finally {
    profileSubmitting.value = false
  }
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.ambient {
  position: absolute;
  border-radius: 50%;
  filter: blur(8px);
  pointer-events: none;
}

.ambient-b {
  width: 320px;
  height: 320px;
  right: -70px;
  bottom: -80px;
  background: radial-gradient(circle, var(--el-color-primary-light-3) 0%, rgba(34, 197, 94, 0) 70%);
}

.login-shell {
  width: 100%;
  max-width: 460px;
  position: relative;
  z-index: 1;
}

.brand-block {
  position: absolute;
  top: 20px;
  left: 24px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.login-theme-switcher {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 4;
}

.brand-logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
  object-fit: cover;
  background: #fff;
}

.brand-copy {
  text-align: left;
}

.brand-name {
  display: inline-block;
  color: var(--el-color-primary-dark-2);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.brand-copy p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--app-text-soft);
}

.login-form {
  width: 100%;
  padding: 28px 24px;
  border-radius: 20px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(8px);
}

.login-form h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--app-text);
  margin: 0 0 8px;
  text-align: center;
}

.form-subtitle {
  font-size: 14px;
  color: var(--app-text-soft);
  margin: 0 0 22px;
  text-align: center;
}

.form {
  margin-bottom: 8px;
}

.login-button {
  width: 100%;
  height: 46px;
  font-size: 16px;
}

.dialog-tip {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--app-text-soft);
}

@media (max-width: 768px) {
  .login-page {
    padding: 14px;
  }

  .brand-logo {
    width: 46px;
    height: 46px;
  }

  .brand-block {
    top: 14px;
    left: 14px;
    gap: 10px;
  }

  .login-theme-switcher {
    top: 14px;
    right: 14px;
  }

  .brand-name {
    font-size: 18px;
    height: 34px;
    padding: 0 12px;
  }

  .login-form {
    padding: 24px 18px;
  }
}

@media (max-width: 480px) {
  .brand-name {
    font-size: 18px;
  }

  .brand-copy p {
    font-size: 12px;
  }

  .login-form {
    padding: 20px 14px;
  }

  .login-form h2 {
    font-size: 20px;
  }

  .form-subtitle {
    font-size: 13px;
    margin-bottom: 16px;
  }
}
</style>