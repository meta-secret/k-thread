<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
  }>(),
  { size: 28 },
)
</script>

<template>
  <svg
    class="brand-mark"
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    <rect width="32" height="32" fill="#0a0a0c" />
    <path d="M9 6v20" stroke="#f4f4f6" stroke-width="2.2" stroke-linecap="square" />
    <path
      d="M9 16C15 15 18 10 23 7"
      stroke="#f4f4f6"
      stroke-width="2.2"
      stroke-linecap="square"
    />
    <path
      d="M9 16C15 17 18 22 23 25"
      stroke="#f4f4f6"
      stroke-width="2.2"
      stroke-linecap="square"
    />
    <circle cx="9" cy="16" r="2.4" fill="#0a0a0c" stroke="#f4f4f6" stroke-width="1.6" />
    <circle cx="23" cy="7" r="2.2" fill="#ff2a2a" />
    <circle cx="23" cy="25" r="2.2" fill="#f4f4f6" />
    <path d="M27 3h3M28.5 1.5v3" stroke="#ff2a2a" stroke-width="1.2" />
  </svg>
</template>

<style scoped>
.brand-mark {
  display: block;
  flex-shrink: 0;
  box-shadow: 0 0 0 1px #111;
}
</style>
