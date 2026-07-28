/**
 * 단어 덱별 개수. `python scripts/gen-vocab.py` 로 자동 생성된다 — 손으로 고치지 말 것.
 *
 * 보관함 목록에서 개수만 보여줄 때 단어 파일(수백 KB)을 통째로 불러오지 않기 위해
 * 개수만 따로 떼어 둔다. 실제 단어는 사용자가 '추가'를 누를 때 동적 import 한다.
 */
export const VOCAB_COUNTS = {
  jlptN3: 1190,
  jlptN2: 2180,
  jlptN1: 2596,
  ejuMathVocab: 610,
  ejuPhysicsVocab: 478,
  ejuChemistryVocab: 422,
  ejuBiologyVocab: 371,
  ejuSogoVocab: 412,
} as const;
