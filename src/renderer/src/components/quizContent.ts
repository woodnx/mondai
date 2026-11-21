/** カードの 1 面に表示する問題の内容 */
export type QuizContent = {
  no: number;
  question: string;
  answer: string;
  /** 別解・正誤判定基準（空欄なら表示しない） */
  criteria?: string;
  author: string;
  comment?: string;
  partners: string[];
  partnerComment?: string;
};

/** 内容が変わったかどうかを比べるためのキー */
export const quizContentKey = (content: QuizContent): string =>
  [
    content.no,
    content.question,
    content.answer,
    content.criteria,
    content.author,
    content.comment,
    content.partners.join('・'),
    content.partnerComment
  ].join('\u0000');
