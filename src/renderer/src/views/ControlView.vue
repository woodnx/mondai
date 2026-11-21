<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import QuizController from '../components/QuizController.vue';
import { applyTheme, themeColors, themeModes, type ThemeColor } from '../utils/theme';
import type { Quiz, SheetHeader, SheetsState, SourceSettings } from '../../../shared/sheets';
import { defaultColumnLabels } from '../../../shared/sheetSource';
import type { ThemeMode } from '../../../shared/display';

const themeStorageKey = 'mondai.themeColor';
const themeModeStorageKey = 'mondai.themeMode';
const titleStorageKey = 'mondai.displayTitle';
const defaultTitle = 'mondai';

function storedTitle(): string {
  try {
    return window.localStorage.getItem(titleStorageKey) ?? defaultTitle;
  } catch {
    return defaultTitle;
  }
}

function storedThemeMode(): ThemeMode {
  const fallback: ThemeMode = window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
  try {
    const stored = window.localStorage.getItem(themeModeStorageKey);
    return themeModes.find((mode) => mode.value === stored)?.value ?? fallback;
  } catch {
    return fallback;
  }
}

function storedThemeColor(): ThemeColor {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return themeColors.find((color) => color.value === stored)?.value ?? 'blue';
  } catch {
    return 'blue';
  }
}

const emptySettings = (): SourceSettings => ({
  url: '',
  headerRow: 1,
  columns: {
    question: -1,
    answer: -1,
    comment: null,
    author: null,
    partnerComment: null
  }
});

const state = ref<SheetsState | null>(null);
const draft = ref<SourceSettings>(emptySettings());
const sheetName = ref('');
const headers = ref<SheetHeader[]>([]);
const quizzes = ref<Quiz[]>([]);
const idx = ref(0);
const flipped = ref(true);
const settingsOpen = ref(false);
const busy = ref(false);
const loading = ref(true);
const error = ref('');
const message = ref('');
const themeColor = ref<ThemeColor>(storedThemeColor());
const themeMode = ref<ThemeMode>(storedThemeMode());
const displayTitle = ref(storedTitle());

const columnFields = ['question', 'answer', 'comment', 'author', 'partnerComment'] as const;
const columnLabels = {
  question: '問題文 *',
  answer: '答え *',
  comment: '作問者コメント',
  author: '作成者',
  partnerComment: '相方コメント'
};

watch(displayTitle, (title) => {
  try {
    window.localStorage.setItem(titleStorageKey, title);
  } catch {
    // The title remains usable for this session if storage is unavailable.
  }
});

watch(
  [themeMode, themeColor],
  ([mode, color]) => {
    applyTheme(mode, color);
    try {
      window.localStorage.setItem(themeModeStorageKey, mode);
      window.localStorage.setItem(themeStorageKey, color);
    } catch {
      // The theme remains usable for this session if storage is unavailable.
    }
  },
  { immediate: true }
);

// 表示ウィンドウへ現在の問題・開閉状態・テーマを送る
watch(
  [quizzes, idx, flipped, themeMode, themeColor, displayTitle],
  () => {
    const quiz = quizzes.value[idx.value];
    window.api.display.update({
      title: displayTitle.value,
      quiz: quiz ? { ...quiz, partners: [...quiz.partners] } : null,
      no: idx.value + 1,
      flipped: flipped.value,
      themeColor: themeColor.value,
      themeMode: themeMode.value
    });
  },
  { immediate: true }
);

// 通知（左上のトースト）は一定時間で自動的に消す
const infoDuration = 3000;
const errorDuration = 8000;
let messageTimer: ReturnType<typeof setTimeout> | undefined;
let errorTimer: ReturnType<typeof setTimeout> | undefined;

watch(message, (value) => {
  clearTimeout(messageTimer);
  if (value) messageTimer = setTimeout(() => (message.value = ''), infoDuration);
});

watch(error, (value) => {
  clearTimeout(errorTimer);
  if (value) errorTimer = setTimeout(() => (error.value = ''), errorDuration);
});

onBeforeUnmount(() => {
  clearTimeout(messageTimer);
  clearTimeout(errorTimer);
});

function errorMessage(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause);
  return raw.replace(/^Error invoking remote method '[^']+': Error: /, '');
}

async function run(action: () => Promise<void>): Promise<void> {
  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    await action();
  } catch (cause) {
    error.value = errorMessage(cause);
    try {
      state.value = await window.api.getState();
    } catch {
      // Keep the original error visible.
    }
  } finally {
    busy.value = false;
  }
}

/** 表示ウィンドウのカードを裏返すアニメーションの時間（ShowQuiz と合わせる） */
const flipDuration = 600;

async function reload(): Promise<void> {
  await run(async () => {
    // 先に答えを隠し、裏返し終わるまで中身を差し替えない
    const hiding = flipped.value
      ? Promise.resolve()
      : new Promise((resolve) => setTimeout(resolve, flipDuration));
    flipped.value = true;
    const [loaded] = await Promise.all([window.api.loadQuizzes(), hiding]);
    quizzes.value = loaded;
    // 今の問題から続ける（問題数が減っていたら最後の問題）
    idx.value = Math.max(0, Math.min(idx.value, loaded.length - 1));
    message.value = quizzes.value.length
      ? `${quizzes.value.length} 問を読み込みました。`
      : '問題がありません。';
  });
}

async function inspect(): Promise<void> {
  await run(async () => {
    const result = await window.api.inspectSource({
      url: draft.value.url,
      headerRow: Number(draft.value.headerRow)
    });
    sheetName.value = result.sheetName;
    headers.value = result.headers;
    const selected = draft.value.columns;
    for (const key of columnFields) {
      const current = selected[key];
      if (
        current === null ||
        current < 0 ||
        !headers.value.some((header) => header.index === current)
      ) {
        const found = headers.value.find((header) => header.label === defaultColumnLabels[key]);
        if (key === 'question' || key === 'answer') selected[key] = found?.index ?? -1;
        else selected[key] = found?.index ?? null;
      }
    }
  });
}

function changedUrl(): void {
  sheetName.value = '';
  changedHeaderRow();
}

function changedHeaderRow(): void {
  headers.value = [];
  draft.value.columns = emptySettings().columns;
}

async function save(): Promise<void> {
  await run(async () => {
    const settings: SourceSettings = {
      url: draft.value.url.trim(),
      headerRow: Number(draft.value.headerRow),
      columns: { ...draft.value.columns }
    };
    quizzes.value = await window.api.saveSettings(settings);
    state.value = await window.api.getState();
    idx.value = 0;
    flipped.value = true;
    settingsOpen.value = false;
    message.value = quizzes.value.length
      ? `${quizzes.value.length} 問を読み込みました。`
      : '設定を保存しました。問題がありません。';
  });
}

function openDisplay(): void {
  window.api.display.open();
}

function next(): void {
  idx.value = Math.min(idx.value + 1, quizzes.value.length - 1);
}

function back(): void {
  idx.value = Math.max(idx.value - 1, 0);
}

onMounted(async () => {
  document.title = 'mondai - 操作';
  try {
    state.value = await window.api.getState();
    if (state.value.settings) {
      await reload();
      // 読み込み時に古い設定へ補われた列（相方コメントなど）を設定画面にも反映する
      state.value = await window.api.getState();
      if (state.value.settings) {
        draft.value = {
          url: state.value.settings.url,
          headerRow: state.value.settings.headerRow,
          columns: { ...emptySettings().columns, ...state.value.settings.columns }
        };
      }
    } else {
      settingsOpen.value = true;
    }
  } catch (cause) {
    error.value = errorMessage(cause);
    settingsOpen.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex h-screen w-full min-w-0 flex-col overflow-hidden">
    <div class="toast toast-top toast-start z-50 max-w-[calc(100vw-2rem)]">
      <Transition name="toast">
        <div v-if="error" role="alert" class="alert alert-error">
          <span class="break-all">{{ error }}</span>
          <button class="btn btn-ghost btn-xs" aria-label="閉じる" @click="error = ''">✕</button>
        </div>
      </Transition>
      <Transition name="toast">
        <div v-if="message" role="status" class="alert alert-info">
          <span>{{ message }}</span>
          <button class="btn btn-ghost btn-xs" aria-label="閉じる" @click="message = ''">✕</button>
        </div>
      </Transition>
    </div>

    <header class="theme-header flex shrink-0 items-center justify-between gap-4 p-5">
      <h1 class="theme-title text-2xl">mondai</h1>
      <div class="flex gap-2">
        <button class="btn btn-sm" @click="openDisplay">表示ウィンドウを開く</button>
        <button class="btn btn-sm" :disabled="busy || !state?.settings" @click="reload">
          再読み込み
        </button>
        <button class="btn btn-sm btn-neutral" @click="settingsOpen = !settingsOpen">
          {{ settingsOpen ? '閉じる' : '設定' }}
        </button>
      </div>
    </header>

    <main
      class="mx-auto flex min-h-0 w-full min-w-0 max-w-5xl flex-1 flex-col gap-5 overflow-y-auto p-6"
    >
      <section v-if="settingsOpen" class="settings-panel rounded-2xl p-5 flex flex-col gap-5">
        <label class="flex flex-col gap-1">
          <span class="text-xl">表示タイトル</span>
          <span class="theme-muted text-sm">表示ウィンドウ上部のヘッダーに表示されます。</span>
          <input
            v-model="displayTitle"
            class="input w-full"
            type="text"
            maxlength="100"
            :placeholder="defaultTitle"
          />
        </label>
        <div class="theme-divider"></div>
        <fieldset class="flex flex-col gap-3">
          <legend class="text-xl">表示モード</legend>
          <div class="grid grid-cols-2 gap-2 sm:max-w-xs">
            <button
              v-for="mode in themeModes"
              :key="mode.value"
              type="button"
              class="theme-choice flex min-h-12 items-center gap-2 rounded-lg px-2 text-sm"
              :class="{ 'theme-choice-selected': themeMode === mode.value }"
              :aria-pressed="themeMode === mode.value"
              :aria-label="`${mode.name}モードに設定`"
              @click="themeMode = mode.value"
            >
              <span
                class="theme-swatch"
                :style="{ backgroundColor: mode.hex }"
                aria-hidden="true"
              ></span>
              <span>{{ mode.name }}</span>
            </button>
          </div>
        </fieldset>
        <fieldset class="flex flex-col gap-3">
          <legend class="text-xl">テーマカラー</legend>
          <p class="theme-muted text-sm">
            色を選ぶとすぐに反映され、次回の起動時にも使用されます。
          </p>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            <button
              v-for="color in themeColors"
              :key="color.value"
              type="button"
              class="theme-choice flex min-h-12 items-center gap-2 rounded-lg px-2 text-sm"
              :class="{ 'theme-choice-selected': themeColor === color.value }"
              :aria-pressed="themeColor === color.value"
              :aria-label="`${color.name}をテーマカラーに設定`"
              @click="themeColor = color.value"
            >
              <span
                class="theme-swatch"
                :style="{ backgroundColor: color.hex }"
                aria-hidden="true"
              ></span>
              <span>{{ color.name }}</span>
            </button>
          </div>
        </fieldset>
        <div class="theme-divider"></div>
        <h2 class="text-xl">スプレッドシート設定</h2>
        <ol class="text-sm list-decimal pl-5 flex flex-col gap-1">
          <li>
            Google スプレッドシートの「共有」で「リンクを知っている全員」を「閲覧者」にします。
          </li>
          <li>
            問題が入っているタブを開いた状態で、ブラウザのアドレスバーの URL
            をコピーして下に貼ります。
          </li>
        </ol>

        <label class="flex flex-col gap-1">
          <span>スプレッドシート URL</span>
          <input
            v-model="draft.url"
            class="input w-full"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            @input="changedUrl"
          />
        </label>
        <div class="flex gap-3 items-end flex-wrap">
          <label class="flex flex-col gap-1 w-32">
            <span>見出し行</span>
            <input
              v-model.number="draft.headerRow"
              class="input w-full"
              type="number"
              min="1"
              step="1"
              @input="changedHeaderRow"
            />
          </label>
          <button class="btn" :disabled="busy || !draft.url" @click="inspect">見出しを取得</button>
        </div>
        <p v-if="headers.length && sheetName" class="text-sm">読み込むシート：{{ sheetName }}</p>

        <div v-if="headers.length" class="grid gap-3 sm:grid-cols-2">
          <label v-for="field in columnFields" :key="field" class="flex flex-col gap-1">
            <span>{{ columnLabels[field] }}</span>
            <select v-model="draft.columns[field]" class="select w-full">
              <option :value="field === 'question' || field === 'answer' ? -1 : null">
                {{ field === 'question' || field === 'answer' ? '選択してください' : '使用しない' }}
              </option>
              <option v-for="header in headers" :key="header.index" :value="header.index">
                {{ header.label }} ({{ header.index + 1 }} 列目)
              </option>
            </select>
          </label>
        </div>
        <button
          class="btn theme-primary-button self-start"
          :disabled="busy || !headers.length"
          @click="save"
        >
          設定を保存して読み込む
        </button>
      </section>

      <div v-if="loading">読み込み中...</div>
      <template v-else-if="quizzes.length && quizzes[idx]">
        <section
          class="settings-panel flex flex-col gap-3 rounded-2xl p-5"
          aria-label="表示中の問題（操作用プレビュー）"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-lg">No. {{ idx + 1 }} / {{ quizzes.length }}</p>
            <span class="badge" :class="flipped ? 'badge-ghost' : 'theme-primary-button'">
              {{ flipped ? '非表示中' : '表示中' }}
            </span>
          </div>
          <p class="break-all text-xl">Q. {{ quizzes[idx].question }}</p>
          <p class="break-all text-2xl">A. {{ quizzes[idx].answer }}</p>
          <p v-if="quizzes[idx].author" class="theme-muted">作問: {{ quizzes[idx].author }}</p>
          <p v-if="quizzes[idx].comment" class="theme-muted break-all text-sm">
            コメント: {{ quizzes[idx].comment }}
          </p>
          <p v-if="quizzes[idx].partners.length" class="theme-muted">
            相方: {{ quizzes[idx].partners.join('・') }}
          </p>
          <p v-if="quizzes[idx].partnerComment" class="theme-muted break-all text-sm">
            相方コメント: {{ quizzes[idx].partnerComment }}
          </p>
        </section>
        <section
          class="settings-panel theme-muted flex flex-col gap-2 rounded-2xl p-5"
          aria-label="次の問題"
        >
          <template v-if="quizzes[idx + 1]">
            <p>次の問題　No. {{ idx + 2 }} / {{ quizzes.length }}</p>
            <p class="break-all text-lg">Q. {{ quizzes[idx + 1].question }}</p>
            <p class="break-all text-lg">A. {{ quizzes[idx + 1].answer }}</p>
            <p v-if="quizzes[idx + 1].author" class="text-sm">
              作問: {{ quizzes[idx + 1].author }}
            </p>
          </template>
          <p v-else>次の問題はありません（最後の問題です）。</p>
        </section>
      </template>
      <p v-else-if="!settingsOpen" class="p-5">
        表示する問題がありません。設定を確認してください。
      </p>
    </main>

    <footer
      v-if="quizzes.length && !settingsOpen"
      class="theme-footer flex w-full shrink-0 flex-wrap items-center justify-around gap-2 p-4 backdrop-blur-sm sm:p-8"
    >
      <QuizController
        :is-hidden="flipped"
        @back="back"
        @next="next"
        @hidden="flipped = !flipped"
        @update:flipped="flipped = $event"
      />
    </footer>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-1rem);
}
</style>
