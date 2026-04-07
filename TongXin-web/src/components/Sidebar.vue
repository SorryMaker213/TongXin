<!-- 侧边栏导航菜单组件 -->
<template>
    <el-aside :width="sidebarCollapsed ? '80px' : '264px'">
        <el-menu
            default-active="2"
            class="menu-style"
        >
            <div class="brand">
                <img src="../assets/logo.svg" alt="logo" class="brand-logo" />
                <div class="info-card" v-show="!sidebarCollapsed">
                    <h1>仝心 TongXin</h1>
                    <p class="brand-subtitle">管理后台</p>
                </div>
            </div>
            <!-- 根据路由配置自动生成侧边栏菜单项 -->
            <el-menu-item 
                @click="handleMenuItemClick(item)" 
                v-for="item in router.options.routes[1].children" 
                :key="item.path" 
                :index="item.path"
            >
                <el-icon :size="20">
                    <component :is="iconMap[item.meta.icon]" />
                </el-icon>
                <span v-show="!sidebarCollapsed">{{item.meta.title}}</span>
            </el-menu-item>
        </el-menu>
    </el-aside>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { PieChart, ChatLineSquare, Message, User } from '@element-plus/icons-vue'
import { useLayoutStore } from '@/stores/layout'

const router = useRouter()
const layoutStore = useLayoutStore()

const sidebarCollapsed = computed(() => layoutStore.sidebarCollapsed)

const iconMap = {
  PieChart,
  ChatLineSquare,
  Message,
  User
}

const handleMenuItemClick = (item) => {
    router.push(`/back/${item.path}`)
}
</script>


<style lang="scss"scoped>
.menu-style {
    height:100%;
    .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border-bottom: 1px solid #e6e6e6;
    .info-card {
        .brand-title{
            font: size 20px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
        }
        .brand-subtitle{
            font-size: 12px;
            color: #999;
        }
    }
}

    .brand-logo {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        margin-right: 12px;
}

.info-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.info-card h1 {
    margin: 0;
    font-size: 22.5px;
    font-weight: bold;
    color: #333;
    line-height: 1.8;
}

.brand-subtitle {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #999;
}
}

</style>