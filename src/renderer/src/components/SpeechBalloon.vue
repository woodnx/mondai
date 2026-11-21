<script setup lang="ts">
withDefaults(defineProps<{ side?: 'left' | 'right' }>(), { side: 'left' });
</script>

<template>
  <div class="speech-bubble rounded-md px-5 py-3" :class="`speech-bubble-${side}`">
    <slot></slot>
  </div>
</template>

<style>
.speech-bubble {
  position: relative;
  display: inline-block;
  max-width: 100%;
  overflow-wrap: anywhere;
  white-space: pre-line;
  text-align: left;
  font-size: clamp(1.25rem, 1.75vw, 2.5rem);
  color: var(--theme-bubble-text);
  background: var(--theme-bubble);
}

/* 発言者の側の下の角から出る小さなしっぽ */
.speech-bubble::after {
  content: '';
  position: absolute;
  bottom: 0;
  border-style: solid;
  border-color: transparent;
}

.speech-bubble-left::after {
  left: 0;
  border-width: 0 0 10px 12px;
  border-bottom-color: var(--theme-bubble);
  translate: -100% 0;
}

.speech-bubble-right::after {
  right: 0;
  border-width: 0 12px 10px 0;
  border-bottom-color: var(--theme-bubble);
  translate: 100% 0;
}
</style>
