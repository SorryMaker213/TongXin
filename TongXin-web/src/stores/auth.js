import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { localStorageUtil, STORAGE_KEYS } from '@/utils/storage'

// 认证状态管理
export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref(localStorageUtil.get(STORAGE_KEYS.TOKEN) || '')
  const user = ref(localStorageUtil.get(STORAGE_KEYS.USER) || null)
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  // 设置认证信息
  const login = (userData, authToken) => {
    // 保存数据到localStorage
    localStorageUtil.set(STORAGE_KEYS.TOKEN, authToken)
    localStorageUtil.set(STORAGE_KEYS.USER, userData)

    // 更新状态
    token.value = authToken
    user.value = userData
  }

  // 登出
  const logout = () => {
    localStorageUtil.remove(STORAGE_KEYS.TOKEN)
    localStorageUtil.remove(STORAGE_KEYS.USER)
    token.value = ''
    user.value = null

    // 跳转到登录页面
    window.location.href = '/login'
  }

  // 更新用户信息
  const updateProfile = (updates) => {
    if (user.value) {
      user.value = { ...user.value, ...updates }
      localStorageUtil.set(STORAGE_KEYS.USER, user.value)
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    logout,
    updateProfile
  }
})