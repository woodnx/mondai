<template>
  <div ref="pixiContainer" class="pixi-background"></div>
</template>

<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount } from 'vue';
import { Application, Graphics } from 'pixi.js';

const pixiContainer = ref<HTMLDivElement | null>(null);

let app: Application | null = null;
const RECT_NUM = 80;
const MIN_SIZE = 20;
const MAX_SIZE = 80;
const MIN_GROW = 0.5;
const MAX_GROW = 2.0;
const COLOR = 0xaeeaff; // 淡い青色

type RectData = {
  graphics: Graphics;
  x: number;
  y: number;
  size: number;
  grow: number;
  alpha: number;
};

let rects: RectData[] = [];
function randomRect(): RectData {
  const w = app!.screen.width;
  const h = app!.screen.height;
  const x = Math.random() * w;
  const y = Math.random() * h;
  const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
  const grow = MIN_GROW + Math.random() * (MAX_GROW - MIN_GROW);
  const graphics = new Graphics();
  const alpha = 0.25 + Math.random() * 0.25;
  graphics.rect(-size / 2, -size / 2, size, size).fill({ color: COLOR, alpha });
  graphics.x = x;
  graphics.y = y;
  graphics.x = x;
  graphics.y = y;
  return { graphics, x, y, size, grow, alpha };
}
function spawnRects(): void {
  rects.forEach((r) => r.graphics.destroy());
  rects = [];
  if (!app) return;
  for (let i = 0; i < RECT_NUM; i++) {
    const rect = randomRect();
    rects.push(rect);
    app.stage.addChild(rect.graphics);
  }
}

onMounted(async () => {
  app = new Application();
  await app.init({
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true
  });
  if (pixiContainer.value && app) {
    pixiContainer.value.appendChild(app.canvas);
  }

  function randomRect(): RectData {
    const w = app!.screen.width;
    const h = app!.screen.height;
    const x = Math.random() * w;
    const y = Math.random() * h;
    const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
    const grow = MIN_GROW + Math.random() * (MAX_GROW - MIN_GROW);
    const graphics = new Graphics();
    graphics.alpha = 0.25 + Math.random() * 0.25; // 透明度も淡く
    graphics.rect(-size / 2, -size / 2, size, size);
    graphics.fill(COLOR);

    graphics.x = x;
    graphics.y = y;
    return { graphics, x, y, size, grow, alpha: graphics.alpha };
  }

  spawnRects();

  // リサイズ時も再生成
  window.addEventListener('resize', spawnRects);

  app.ticker.add(() => {
    for (const rect of rects) {
      rect.size += rect.grow;
      rect.graphics.clear();
      rect.graphics
        .rect(-rect.size / 2, -rect.size / 2, rect.size, rect.size)
        .fill({ color: COLOR, alpha: rect.alpha * (1 - (rect.size - MIN_SIZE) / (MAX_SIZE * 2)) });
      if (rect.size > MAX_SIZE * 2) {
        // 再利用: 新しい四角形にリセット
        const newRect = randomRect();
        rect.x = newRect.x;
        rect.y = newRect.y;
        rect.size = newRect.size;
        rect.grow = newRect.grow;
        rect.alpha = newRect.alpha;
        rect.graphics.x = rect.x;
        rect.graphics.y = rect.y;
      }
    }
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', spawnRects);
  rects.forEach((r) => r.graphics.destroy());
  app?.destroy(true);
});
</script>

<style scoped>
.pixi-background {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: -1;
}
canvas {
  display: block;
  pointer-events: none;
}
</style>
