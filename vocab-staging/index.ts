/**
 * STAGING INDEX — vocab ready for later import into the app.
 * Do not import from app seed/UI until wiring is intentional.
 *
 * Format: kanji | kana | romaji(발음) | meaning | level/subject
 *
 * Files:
 * - jlpt-n1.json … jlpt-n5.json, jlpt-all.json
 * - jlpt-n1-staging.ts … jlpt-n5-staging.ts
 * - eju-math/physics/chemistry/biology/sogo.json
 * - eju-subjects-all.json, eju-subjects-staging.ts
 */
export type { StagedVocab } from './eju-subjects-staging';
export {
  ejuMathStaging,
  ejuPhysicsStaging,
  ejuChemistryStaging,
  ejuBiologyStaging,
  ejuSogoStaging,
} from './eju-subjects-staging';
export { jlptN5Staging } from './jlpt-n5-staging';
export { jlptN4Staging } from './jlpt-n4-staging';
export { jlptN3Staging } from './jlpt-n3-staging';
export { jlptN2Staging } from './jlpt-n2-staging';
export { jlptN1Staging } from './jlpt-n1-staging';
