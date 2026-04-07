<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLayoutStore } from '@/stores/layout'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { 
  ChatRound, Collection, DocumentChecked, Tools, User,
  ArrowDown, Menu, Expand, Fold 
} from '@element-plus/icons-vue'

const authStore = useAuthStore()
const layoutStore = useLayoutStore()
const route = useRoute()

const activeMenuPath = computed(() => {
  if (route.path.startsWith('/app/assessment')) {
    return '/app/assessment'
  }
  return route.path
})

const adminMenuItems = [
  { name: '对话', icon: ChatRound, path: '/app/chat' },
  { name: '自我管理', icon: Collection, path: '/app/emotion' },
  { name: '心理测评', icon: DocumentChecked, path: '/app/assessment' },
  { name: '放松训练', icon: Tools, path: '/app/tools' },
  { name: '个人中心', icon: User, path: '/app/profile' }
]
</script>

<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside
      :width="layoutStore.sidebarCollapsed ? '64px' : '200px'"
      class="sidebar"
      :class="{ collapsed: layoutStore.sidebarCollapsed, 'is-opened': !layoutStore.sidebarCollapsed }"
    >
      <div class="logo" :class="{ collapsed: layoutStore.sidebarCollapsed }">
        <img class="brand-logo" src="/logo.png" alt="仝心 Logo" />
        <span v-if="!layoutStore.sidebarCollapsed" class="brand-text">仝心</span>
      </div>
      
      <el-menu
        class="main-menu"
        :class="{ 'collapsed-menu': layoutStore.sidebarCollapsed }"
        :default-active="activeMenuPath"
        router
        :collapse="layoutStore.sidebarCollapsed"
        :collapse-transition="false"
      >
        <el-menu-item
          v-for="item in adminMenuItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.name }}</template>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer">
        <el-button
          link
          @click="layoutStore.toggleSidebar"
        >
          <el-icon>
            <component :is="layoutStore.sidebarCollapsed ? Expand : Fold" />
          </el-icon>
        </el-button>
      </div>
    </el-aside>
    
    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部栏 -->
      <header class="header">
        <div class="header-left">
          <el-button
            link
            @click="layoutStore.toggleSidebar"
            class="sidebar-toggle"
          >
            <el-icon><Menu /></el-icon>
          </el-button>
        </div>
        
        <div class="header-right">
          <ThemeSwitcher />

          <div class="user-info">
            <el-dropdown trigger="click">
              <div class="user-dropdown">
                <span class="user-sign">
                  <el-icon><User /></el-icon>
                </span>
                <span>{{ authStore.user?.username || '用户' }}</span>
                <el-icon><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="() => $router.push('/app/profile')">
                    个人中心
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="authStore.logout">
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>
      
      <!-- 页面内容 -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  height: 100vh;
  background: linear-gradient(160deg, var(--app-bg-1) 0%, var(--app-bg-2) 100%);
}

.sidebar {
  border-right: 1px solid var(--app-border);
  transition: width 0.3s;
  background: var(--app-surface);
  backdrop-filter: blur(8px);
  box-shadow: 4px 0 20px rgba(15, 23, 42, 0.06);
  position: relative;
  
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 0;
    border-bottom: 1px solid var(--app-border);
    background: linear-gradient(90deg, var(--el-color-primary) 0%, var(--el-color-primary-dark-2) 100%);
    color: #eff6ff;
    font-size: 16px;
    font-weight: 600;

    &.collapsed {
      justify-content: center;
      padding: 0;
    }

    .brand-logo {
      width: 30px;
      height: 30px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.55);
      background: rgba(255, 255, 255, 0.9);
    }

    .brand-text {
      color: #f8fafc;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.08em;
    }
  }

  :deep(.main-menu) {
    border-right: none;
    background: transparent;
    padding-top: 10px;
  }

  :deep(.main-menu .el-menu-item) {
    margin: 6px 10px;
    border-radius: 10px;
    color: #475569;
  }

  :deep(.main-menu.collapsed-menu) {
    padding-left: 0;
    padding-right: 0;
  }

  :deep(.main-menu.collapsed-menu.el-menu--collapse > .el-menu-item) {
    width: 46px;
    height: 46px;
    line-height: 46px;
    margin: 6px auto;
    padding: 0 !important;
    text-indent: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.main-menu.collapsed-menu.el-menu--collapse > .el-menu-item > .el-tooltip__trigger) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.main-menu.collapsed-menu.el-menu--collapse > .el-menu-item > .el-tooltip__trigger .el-icon) {
    margin: 0 !important;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &.collapsed {
    :deep(.main-menu.el-menu--collapse) {
      width: 100%;
    }

    :deep(.main-menu .el-menu-item) {
      width: 48px;
      margin: 6px auto;
      padding: 0 !important;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :deep(.main-menu .el-menu-item .el-icon) {
      margin-right: 0;
      font-size: 18px;
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }

  :deep(.main-menu .el-menu-item:hover) {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary-dark-2);
  }

  :deep(.main-menu .el-menu-item.is-active) {
    background: linear-gradient(90deg, var(--el-color-primary-light-8) 0%, var(--el-color-primary-light-9) 100%);
    color: var(--el-color-primary-dark-2);
    font-weight: 600;
  }
  
  .sidebar-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 10px;
    border-top: 1px solid var(--app-border);
    text-align: center;
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  height: 64px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface);
  backdrop-filter: blur(6px);
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .sidebar-toggle {
      font-size: 20px;
    }
    
    .header-title {
      font-size: 18px;
      font-weight: 600;
      color: #334155;
    }
  }
  
  .user-info {
    .user-dropdown {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 10px;
      border: 1px solid var(--app-border);
      background: var(--app-surface-strong);
      
      .user-sign {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid var(--app-border);
        color: var(--el-color-primary-dark-2);
        background: var(--el-color-primary-light-9);
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s;
    
    &.is-opened {
      transform: translateX(0);
    }
  }
  
  .header {
    padding: 0 15px;
  }

  .header-right {
    gap: 6px;
  }
  
  .content {
    padding: 15px;
  }
}
</style>