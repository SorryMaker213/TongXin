import service from '@/utils/request'

export function authEntry(data) {
    return service.post('/auth/entry', data)
}

export function updateProfile(data) {
    return service.put('/auth/profile', data)
}
