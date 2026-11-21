<script setup lang="ts">
import ControlView from './views/ControlView.vue';
import DisplayView from './views/DisplayView.vue';

// メインプロセスが URL のハッシュで画面を指定する（#control / #display）
const view = window.location.hash === '#display' ? 'display' : 'control';
</script>

<template>
  <DisplayView v-if="view === 'display'" />
  <ControlView v-else />
</template>
