import type { WordEntry } from "../japaneseWords";
import raw from "./jlptN3Words.json";

/**
 * JLPT N3 단어.
 * vocab-staging/jlpt-n3.json 에서 생성했다 (scripts/gen-vocab 참고).
 * 이미 앱에 있던 단어(N5·N4 덱, 아카데믹 어휘 등)는 제외했다.
 * 형식: [표제어, 읽기(가나전용이면 빈칸), 뜻, 예문(없음), 로마자]
 *
 * 실제 데이터는 같은 이름의 .json 에 있다. 여기서는 타입만 붙인다.
 * (배열 리터럴로 두면 tsc가 튜플 타입 검사에 몇 분씩 쓴다)
 */
export const jlptN3Words = raw as unknown as WordEntry[];
