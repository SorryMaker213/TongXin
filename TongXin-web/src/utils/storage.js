/**
 * 本地存储工具类
 * 封装localStorage和IndexedDB的操作
 */

// localStorage操作
export const localStorageUtil = {
  // 设置数据
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('localStorage set error:', error)
      return false
    }
  },

  // 获取数据
  get(key) {
    try {
      const value = localStorage.getItem(key)
      if (!value) return null

      // 尝试解析为JSON
      try {
        return JSON.parse(value)
      } catch (jsonError) {
        // 如果不是JSON格式，直接返回原始值（适用于字符串类型的token等）
        return value
      }
    } catch (error) {
      console.error('localStorage get error:', error)
      return null
    }
  },

  // 删除数据
  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error('localStorage remove error:', error)
      return false
    }
  },

  // 清空所有数据
  clear() {
    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.error('localStorage clear error:', error)
      return false
    }
  }
}

// IndexedDB操作
export class IndexedDBUtil {
  constructor(dbName = 'mentalHealthDB', version = 1) {
    this.dbName = dbName
    this.version = version
    this.db = null
  }

  // 初始化数据库
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // 创建存储对象
        if (!db.objectStoreNames.contains('emotions')) {
          const emotionStore = db.createObjectStore('emotions', { keyPath: 'id' })
          emotionStore.createIndex('date', 'date', { unique: false })
          emotionStore.createIndex('userId', 'userId', { unique: false })
        }

        if (!db.objectStoreNames.contains('chatHistory')) {
          const chatStore = db.createObjectStore('chatHistory', { keyPath: 'id' })
          chatStore.createIndex('userId', 'userId', { unique: false })
          chatStore.createIndex('timestamp', 'timestamp', { unique: false })
        }

        if (!db.objectStoreNames.contains('testResults')) {
          const testStore = db.createObjectStore('testResults', { keyPath: 'id' })
          testStore.createIndex('userId', 'userId', { unique: false })
          testStore.createIndex('testType', 'testType', { unique: false })
        }
      }

      request.onsuccess = (event) => {
        this.db = event.target.result
        resolve(this.db)
      }

      request.onerror = (event) => {
        reject(event.target.error)
      }
    })
  }

  // 添加数据
  async add(storeName, data) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => resolve(data)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  // 获取所有数据
  async getAll(storeName) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = (event) => resolve(event.target.result)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  // 根据索引查询数据
  async getByIndex(storeName, indexName, value) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = (event) => resolve(event.target.result)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  // 更新数据
  async update(storeName, data) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve(data)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  // 删除数据
  async delete(storeName, key) {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve(true)
      request.onerror = (event) => reject(event.target.error)
    })
  }
}

// 导出单例实例
export const db = new IndexedDBUtil()

// 常用存储键名
export const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
  SETTINGS: 'settings',
  CHAT_HISTORY: 'chat_history',
  EMOTION_RECORDS: 'emotion_records',
  TEST_RESULTS: 'test_results',
  RELAX_STATS: 'relax_stats'
}