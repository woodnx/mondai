<script setup lang="ts">
import { motion } from 'motion-v';
import SpeechBalloon from './SpeechBalloon.vue';

defineProps<{
  no: number;
  question: string;
  answer: string;
  author: string;
  comment?: string;
  partners: string[];
  partnerComment?: string;
  flipped: boolean;
}>();
</script>

<template>
  <div class="flip-wrapper">
    <motion.div
      class="flip-inner"
      :animate="{ rotateY: flipped ? 180 : 0 }"
      :transition="{ duration: 0.6, ease: 'easeInOut' }"
    >
      <div class="face face-front">
        <div class="grid gap-3 p-6 sm:p-8">
          <p class="quiz-no theme-muted">No. {{ no }}</p>
          <p class="quiz-question min-h-40 pb-3 break-all">Q. {{ question }}</p>
          <p class="quiz-answer justify-self-end break-all">A. {{ answer }}</p>
          <div class="theme-divider mt-2 grid grid-cols-2 gap-x-8 gap-y-3 pt-4">
            <!-- 作問者は常に左、相方は右 -->
            <div class="flex min-w-0 flex-col items-start gap-3">
              <p v-if="author" class="quiz-person">作問: {{ author }}</p>
              <SpeechBalloon v-if="comment" side="left">{{ comment }}</SpeechBalloon>
            </div>
            <div class="flex min-w-0 flex-col items-end gap-3 text-right">
              <p v-if="partners.length" class="quiz-person">相方: {{ partners.join('・') }}</p>
              <SpeechBalloon v-if="partnerComment" side="right">{{ partnerComment }}</SpeechBalloon>
            </div>
          </div>
        </div>
      </div>
      <div class="face face-back" aria-hidden="true"></div>
    </motion.div>
  </div>
</template>

<style scoped>
.flip-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  perspective: 1000px;
}
.flip-inner {
  display: grid;
  flex: 1;
  width: 100%;
  min-height: 0;
  transform-style: preserve-3d;
}
.face {
  grid-area: 1 / 1;
  width: 100%;
  min-width: 0;
  min-height: 0;
  /* 問題が長くて収まらないときはカード内でスクロールする */
  overflow-y: auto;
  border-radius: 1.2rem;
  background: color-mix(in srgb, var(--theme-surface) 80%, transparent);
  border: 1px solid var(--theme-border);
  backdrop-filter: blur(4px);
  color: var(--theme-text);
  backface-visibility: hidden;
  overflow-wrap: anywhere;
}
/* 画面の横幅に合わせて文字を大きくする（全画面でも大きく見えるように） */
.quiz-no {
  font-size: clamp(1.25rem, 1.6vw, 2.25rem);
}
.quiz-question {
  font-size: clamp(1.75rem, 2.9vw, 4.25rem);
  line-height: 1.4;
}
.quiz-answer {
  /* 問題文と同じ大きさ */
  font-size: clamp(1.75rem, 2.9vw, 4.25rem);
}
.quiz-person {
  font-size: clamp(1.25rem, 1.9vw, 2.75rem);
}
.face-back {
  transform: rotateY(180deg);
}
</style>
