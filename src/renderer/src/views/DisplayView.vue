<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watchEffect } from 'vue';
import ShowQuiz from '../components/ShowQuiz.vue';
import { applyTheme } from '../utils/theme';
import type { DisplayState } from '../../../shared/display';

const state = ref<DisplayState | null>(null);
let unsubscribe: (() => void) | null = null;

function receive(next: DisplayState | null): void {
  state.value = next;
  if (next) applyTheme(next.themeMode, next.themeColor);
}

watchEffect(() => {
  document.title = state.value?.title ? `${state.value.title} - 表示` : 'mondai - 問題表示';
});

onMounted(async () => {
  unsubscribe = window.api.display.onState(receive);
  receive(await window.api.display.getState());
});

onBeforeUnmount(() => unsubscribe?.());
</script>

<template>
  <div class="flex h-screen w-full min-w-0 flex-col overflow-hidden">
    <header v-if="state?.title" class="theme-header shrink-0 px-6 py-4 sm:px-10">
      <h1 class="display-title truncate">{{ state.title }}</h1>
    </header>
    <!-- 余白を残してウィンドウいっぱいに問題を表示する -->
    <main class="flex min-h-0 w-full min-w-0 flex-1 p-6 sm:p-10">
      <div class="flex min-h-0 w-full min-w-0 flex-1">
        <ShowQuiz
          v-if="state?.quiz"
          :no="state.no"
          :question="state.quiz.question"
          :answer="state.quiz.answer"
          :author="state.quiz.author"
          :comment="state.quiz.comment"
          :partners="state.quiz.partners ?? []"
          :partner-comment="state.quiz.partnerComment ?? ''"
          :flipped="state.flipped"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.display-title {
  font-size: clamp(1.5rem, 2.1vw, 3rem);
}
</style>
