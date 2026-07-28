import type { WordEntry } from "../japaneseWords";
import raw from "./ejuSubjectVocab.json";

/**
 * EJU 과목별 일본어 전문용어 (확장판).
 * vocab-staging/eju-*.json 에서 생성했다 (scripts/gen-vocab.py).
 * 기존 mathTerms/sogoTerms/scienceTerms 에 이미 있던 용어는 제외했으므로,
 * 두 덱을 같이 학습해도 같은 단어가 두 번 나오지 않는다.
 * 형식: [표제어, 읽기(가나전용이면 빈칸), 뜻, 예문(없음), 로마자]
 */

/** 수학 — 610개 */
export const ejuMathVocab = raw.ejuMathVocab as unknown as WordEntry[];

/** 물리 — 478개 */
export const ejuPhysicsVocab = raw.ejuPhysicsVocab as unknown as WordEntry[];

/** 화학 — 422개 */
export const ejuChemistryVocab = raw.ejuChemistryVocab as unknown as WordEntry[];

/** 생물 — 371개 */
export const ejuBiologyVocab = raw.ejuBiologyVocab as unknown as WordEntry[];

/** 종합과목 — 412개 */
export const ejuSogoVocab = raw.ejuSogoVocab as unknown as WordEntry[];
