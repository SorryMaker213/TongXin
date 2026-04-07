import axios from "axios"
import router from '@/router'
import { ElMessage } from 'element-plus'
import { localStorageUtil, STORAGE_KEYS } from '@/utils/storage'

const service = axios.create({
    baseURL: '/api',
    timeout: 5000
})

service.interceptors.request.use(
    (config) => {
        const token = localStorageUtil.get(STORAGE_KEYS.TOKEN)
        if (token) {
            config.headers['Authorization'] = 'Bearer ' + token
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

service.interceptors.response.use(
    (response) => {
        const { data } = response
        if (data.code === 401) {
            localStorageUtil.remove(STORAGE_KEYS.TOKEN)
            localStorageUtil.remove(STORAGE_KEYS.USER)

            const currentPath = window.location.pathname
            if (!currentPath.includes('/login')) {
                ElMessage.error(data.msg || '登录过期，请重新登录')
                router.push('/login')
            }
        }
        return data
    },
    (error) => {
        return Promise.reject(error)
    }
)

export default service