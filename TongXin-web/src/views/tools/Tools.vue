<template>
  <div class="relax-training">
    <el-card class="training-hero" shadow="never">
      <div class="hero-content">
        <h2>放松训练</h2>
        <p>通过冥想计时、白噪音和呼吸训练，帮助你在工作间隙快速恢复专注。</p>
      </div>
    </el-card>

    <div class="training-grid">
      <el-card class="training-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-icon timer">
              <el-icon><Timer /></el-icon>
            </span>
            <h3>冥想计时</h3>
          </div>
        </template>

        <div
          class="timer-visual-wrap"
          :class="{
            running: meditationRunning,
            warning: meditationRunning && remainingSeconds <= 10,
            finished: meditationFinished
          }"
        >
          <div class="timer-orbit"></div>
          <div class="timer-display">{{ formattedMeditationTime }}</div>
          <p class="timer-status">
            {{ meditationFinished ? '本轮完成' : meditationRunning ? '专注进行中' : '准备开始冥想' }}
          </p>
        </div>

        <p class="control-title">快捷时长</p>

        <div class="preset-group">
          <el-button
            v-for="item in meditationPresets"
            :key="item"
            :type="selectedMinutes === item ? 'primary' : 'default'"
            plain
            @click="setMeditationPreset(item)"
          >
            {{ item }} 分钟
          </el-button>
        </div>

        <el-alert
          v-if="meditationFinished"
          title="本次冥想已完成，做得很好。"
          type="success"
          :closable="false"
          show-icon
          class="timer-alert"
        />

        <div class="card-actions">
          <el-button type="primary" @click="startMeditation" :disabled="meditationRunning">
            <el-icon><VideoPlay /></el-icon>
            开始
          </el-button>
          <el-button @click="pauseMeditation" :disabled="!meditationRunning">
            <el-icon><VideoPause /></el-icon>
            暂停
          </el-button>
          <el-button @click="resetMeditation">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </div>
      </el-card>

      <el-card class="training-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-icon noise">
              <el-icon><Headset /></el-icon>
            </span>
            <h3>白噪音背景</h3>
          </div>
        </template>

        <div class="noise-controls">
          <div class="noise-options-block">
            <p class="control-title">原始噪音</p>
            <div class="noise-button-grid">
              <el-button
                v-for="item in basicNoiseOptions"
                :key="item.value"
                :type="noiseType === item.value ? 'primary' : 'default'"
                plain
                @click="setNoiseType(item.value)"
              >
                {{ item.label }}
              </el-button>
            </div>
          </div>

          <div class="noise-options-block">
            <p class="control-title">场景音</p>
            <div class="noise-button-grid scene-grid">
              <el-button
                v-for="item in sceneNoiseOptions"
                :key="item.value"
                :type="noiseType === item.value ? 'primary' : 'default'"
                plain
                @click="setNoiseType(item.value)"
              >
                {{ item.label }}
              </el-button>
            </div>
          </div>

          <p class="selected-noise">当前声音：{{ currentNoiseLabel }}</p>

          <div class="volume-row">
            <span>音量</span>
            <el-slider v-model="noiseVolume" :min="0" :max="100" />
            <span>{{ noiseVolume }}%</span>
          </div>

          <div class="card-actions two-cols">
            <el-button type="primary" @click="toggleNoise">
              <el-icon><component :is="noisePlaying ? VideoPause : VideoPlay" /></el-icon>
              {{ noisePlaying ? '停止播放' : '开始播放' }}
            </el-button>
            <el-button @click="pickRandomScene">
              <el-icon><RefreshRight /></el-icon>
              随机场景
            </el-button>
          </div>
        </div>
      </el-card>

      <el-card class="training-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-icon breath">
              <el-icon><Promotion /></el-icon>
            </span>
            <h3>呼吸训练</h3>
          </div>
        </template>

        <div class="breathing-controls">
          <p class="control-title">训练模式</p>
          <div class="mode-grid">
            <el-button
              v-for="(mode, key) in breathingModes"
              :key="key"
              :type="selectedBreathingMode === key ? 'primary' : 'default'"
              plain
              @click="selectedBreathingMode = key"
            >
              {{ mode.shortName }}
            </el-button>
          </div>

          <div class="mode-info">
            <h4>{{ currentMode.name }}</h4>
            <p>{{ currentMode.description }}</p>
            <p class="mode-scene">适合场景：{{ currentMode.scene }}</p>
          </div>

          <div class="breathing-stage" :class="phaseClass">
            <div class="breathing-sphere" :class="[phaseClass, { running: breathingRunning }]">
              <span class="breathing-aura aura-1"></span>
              <span class="breathing-aura aura-2"></span>
              <span class="breathing-aura aura-3"></span>
              <div class="breathing-circle" :style="{ transform: `scale(${circleScale})` }">
                {{ currentPhase.label }}
              </div>
            </div>
            <p class="phase-text">{{ phaseHint }} · 剩余 {{ phaseTimeLeft }} 秒</p>
            <p class="cycle-text">已完成 {{ cycleCount }} 轮</p>
          </div>

          <div class="card-actions">
            <el-button type="primary" @click="startBreathing" :disabled="breathingRunning">
              <el-icon><VideoPlay /></el-icon>
              开始
            </el-button>
            <el-button @click="pauseBreathing" :disabled="!breathingRunning">
              <el-icon><VideoPause /></el-icon>
              暂停
            </el-button>
            <el-button @click="resetBreathing">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Timer, Headset, Promotion, VideoPause, VideoPlay, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { localStorageUtil, STORAGE_KEYS } from '@/utils/storage'

const authStore = useAuthStore()
const RELAX_STATS_KEY = STORAGE_KEYS.RELAX_STATS

const createDefaultRelaxStats = () => ({
  meditationDurationSeconds: 0,
  meditationSessions: 0,
  noisePlayCount: 0,
  noiseByType: {},
  breathingSessions: 0,
  breathingByType: {}
})

const getCurrentUserId = () => String(authStore.user?.id || 'default')

const updateRelaxStats = (updater) => {
  const statsMap = localStorageUtil.get(RELAX_STATS_KEY) || {}
  const userId = getCurrentUserId()
  const savedStats = statsMap[userId] || {}

  const current = {
    ...createDefaultRelaxStats(),
    ...savedStats,
    noiseByType: { ...(savedStats.noiseByType || {}) },
    breathingByType: { ...(savedStats.breathingByType || {}) }
  }

  updater(current)
  statsMap[userId] = current
  localStorageUtil.set(RELAX_STATS_KEY, statsMap)
}

const meditationPresets = [1, 3, 5, 10, 15, 20]
const selectedMinutes = ref(10)
const remainingSeconds = ref(selectedMinutes.value * 60)
const meditationRunning = ref(false)
const meditationFinished = ref(false)
const meditationSessionLoggedSeconds = ref(0)
let meditationTimer = null

const formattedMeditationTime = computed(() => {
  const minutes = String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')
  const seconds = String(remainingSeconds.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const setMeditationPreset = (minutes) => {
  flushMeditationProgress()
  selectedMinutes.value = minutes
  resetMeditation(true)
}

const flushMeditationProgress = () => {
  const totalSeconds = selectedMinutes.value * 60
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds.value)
  const delta = elapsedSeconds - meditationSessionLoggedSeconds.value

  if (delta <= 0) {
    return
  }

  updateRelaxStats((stats) => {
    stats.meditationDurationSeconds = Number(stats.meditationDurationSeconds || 0) + delta
  })

  meditationSessionLoggedSeconds.value = elapsedSeconds
}

const playBell = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = 830
  gainNode.gain.value = 0.15

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.35)

  setTimeout(() => {
    audioContext.close()
  }, 450)
}

const startMeditation = () => {
  if (meditationRunning.value) return
  meditationFinished.value = false

  if (remainingSeconds.value <= 0) {
    remainingSeconds.value = selectedMinutes.value * 60
  }

  if (remainingSeconds.value === selectedMinutes.value * 60) {
    meditationSessionLoggedSeconds.value = 0
  }

  meditationRunning.value = true
  meditationTimer = window.setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1
      return
    }

    pauseMeditation()
    meditationFinished.value = true
    updateRelaxStats((stats) => {
      stats.meditationSessions = Number(stats.meditationSessions || 0) + 1
    })
    playBell()
    ElMessage.success('冥想计时结束')
  }, 1000)
}

const pauseMeditation = () => {
  flushMeditationProgress()
  meditationRunning.value = false
  if (meditationTimer) {
    clearInterval(meditationTimer)
    meditationTimer = null
  }
}

const resetMeditation = (skipFlush = false) => {
  if (!skipFlush) {
    flushMeditationProgress()
  }
  meditationRunning.value = false
  if (meditationTimer) {
    clearInterval(meditationTimer)
    meditationTimer = null
  }
  meditationFinished.value = false
  meditationSessionLoggedSeconds.value = 0
  remainingSeconds.value = selectedMinutes.value * 60
}

const basicNoiseOptions = [
  { value: 'white', label: '白噪音' },
  { value: 'pink', label: '粉噪音' },
  { value: 'brown', label: '棕噪音' }
]

const sceneNoiseOptions = [
  { value: 'rain', label: '雨声' },
  { value: 'thunder', label: '雷声' },
  { value: 'farm', label: '农场' },
  { value: 'night', label: '夜晚' },
  { value: 'forest', label: '森林' },
  { value: 'leaves', label: '落叶' },
  { value: 'river', label: '河流' },
  { value: 'fire', label: '篝火' },
  { value: 'seaside', label: '海边' },
  { value: 'yacht', label: '帆船' },
  { value: 'coffee', label: '咖啡厅' },
  { value: 'train', label: '火车' }
]

const noiseFileMap = {
  rain: '/audio/relax/rain.mp3',
  thunder: '/audio/relax/thunder.mp3',
  farm: '/audio/relax/farm.mp3',
  night: '/audio/relax/night.mp3',
  forest: '/audio/relax/forest.mp3',
  leaves: '/audio/relax/leaves.mp3',
  river: '/audio/relax/river.mp3',
  fire: '/audio/relax/fire.mp3',
  seaside: '/audio/relax/seaside.mp3',
  yacht: '/audio/relax/yacht.mp3',
  coffee: '/audio/relax/coffee.mp3',
  train: '/audio/relax/train.mp3'
}

const noiseType = ref('white')
const noiseVolume = ref(35)
const noisePlaying = ref(false)
let noiseSource = null
let noiseGain = null
let audioContext = null
let noiseAudio = null

const currentNoiseLabel = computed(() => {
  const allOptions = [...basicNoiseOptions, ...sceneNoiseOptions]
  return allOptions.find((item) => item.value === noiseType.value)?.label || '白噪音'
})

const getOrCreateAudioContext = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  return audioContext
}

const createNoiseBuffer = (context, type) => {
  const bufferSize = context.sampleRate * 2
  const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate)
  const output = noiseBuffer.getChannelData(0)

  let p0 = 0
  let p1 = 0
  let p2 = 0
  let p3 = 0
  let p4 = 0
  let p5 = 0
  let p6 = 0
  let brownState = 0

  for (let i = 0; i < bufferSize; i += 1) {
    const white = Math.random() * 2 - 1
    p0 = 0.99886 * p0 + white * 0.0555179
    p1 = 0.99332 * p1 + white * 0.0750759
    p2 = 0.969 * p2 + white * 0.153852
    p3 = 0.8665 * p3 + white * 0.3104856
    p4 = 0.55 * p4 + white * 0.5329522
    p5 = -0.7616 * p5 - white * 0.016898
    const pink = (p0 + p1 + p2 + p3 + p4 + p5 + p6 + white * 0.5362) * 0.11
    p6 = white * 0.115926

    brownState = (brownState + 0.02 * white) / 1.02
    const brown = brownState * 3.5 * 0.1

    let sample = 0

    switch (type) {
      case 'white':
        sample = white * 0.35
        break
      case 'pink':
        sample = pink
        break
      case 'brown':
        sample = brown
        break
      default:
        sample = pink
    }

    output[i] = Math.max(-1, Math.min(1, sample))
  }

  return noiseBuffer
}

const setNoiseType = (type) => {
  noiseType.value = type
}

const stopNoise = () => {
  if (noiseAudio) {
    noiseAudio.pause()
    noiseAudio.currentTime = 0
    noiseAudio = null
  }

  if (noiseSource) {
    try {
      noiseSource.stop()
    } catch {
      // ignore repeated stop in fast toggles
    }
    noiseSource.disconnect()
    noiseSource = null
  }

  noisePlaying.value = false
}

const trackNoisePlay = (type) => {
  updateRelaxStats((stats) => {
    stats.noisePlayCount = Number(stats.noisePlayCount || 0) + 1
    stats.noiseByType[type] = Number(stats.noiseByType[type] || 0) + 1
  })
}

const startSynthNoise = async () => {
  const context = await getOrCreateAudioContext()

  const source = context.createBufferSource()
  const gainNode = context.createGain()

  source.buffer = createNoiseBuffer(context, noiseType.value)
  source.loop = true
  gainNode.gain.value = noiseVolume.value / 100

  source.connect(gainNode)
  gainNode.connect(context.destination)
  source.start(0)

  noiseSource = source
  noiseGain = gainNode
  noisePlaying.value = true
}

const startNoise = async (trackUsage = false) => {
  if (trackUsage) {
    trackNoisePlay(noiseType.value)
  }

  stopNoise()

  const audioPath = noiseFileMap[noiseType.value]
  if (audioPath) {
    const audio = new Audio(audioPath)
    audio.loop = true
    audio.volume = noiseVolume.value / 100

    try {
      await audio.play()
      noiseAudio = audio
      noisePlaying.value = true
      return
    } catch (error) {
      ElMessage.warning('本地音频播放失败，已切换为合成噪音')
    }
  }

  await startSynthNoise()
}

const toggleNoise = async () => {
  if (noisePlaying.value) {
    stopNoise()
    return
  }
  await startNoise(true)
}

const pickRandomScene = async () => {
  const randomIndex = Math.floor(Math.random() * sceneNoiseOptions.length)
  noiseType.value = sceneNoiseOptions[randomIndex].value
  if (noisePlaying.value) {
    await startNoise(false)
  }
}

watch(noiseVolume, (value) => {
  if (noiseGain) {
    noiseGain.gain.value = value / 100
  }

  if (noiseAudio) {
    noiseAudio.volume = value / 100
  }
})

watch(noiseType, async () => {
  if (noisePlaying.value) {
    await startNoise(false)
  }
})

const breathingModes = {
  box: {
    shortName: '方形呼吸',
    name: '方形呼吸 4-4-4-4',
    description: '均衡吸气、停留、呼气、停留，帮助快速建立稳定节律。',
    scene: '会议前紧张、需要迅速平稳心率时',
    phases: [
      { type: 'inhale', label: '吸气', duration: 4 },
      { type: 'hold', label: '屏息', duration: 4 },
      { type: 'exhale', label: '呼气', duration: 4 },
      { type: 'hold', label: '停留', duration: 4 }
    ]
  },
  calm: {
    shortName: '478 助眠',
    name: '478 呼吸法 4-7-8',
    description: '延长呼气时间，降低唤醒水平，适合入睡前安抚神经。',
    scene: '睡前难以放松、焦虑反复时',
    phases: [
      { type: 'inhale', label: '吸气', duration: 4 },
      { type: 'hold', label: '屏息', duration: 7 },
      { type: 'exhale', label: '呼气', duration: 8 }
    ]
  },
  balanced: {
    shortName: '共振呼吸',
    name: '共振呼吸 5-0-5-0',
    description: '均匀吸呼，节奏舒缓，利于长期专注与情绪稳定。',
    scene: '学习、写作或长时间工作中保持专注时',
    phases: [
      { type: 'inhale', label: '吸气', duration: 5 },
      { type: 'exhale', label: '呼气', duration: 5 }
    ]
  },
  release: {
    shortName: '缓压呼吸',
    name: '缓压呼吸 3-3-6',
    description: '短吸气、短停留、长呼气，帮助快速释放压迫感。',
    scene: '情绪上头、心跳偏快、想快速降压时',
    phases: [
      { type: 'inhale', label: '吸气', duration: 3 },
      { type: 'hold', label: '停留', duration: 3 },
      { type: 'exhale', label: '呼气', duration: 6 }
    ]
  }
}

const selectedBreathingMode = ref('box')
const phaseIndex = ref(0)
const phaseTimeLeft = ref(breathingModes.box.phases[0].duration)
const cycleCount = ref(0)
const breathingRunning = ref(false)
let breathingTimer = null

const currentMode = computed(() => breathingModes[selectedBreathingMode.value])
const currentPhase = computed(() => currentMode.value.phases[phaseIndex.value])

const phaseHint = computed(() => {
  if (currentPhase.value.type === 'inhale') return '缓慢吸气，感受腹部鼓起'
  if (currentPhase.value.type === 'exhale') return '慢慢呼气，释放紧张感'
  return '保持稳定，不要耸肩'
})

const phaseClass = computed(() => `phase-${currentPhase.value.type}`)

const circleScale = computed(() => {
  if (currentPhase.value.type === 'inhale') return 1.1
  if (currentPhase.value.type === 'exhale') return 0.86
  return 1
})

const goToNextPhase = () => {
  const next = phaseIndex.value + 1

  if (next >= currentMode.value.phases.length) {
    phaseIndex.value = 0
    cycleCount.value += 1
  } else {
    phaseIndex.value = next
  }

  phaseTimeLeft.value = currentMode.value.phases[phaseIndex.value].duration
}

const startBreathing = () => {
  if (breathingRunning.value) return
  breathingRunning.value = true

  updateRelaxStats((stats) => {
    stats.breathingSessions = Number(stats.breathingSessions || 0) + 1
    const modeKey = selectedBreathingMode.value
    stats.breathingByType[modeKey] = Number(stats.breathingByType[modeKey] || 0) + 1
  })

  breathingTimer = window.setInterval(() => {
    if (phaseTimeLeft.value > 1) {
      phaseTimeLeft.value -= 1
      return
    }

    goToNextPhase()
  }, 1000)
}

const pauseBreathing = () => {
  breathingRunning.value = false
  if (breathingTimer) {
    clearInterval(breathingTimer)
    breathingTimer = null
  }
}

const resetBreathing = () => {
  pauseBreathing()
  phaseIndex.value = 0
  cycleCount.value = 0
  phaseTimeLeft.value = currentMode.value.phases[0].duration
}

watch(selectedBreathingMode, () => {
  resetBreathing()
})

onBeforeUnmount(async () => {
  pauseMeditation()
  pauseBreathing()
  stopNoise()

  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close()
  }
})
</script>

<style scoped lang="scss">
.relax-training {
  display: grid;
  gap: 16px;
}

.training-hero {
  border: none;
  background: linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%);

  :deep(.el-card__body) {
    padding: 18px 22px;
  }

  .hero-content {
    min-height: 62px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;

    h2 {
      margin: 0;
      font-size: 25px;
      color: #0f172a;
    }

    p {
      margin: 0;
      color: #475569;
      font-size: 14px;
      line-height: 1.6;
    }
  }
}

.training-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.training-card {
  border: 1px solid rgba(191, 219, 254, 0.7);

  :deep(.el-card__header) {
    min-height: 60px;
    display: flex;
    align-items: center;
    padding: 14px 18px;
  }

  :deep(.el-card__body) {
    padding: 16px 18px 18px;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;

  h3 {
    margin: 0;
    font-size: 17px;
    color: #1e293b;
  }
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;

  &.timer {
    background: #eaf2ff;
    color: #2563eb;
  }

  &.noise {
    background: #edfdf4;
    color: #16a34a;
  }

  &.breath {
    background: #fff7ed;
    color: #ea580c;
  }
}

.timer-visual-wrap {
  position: relative;
  margin: 8px 0 14px;
  min-height: 198px;
  border-radius: 18px;
  border: 1px solid rgba(147, 197, 253, 0.55);
  background: radial-gradient(circle at 30% 20%, #f1f8ff 0%, #edf7f3 55%, #e6f1ff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.timer-orbit {
  position: absolute;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  border: 2px dashed rgba(96, 165, 250, 0.28);
  opacity: 0.8;
}

.timer-display {
  position: relative;
  z-index: 1;
  font-size: 72px;
  line-height: 1;
  font-weight: 800;
  text-align: center;
  letter-spacing: 2px;
  color: #0f172a;
  text-shadow: 0 4px 18px rgba(15, 23, 42, 0.12);
}

.timer-status {
  position: relative;
  z-index: 1;
  margin: 10px 0 0;
  font-size: 13px;
  color: #475569;
}

.timer-visual-wrap.running .timer-orbit {
  animation: orbitRotate 10s linear infinite;
}

.timer-visual-wrap.running .timer-display {
  animation: timerPulse 2s ease-in-out infinite;
}

.timer-visual-wrap.warning {
  border-color: rgba(248, 113, 113, 0.6);
  background: radial-gradient(circle at 30% 20%, #fff4f4 0%, #fff8ed 55%, #fff2f2 100%);
}

.timer-visual-wrap.warning .timer-display {
  color: #dc2626;
  animation: timerWarning 0.62s ease-in-out infinite;
}

.timer-visual-wrap.finished {
  border-color: rgba(34, 197, 94, 0.55);
  background: radial-gradient(circle at 30% 20%, #f0fdf4 0%, #ecfeff 58%, #effff2 100%);
}

.timer-visual-wrap.finished .timer-display {
  color: #059669;
  animation: timerDone 0.9s ease-out;
}

.control-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.preset-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  :deep(.el-button) {
    width: 100%;
    height: 40px;
    border-radius: 10px;
    margin: 0;
    padding: 0 8px;
  }

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  :deep(.el-button > span) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.timer-alert {
  margin-top: 12px;
}

.noise-controls {
  display: grid;
  gap: 14px;
}

.noise-options-block {
  display: grid;
  gap: 8px;
}

.noise-button-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  :deep(.el-button) {
    width: 100%;
    height: 40px;
    margin: 0;
    border-radius: 10px;
    padding: 0 6px;
  }

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  :deep(.el-button > span) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.scene-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.selected-noise {
  margin: -4px 0 0;
  font-size: 13px;
  color: #475569;
}

.volume-row {
  display: grid;
  grid-template-columns: 40px 1fr 44px;
  align-items: center;
  gap: 10px;
  color: #334155;
  font-size: 14px;
}

.breathing-controls {
  display: grid;
  gap: 14px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  :deep(.el-button) {
    width: 100%;
    height: 40px;
    margin: 0;
    border-radius: 10px;
  }

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }

  :deep(.el-button > span) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.mode-info {
  margin-top: -2px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(191, 219, 254, 0.7);
  background: linear-gradient(135deg, #f8fbff 0%, #f4faf6 100%);

  h4 {
    margin: 0 0 4px;
    font-size: 15px;
    color: #1e293b;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #475569;
    line-height: 1.55;
  }

  .mode-scene {
    margin-top: 4px;
    color: #334155;
    font-weight: 500;
  }
}

.breathing-stage {
  border-radius: 14px;
  border: 1px solid rgba(191, 219, 254, 0.7);
  background: linear-gradient(135deg, #f8fbff 0%, #f4fbf8 100%);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;

  &.phase-inhale {
    background: linear-gradient(135deg, #ecfeff 0%, #eefaf4 100%);
  }

  &.phase-exhale {
    background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%);
  }

  &.phase-hold {
    background: linear-gradient(135deg, #fff7ed 0%, #fefce8 100%);
  }
}

.breathing-sphere {
  width: 164px;
  height: 164px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breathing-aura {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(96, 165, 250, 0.35);
  opacity: 0;
}

.breathing-sphere.running .breathing-aura {
  animation: breathingWave 2.8s ease-out infinite;
}

.breathing-sphere.running .aura-2 {
  animation-delay: 0.9s;
}

.breathing-sphere.running .aura-3 {
  animation-delay: 1.8s;
}

.breathing-circle {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  background: radial-gradient(circle at 30% 30%, #dbeafe, #93c5fd);
  transition: transform 0.9s ease, box-shadow 0.45s ease, background 0.45s ease;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.25);
}

.breathing-sphere.phase-inhale .breathing-circle {
  background: radial-gradient(circle at 30% 30%, #ccfbf1, #5eead4);
  box-shadow: 0 10px 30px rgba(20, 184, 166, 0.28);
}

.breathing-sphere.phase-hold .breathing-circle {
  background: radial-gradient(circle at 30% 30%, #fde68a, #fbbf24);
  box-shadow: 0 10px 30px rgba(245, 158, 11, 0.26);
}

.breathing-sphere.phase-exhale .breathing-circle {
  background: radial-gradient(circle at 30% 30%, #bfdbfe, #60a5fa);
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.28);
}

.phase-text,
.cycle-text {
  margin: 0;
  color: #475569;
  font-size: 14px;
}

.card-actions {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  &.two-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.el-button) {
    width: 100%;
    height: 40px;
    margin: 0;
    border-radius: 10px;
  }
}

@keyframes orbitRotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes timerPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes timerWarning {
  0%,
  100% {
    transform: scale(1);
    text-shadow: 0 4px 18px rgba(220, 38, 38, 0.22);
  }
  50% {
    transform: scale(1.09);
    text-shadow: 0 6px 22px rgba(220, 38, 38, 0.35);
  }
}

@keyframes timerDone {
  0% {
    transform: scale(0.85);
    opacity: 0.6;
  }
  65% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

@keyframes breathingWave {
  0% {
    transform: scale(0.82);
    opacity: 0.42;
  }
  70% {
    opacity: 0.1;
  }
  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .training-hero :deep(.el-card__body) {
    padding: 14px;
  }

  .training-grid {
    grid-template-columns: 1fr;
  }

  .timer-visual-wrap {
    min-height: 170px;
  }

  .timer-orbit {
    width: 210px;
    height: 210px;
  }

  .timer-display {
    font-size: 56px;
  }

  .preset-group,
  .noise-button-grid,
  .card-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-actions.two-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .breathing-circle {
    width: 108px;
    height: 108px;
    font-size: 18px;
  }

  .breathing-sphere {
    width: 140px;
    height: 140px;
  }
}
</style>
