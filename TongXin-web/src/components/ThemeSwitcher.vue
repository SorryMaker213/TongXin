<template>
  <div class="theme-switcher" aria-label="主题色切换">
    <button
      v-for="theme in themes"
      :key="theme.key"
      type="button"
      class="theme-dot"
      :class="{ active: currentTheme === theme.key, night: theme.key === 'night' }"
      :style="{ '--dot-bg': theme.swatch }"
      :title="theme.label"
      @click="switchTheme(theme.key)"
    >
      <span class="sr-only">{{ theme.label }}</span>
    </button>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { THEME_LIST, applyTheme, getThemeKey } from '@/utils/theme'

const themes = THEME_LIST
const currentTheme = ref(getThemeKey())

const onThemeChanged = (event) => {
  currentTheme.value = event.detail || getThemeKey()
}

const switchTheme = (themeKey) => {
  applyTheme(themeKey, true)
  currentTheme.value = themeKey
}

onMounted(() => {
  window.addEventListener('app-theme-change', onThemeChanged)
})

onBeforeUnmount(() => {
  window.removeEventListener('app-theme-change', onThemeChanged)
})
</script>

<style scoped lang="scss">
.theme-switcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(6px);
}

.theme-dot {
  position: relative;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: var(--dot-bg);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.75) inset;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.theme-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid transparent;
  transition: border-color 0.22s ease;
}

.theme-dot:hover {
  transform: translateY(-1px) scale(1.08);
}

.theme-dot.active {
  transform: scale(1.15);
  box-shadow: 0 0 14px rgba(255, 255, 255, 0.7);
}

.theme-dot.active::after {
  border-color: rgba(15, 23, 42, 0.42);
  animation: pulse-ring 1.4s ease-in-out infinite;
}

.theme-dot.night {
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.45) inset;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  70% {
    transform: scale(1.25);
    opacity: 0;
  }
  100% {
    transform: scale(1.25);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .theme-switcher {
    gap: 6px;
    padding: 6px 8px;
  }

  .theme-dot {
    width: 14px;
    height: 14px;
  }
}
</style>
