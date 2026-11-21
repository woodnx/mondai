<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  isHidden: boolean;
}>();
const emit = defineEmits(['back', 'next', 'hidden', 'update:flipped']);

const locking = ref(true);
const flipped = ref(false);

const flipAndEmit = async (type: 'next' | 'back'): Promise<void> => {
  flipped.value = true;
  emit('update:flipped', true);
  await new Promise((resolve) => setTimeout(resolve, 600)); // アニメーション時間
  emit(type);
  flipped.value = false;
  emit('update:flipped', false);
  locking.value = true;
};

const back = (): void => {
  flipAndEmit('back');
};

const next = (): void => {
  flipAndEmit('next');
};
</script>

<template>
  <button class="btn btn-neutral w-30 text-xl" @click="locking = !locking">
    <div v-if="locking">
      <svg
        class="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    </div>
    <div v-else>
      <svg
        class="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
    <div v-if="locking">Unlock</div>
    <div v-else>Lock</div>
  </button>
  <div class="flex gap-4">
    <button class="btn" :disabled="locking || isHidden" @click="back">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-8"
      >
        <path stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
    </button>
    <button class="btn" :disabled="locking || isHidden" @click="next">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-8"
      >
        <path stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  </div>
  <button class="btn btn-neutral w-30 text-xl" :disabled="locking" @click="$emit('hidden')">
    <span v-if="isHidden">Open</span>
    <span v-else>Hidden</span>
  </button>
</template>
