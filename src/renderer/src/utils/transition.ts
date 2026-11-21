import type { QuizTransition } from '../../../shared/display';

export const quizTransitions = [
  {
    name: '中身だけフェード',
    value: 'fade',
    description: 'カードの枠は動かさず、文字だけを入れ替えます（おすすめ）。'
  },
  {
    name: 'フェード＋スライド',
    value: 'slide',
    description: '文字が少し上へ消え、次の問題が下からふわっと出ます。'
  },
  {
    name: 'クロスフェード',
    value: 'crossfade',
    description: '前の問題が薄くなりながら、次の問題が重なって浮かび上がります。'
  },
  {
    name: '軽い回転',
    value: 'flip-light',
    description: 'カードを半回転させ、裏側に次の問題が出ます。'
  },
  {
    name: '回転',
    value: 'flip',
    description: 'カードを 1 回転させ、表に戻ると次の問題になります。'
  },
  {
    name: 'なし',
    value: 'none',
    description: 'アニメーションせずにすぐ切り替えます。'
  }
] as const satisfies readonly { name: string; value: QuizTransition; description: string }[];

export const defaultQuizTransition: QuizTransition = 'fade';
