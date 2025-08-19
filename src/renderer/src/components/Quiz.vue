<script setup lang="ts">
const props = defineProps<{
  question: string;
  answer: string;
}>();
</script>

<template>
  <div class="row-span-3 rounded-xl border-2 border-white p-5">
    <div>
      {{ props.question }}
    </div>
    <div>
      {{ props.answer }}
    </div>
  </div>
</template>
