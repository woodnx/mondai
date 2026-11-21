<script setup lang="ts">
import SpeechBalloon from './SpeechBalloon.vue';
import type { QuizContent } from './quizContent';

defineProps<{ content: QuizContent }>();
</script>

<template>
  <div class="grid min-w-0 content-start gap-3 p-6 sm:p-8">
    <p class="quiz-no theme-muted">No. {{ content.no }}</p>
    <p class="quiz-question min-h-40 pb-3 break-all">Q. {{ content.question }}</p>
    <div class="grid justify-items-end gap-1">
      <p class="quiz-answer break-all">A. {{ content.answer }}</p>
      <p v-if="content.criteria" class="quiz-criteria theme-muted break-all text-right">
        {{ content.criteria }}
      </p>
    </div>
    <div class="theme-divider mt-2 grid grid-cols-2 gap-x-8 gap-y-3 pt-4">
      <!-- 作問者は常に左、相方は右 -->
      <div class="flex min-w-0 flex-col items-start gap-3">
        <p v-if="content.author" class="quiz-person">作問: {{ content.author }}</p>
        <SpeechBalloon v-if="content.comment" side="left">{{ content.comment }}</SpeechBalloon>
      </div>
      <div class="flex min-w-0 flex-col items-end gap-3 text-right">
        <p v-if="content.partners.length" class="quiz-person">
          相方: {{ content.partners.join('・') }}
        </p>
        <SpeechBalloon v-if="content.partnerComment" side="right">
          {{ content.partnerComment }}
        </SpeechBalloon>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 画面の横幅に合わせて文字を大きくする（全画面でも大きく見えるように） */
.quiz-no {
  font-size: clamp(1.25rem, 1.6vw, 2.25rem);
}
.quiz-question {
  font-size: clamp(1.5rem, 2.5vw, 3.75rem);
  line-height: 1.4;
}
.quiz-answer {
  /* 問題文と同じ大きさ */
  font-size: clamp(1.5rem, 2.5vw, 3.75rem);
}
.quiz-criteria {
  /* 答えの下に小さく薄く表示する */
  font-size: clamp(1.25rem, 1.9vw, 2.75rem);
  line-height: 1.4;
  white-space: pre-line;
  opacity: 0.8;
}
.quiz-person {
  font-size: clamp(1.25rem, 1.9vw, 2.75rem);
}
</style>
