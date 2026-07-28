# -*- coding: utf-8 -*-
"""vocab-staging/*.json → src/lib/data/vocab/*.ts (WordEntry 형식)"""
import json, re, os, unicodedata

ROOT = "."
STAGE = os.path.join(ROOT, "vocab-staging")
OUTDIR = os.path.join(ROOT, "src/lib/data/vocab")

def load(name):
    with open(os.path.join(STAGE, name), encoding="utf-8") as f:
        return json.load(f)

# ── 앱에 이미 들어 있는 표제어 수집 ──────────────────────────────
# TS 배열에서 ["단어", "읽기", ...] 의 앞 두 칸만 정규식으로 뽑는다.
ENTRY = re.compile(r'\[\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"')

EXISTING_FILES = [
    "japaneseWords.ts", "jlptN5FullWords.ts", "jlptN4Words.ts", "jlptN5KanjiWords.ts",
    "ejuAcademicVocab.ts", "mathTerms.ts", "sogoTerms.ts", "scienceTerms.ts",
    "jlptGrammar.ts", "jlptGrammarN3.ts", "writingExpressions.ts",
]

existing_pairs, existing_heads = set(), set()
for fn in EXISTING_FILES:
    p = os.path.join(ROOT, "src/lib/data", fn)
    if not os.path.exists(p):
        continue
    src = open(p, encoding="utf-8").read()
    for head, reading in ENTRY.findall(src):
        existing_pairs.add((head, reading))
        existing_heads.add(head)
print(f"기존 표제어 {len(existing_heads):,}개 / (표제어,읽기) 쌍 {len(existing_pairs):,}개")

def clean_romaji(s):
    return s.replace("\\'", "'").strip()

def ts_str(s):
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'

def to_entry(row):
    head = row["kanji"].strip()
    kana = row["kana"].strip()
    meaning = row["meaning"].strip()
    romaji = clean_romaji(row.get("romaji", ""))
    # 표제어와 읽기가 같으면(가나 전용 단어) 읽기 칸은 비운다 — 화면에 같은 글자가 두 번 나오는 걸 막는다
    reading = "" if head == kana else kana
    return head, reading, meaning, romaji

def write_ts(path, varname, doc, entries):
    """단어는 .json 으로, 타입만 붙인 얇은 .ts 래퍼를 함께 만든다.

    왜 TS 배열 리터럴이 아니라 JSON인가:
    ["단어","읽기","뜻","","로마자"] 같은 리터럴 수천 개를 WordEntry 튜플 타입에
    맞춰 검사시키면 tsc가 파일 하나에 몇 분씩 걸린다(실측). JSON으로 넣으면
    string[][] 하나로 추론되고 끝나서 즉시 통과한다. 번들 크기도 더 작다.
    """
    json_path = path[:-3] + ".json"
    rows = [[head, reading, meaning, "", romaji] for head, reading, meaning, romaji in entries]
    with open(json_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")

    base = os.path.basename(json_path)
    lines = ['import type { WordEntry } from "../japaneseWords";',
             f'import raw from "./{base}";', "", "/**"]
    lines += [f" * {l}" for l in doc.strip().split("\n")]
    lines += [
        " *",
        " * 실제 데이터는 같은 이름의 .json 에 있다. 여기서는 타입만 붙인다.",
        " * (배열 리터럴로 두면 tsc가 튜플 타입 검사에 몇 분씩 쓴다)",
        " */",
        f"export const {varname} = raw as unknown as WordEntry[];",
        "",
    ]
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    print(f"  → {os.path.basename(path)} + {base}  {len(entries):,}개")

def dedupe(rows, seen):
    """앱에 이미 있는 단어와, 이미 뽑은 단어를 걸러낸다."""
    out, dropped = [], 0
    for r in rows:
        e = to_entry(r)
        key = (e[0], r["kana"].strip())
        if key in seen or key in existing_pairs:
            dropped += 1
            continue
        seen.add(key)
        out.append(e)
    return out, dropped

os.makedirs(OUTDIR, exist_ok=True)
seen = set()

print("\n[JLPT]")
for level, var in [("n3", "jlptN3Words"), ("n2", "jlptN2Words"), ("n1", "jlptN1Words")]:
    rows = load(f"jlpt-{level}.json")
    entries, dropped = dedupe(rows, seen)
    print(f"  {level.upper()}: 원본 {len(rows):,} · 중복제외 {dropped} · 채택 {len(entries):,}")
    write_ts(
        os.path.join(OUTDIR, f"jlpt{level.upper()}Words.ts"),
        var,
        f"JLPT {level.upper()} 단어.\n"
        f"vocab-staging/jlpt-{level}.json 에서 생성했다 (scripts/gen-vocab 참고).\n"
        "이미 앱에 있던 단어(N5·N4 덱, 아카데믹 어휘 등)는 제외했다.\n"
        "형식: [표제어, 읽기(가나전용이면 빈칸), 뜻, 예문(없음), 로마자]",
        entries,
    )

print("\n[EJU 과목 용어]")
SUBJ = [
    ("math", "ejuMathVocab", "수학"),
    ("physics", "ejuPhysicsVocab", "물리"),
    ("chemistry", "ejuChemistryVocab", "화학"),
    ("biology", "ejuBiologyVocab", "생물"),
    ("sogo", "ejuSogoVocab", "종합과목"),
]
blocks = []
for key, var, label in SUBJ:
    rows = load(f"eju-{key}.json")
    # 과목별로는 서로 겹쳐도 된다(같은 용어가 수학·물리에 다 나올 수 있다).
    # 앱에 이미 있는 용어와, 같은 과목 안에서의 중복만 제거한다.
    local, dropped, out = set(), 0, []
    for r in rows:
        e = to_entry(r)
        k = (e[0], r["kana"].strip())
        if k in local or k in existing_pairs:
            dropped += 1
            continue
        local.add(k)
        out.append(e)
    print(f"  {label}: 원본 {len(rows):,} · 중복제외 {dropped} · 채택 {len(out):,}")
    blocks.append((var, label, out))

sub_rows = {}
for var, label, out in blocks:
    sub_rows[var] = [[h, r, m, "", ro] for h, r, m, ro in out]
with open(os.path.join(OUTDIR, "ejuSubjectVocab.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(sub_rows, f, ensure_ascii=False, separators=(",", ":"))
    f.write("\n")

lines = ['import type { WordEntry } from "../japaneseWords";',
         'import raw from "./ejuSubjectVocab.json";', "",
         "/**", " * EJU 과목별 일본어 전문용어 (확장판).",
         " * vocab-staging/eju-*.json 에서 생성했다 (scripts/gen-vocab.py).",
         " * 기존 mathTerms/sogoTerms/scienceTerms 에 이미 있던 용어는 제외했으므로,",
         " * 두 덱을 같이 학습해도 같은 단어가 두 번 나오지 않는다.",
         " * 형식: [표제어, 읽기(가나전용이면 빈칸), 뜻, 예문(없음), 로마자]",
         " */", ""]
for var, label, out in blocks:
    lines.append(f"/** {label} — {len(out):,}개 */")
    lines.append(f"export const {var} = raw.{var} as unknown as WordEntry[];")
    lines.append("")
with open(os.path.join(OUTDIR, "ejuSubjectVocab.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write("\n".join(lines))
print(f"  → ejuSubjectVocab.ts  {sum(len(b[2]) for b in blocks):,}개")

# ── 매니페스트 ──────────────────────────────────────────────────
# 보관함 목록 화면에서 "몇 개짜리 덱인지"만 보여줄 때 단어 파일 전체를
# 불러오면 낭비다. 개수만 따로 뽑아 둔다.
manifest = {
    "jlptN3": None, "jlptN2": None, "jlptN1": None,
}
counts = {}
for level in ["N3", "N2", "N1"]:
    with open(os.path.join(OUTDIR, f"jlpt{level}Words.json"), encoding="utf-8") as fh:
        counts[f"jlpt{level}"] = len(json.load(fh))
for var, label, out in blocks:
    counts[var] = len(out)

with open(os.path.join(OUTDIR, "manifest.ts"), "w", encoding="utf-8", newline="\n") as f:
    f.write("/**\n")
    f.write(" * 단어 덱별 개수. `python scripts/gen-vocab.py` 로 자동 생성된다 — 손으로 고치지 말 것.\n")
    f.write(" *\n")
    f.write(" * 보관함 목록에서 개수만 보여줄 때 단어 파일(수백 KB)을 통째로 불러오지 않기 위해\n")
    f.write(" * 개수만 따로 떼어 둔다. 실제 단어는 사용자가 '추가'를 누를 때 동적 import 한다.\n")
    f.write(" */\n")
    f.write("export const VOCAB_COUNTS = {\n")
    for k, v in counts.items():
        f.write(f"  {k}: {v},\n")
    f.write("} as const;\n")
print(f"\n매니페스트: {counts}")
