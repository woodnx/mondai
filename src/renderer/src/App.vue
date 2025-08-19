<script setup lang="ts">
import Quiz from './components/Quiz.vue';
</script>

<template>
  <main class="grid grow grid-flow-col grid-rows-3 gap-4">
    <Quiz question="ここに問題が入る" answer="ここに答えが入る" />
    <div class="col-span-2">02</div>
    <div class="col-span-2 row-span-2">03</div>
  </main>
</template>

<style lang="css">
main {
  width: 100%;
}
</style>
