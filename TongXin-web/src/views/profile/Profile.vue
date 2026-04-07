<template>
  <div class="profile">
    <section class="hero">
      <div>
        <h2>个人中心</h2>
      </div>
    </section>

    <el-card class="profile-section" shadow="never">
      <template #header>
        <h3>基本信息</h3>
      </template>

      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-position="top"
        class="profile-form"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="profileForm.username" placeholder="请输入用户名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="profileForm.email" type="email" placeholder="请输入邮箱地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
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
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="profileForm.gender">
                <el-radio label="male">男</el-radio>
                <el-radio label="female">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item class="actions">
          <el-button type="primary" @click="saveProfile" :loading="saving">
            {{ saving ? '保存中...' : '保存修改' }}
          </el-button>
          <el-button @click="resetForm">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { updateProfile as updateProfileApi } from '@/api/auth'

const authStore = useAuthStore()
const profileFormRef = ref(null)
const saving = ref(false)

const profileForm = ref({
  username: '',
  email: '',
  age: null,
  gender: ''
})

const profileRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  age: [
    { required: true, message: '请输入年龄', trigger: 'change' }
  ],
  gender: [
    { required: true, message: '请选择性别', trigger: 'change' }
  ]
}

const initForm = () => {
  profileForm.value = {
    username: authStore.user?.username || '',
    email: authStore.user?.email || '',
    age: authStore.user?.age || null,
    gender: authStore.user?.gender || ''
  }
}

const saveProfile = async () => {
  if (!profileFormRef.value) return

  const valid = await profileFormRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true

  try {
    const payload = {
      username: profileForm.value.username.trim(),
      email: profileForm.value.email.trim().toLowerCase(),
      age: Number(profileForm.value.age),
      gender: profileForm.value.gender
    }

    const response = await updateProfileApi(payload)
    const updatedUser = response?.data?.user

    if (updatedUser) {
      authStore.updateProfile(updatedUser)
    }

    ElMessage.success(response?.msg || '个人资料更新成功')
  } catch (error) {
    const message = error?.response?.data?.msg || error?.response?.data?.error || '更新失败，请稍后重试'
    ElMessage.error(message)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  initForm()
  if (profileFormRef.value) {
    profileFormRef.value.clearValidate()
  }
}

onMounted(() => {
  initForm()
})
</script>

<style scoped lang="scss">
.profile {
  display: grid;
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
  background: linear-gradient(140deg, #ecfeff 0%, #eef2ff 42%, #f0fdf4 100%);

  h2 {
    margin: 0;
    font-size: 24px;
    color: #0f172a;
  }

  p {
    margin: 8px 0 0;
    color: #334155;
    line-height: 1.6;
  }
}

.profile-section {
  border: none;
  border-radius: 18px;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.08);

  :deep(.el-card__header) {
    min-height: 60px;
    display: flex;
    align-items: center;
    padding: 14px 18px;

    h3 {
      margin: 0;
      font-size: 17px;
      color: #0f172a;
    }
  }

  :deep(.el-card__body) {
    padding: 18px;
  }

  .profile-form {
    max-width: 860px;

    :deep(.el-form-item) {
      margin-bottom: 18px;
    }

    .actions {
      margin-bottom: 0;
    }
  }
}

:deep(.el-button) {
  height: 40px;
  border-radius: 10px;
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

  .profile-form :deep(.el-col) {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>
