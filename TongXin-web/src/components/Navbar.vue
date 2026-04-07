<template>
    <div class="navbar" @click="toggleSidebar">
        <div class="logo">
            <img 
                src="@/assets/headerNavbar.svg" 
                alt="navbar icon" 
                class="logo-img"
            />
            <span>导航栏</span>
        </div>
        <div class="user-info">
            <el-dropdown @command="handleCommand">
                <div class="flex-box" @click.stop>
                    <span class="user-mark">
                        <el-icon><User /></el-icon>
                    </span>
                    <span class="user-name">管理员</span>
                    <el-icon>
                        <ArrowDown />
                    </el-icon>
                </div> 
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="layout">退出登录</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>
    </div>
</template>

<script setup>
import { ArrowDown, User } from '@element-plus/icons-vue'
import { useLayoutStore } from '@/stores/layout'

const layoutStore = useLayoutStore()

const toggleSidebar = () => {
    layoutStore.toggleSidebar()
}

const handleCommand = (command) => {
    if(command === 'layout') {
        //处理退出登录逻辑
        window.location.href = '/'
    }
}
</script>

<style lang="scss" scoped>
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    height: 100%;
    background-color: #fff;
    border-bottom: 1px solid #e6e6e6;
    cursor: pointer;

    .logo {
        display: flex;
        align-items: center;
        font-size: 18px;
        font-weight: bold;
        color: #333;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 250px;

        .logo-img {
            width: 32px;
            height: 32px;
            margin-right: 8px;
        }

        span {
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 10px;

        .flex-box {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;

            .user-mark {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 1px solid #d6dde8;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: #1d4ed8;
                background: #f0f6ff;
            }
        }

        .user-name {
            font-size: 14px;
            color: #666;
        }
    }
}
</style>