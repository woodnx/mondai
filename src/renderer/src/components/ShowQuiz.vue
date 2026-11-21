<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { motion } from 'motion-v';
import QuizFace from './QuizFace.vue';
import { quizContentKey, type QuizContent } from './quizContent';
import type { QuizTransition } from '../../../shared/display';

const props = defineProps<
  QuizContent & {
    flipped: boolean;
    transition: QuizTransition;
  }
>();

/**
 * 回転：カードを 1 回転させ、半分回った（裏面が見えている）ところで表の中身を差し替える。
 * 軽い回転：カードを 180° ずつ回し、見えていない側の面に次の内容を置いておく。
 */
const isSpin = computed(() => props.transition === 'flip');
const isHalf = computed(() => props.transition === 'flip-light');
const isFlip = computed(() => isSpin.value || isHalf.value);

const spinSeconds = 1;
const halfSeconds = 0.45;

const snapshot = (): QuizContent => ({
  no: props.no,
  question: props.question,
  answer: props.answer,
  criteria: props.criteria,
  author: props.author,
  comment: props.comment,
  partners: [...props.partners],
  partnerComment: props.partnerComment
});

/** 表面に出している内容（回転では回りきる途中で差し替える） */
const shown = ref<QuizContent>(snapshot());
const spinning = ref(false);
/** 回転で、これまでに回した回数（角度を足し続けて毎回同じ向きに回す） */
const spins = ref(0);
/** 軽い回転で、これまでに回した半回転の数。偶数なら表面、奇数なら裏面が見えている */
const halves = ref(0);
/** 軽い回転で各面に置いている内容（null は何も書いていない面） */
const halfFront = ref<QuizContent | null>(null);
const halfBack = ref<QuizContent | null>(null);
/** 方式を切り替えた直後は、角度の差をアニメーションせずに合わせる */
const instant = ref(false);
let spinId = 0;

function resetHalf(): void {
  halves.value = props.flipped ? 1 : 0;
  halfFront.value = props.flipped ? null : snapshot();
  halfBack.value = null;
}
resetHalf();

/** 軽い回転で、見えていない側の面に内容を置いてから 180° 回す */
function turnHalf(next: QuizContent | null): void {
  if (halves.value % 2 === 0) halfBack.value = next;
  else halfFront.value = next;
  halves.value += 1;
}

const wait = (seconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

watch(
  () => quizContentKey(snapshot()),
  async () => {
    const id = ++spinId;
    if (isHalf.value) {
      // 隠しているあいだは、見せるときに最新の内容を置く
      if (!props.flipped) turnHalf(snapshot());
      return;
    }
    if (!isSpin.value || props.flipped) {
      spinning.value = false;
      shown.value = snapshot();
      return;
    }
    spinning.value = true;
    spins.value += 1;
    await wait(spinSeconds / 2);
    if (id !== spinId) return;
    shown.value = snapshot();
    // 残り半周が終わるまでは「1 回転中」の速さのままにする
    await wait(spinSeconds / 2);
    if (id !== spinId) return;
    spinning.value = false;
  }
);

watch(
  () => props.flipped,
  (hidden) => {
    if (isHalf.value) turnHalf(hidden ? null : snapshot());
  }
);

watch(
  () => props.transition,
  async () => {
    spinId += 1;
    spinning.value = false;
    instant.value = true;
    spins.value = 0;
    shown.value = snapshot();
    resetHalf();
    await nextTick();
    requestAnimationFrame(() => (instant.value = false));
  }
);

const angle = computed(() => {
  if (isHalf.value) return halves.value * 180;
  if (isSpin.value) return spins.value * 360 + (props.flipped ? 180 : 0);
  return 0;
});

const flipTransition = computed(() => {
  if (instant.value) return { duration: 0 };
  if (isSpin.value) {
    return { duration: spinning.value ? spinSeconds : 0.6, ease: 'easeInOut' as const };
  }
  if (isHalf.value) return { duration: halfSeconds, ease: 'easeInOut' as const };
  return { duration: 0 };
});

const frontContent = computed<QuizContent | null>(() => {
  if (isHalf.value) return halfFront.value;
  // 回転では裏返しても表の中身は残す（裏面が見えているので隠れる）
  if (isSpin.value) return shown.value;
  // フェード系では答えを隠すと中身を消し、カードの枠だけを残す
  return props.flipped ? null : shown.value;
});
const backContent = computed(() => (isHalf.value ? halfBack.value : null));

const fadeName = computed(() => `quiz-${props.transition}`);
const useCss = computed(() => !isFlip.value && props.transition !== 'none');
// CSS を使わない方式（回転・なし）で out-in にすると、退場が同期的に終わって
// 次の問題が描画されなくなるため、そのときは mode を付けずに即座に入れ替える
const fadeMode = computed(() =>
  useCss.value && props.transition !== 'crossfade' ? 'out-in' : undefined
);
</script>

<template>
  <div class="flip-wrapper">
    <motion.div class="flip-inner" :animate="{ rotateY: angle }" :transition="flipTransition">
      <div class="face face-front" :aria-hidden="isHalf && halves % 2 === 1">
        <Transition :name="fadeName" :mode="fadeMode" :css="useCss">
          <QuizFace
            v-if="frontContent"
            :key="quizContentKey(frontContent)"
            class="quiz-content"
            :content="frontContent"
          />
        </Transition>
      </div>
      <div class="face face-back" :aria-hidden="!(isHalf && halves % 2 === 1)">
        <QuizFace v-if="backContent" class="quiz-content" :content="backContent" />
      </div>
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
  /* クロスフェード中は前後の問題を同じ場所に重ねる */
  display: grid;
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
.face-back {
  transform: rotateY(180deg);
}
.quiz-content {
  grid-area: 1 / 1;
}

/* 中身だけフェード */
.quiz-fade-enter-active,
.quiz-fade-leave-active {
  transition: opacity 0.25s ease;
}
.quiz-fade-enter-from,
.quiz-fade-leave-to {
  opacity: 0;
}

/* フェード＋スライド（消えるときは上へ、出るときは下から） */
.quiz-slide-enter-active,
.quiz-slide-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.quiz-slide-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.quiz-slide-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}

/* クロスフェード（前後の問題を重ねて同時に入れ替える） */
.quiz-crossfade-enter-active,
.quiz-crossfade-leave-active {
  transition: opacity 0.35s ease;
}
.quiz-crossfade-enter-from,
.quiz-crossfade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .quiz-slide-enter-from,
  .quiz-slide-leave-to {
    transform: none;
  }
}
</style>
