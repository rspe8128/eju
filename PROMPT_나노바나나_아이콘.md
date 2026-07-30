# 나노바나나(Gemini 이미지 생성)용 프롬프트 — 앱 아이콘

> 사용법: 아래 "그대로 붙여넣을 프롬프트"만 나노바나나에 입력. 나머지는 참고용 설명.

---

## 왜 필요한가

지금 PWA 아이콘은 `public/icon.svg` 하나뿐이고, 내용은 빨간 배경에 흰 글씨로 "EJU"를 쓴
벡터 텍스트다. 이건 브라우저 탭에서는 괜찮지만, **iOS 홈 화면에 추가하거나 안드로이드
런처에 설치**하면 PNG 아이콘(정확히는 192×192, 512×512, iOS용 180×180)이 따로 필요하고,
지금은 그게 없어서 이상하게 나오거나 기본 아이콘으로 대체된다.

**AI로 생성할 때 "EJU"라는 3글자 텍스트를 그대로 넣지 않은 이유** — 이미지 생성 모델은
알파벳 여러 글자를 정확히 렌더링하는 걸 아직 잘 못한다(글자가 뭉개지거나 철자가 틀리기
쉽다). 대신 텍스트 없이 알아볼 수 있는 심볼로 설계했다 — 어차피 파비콘 크기(16px)에서는
텍스트 3글자가 어차피 안 보인다. 기존 브랜드 색(`#ef4444`, 앱 전체에서 쓰는 빨간색)은
그대로 유지했다.

---

## 그대로 붙여넣을 프롬프트

> 한 번에 안 될 수 있다. 아래 "확인할 것" 항목에 안 맞으면 다시 생성해서 맞는 걸 고를 것.

```
Generate a single square image, exactly 1024x1024 pixels, 1:1 aspect ratio.

Fill the ENTIRE canvas, corner to corner, edge to edge, with one solid flat color:
#EF4444 (a bright red). There must be no background color, no white space, no gray
space, and no border visible anywhere outside this red — the red must touch all four
edges of the image with zero margin.

On top of that solid red square, draw one single simple white filled circle, centered
exactly in the middle of the canvas. The circle's diameter should be about 45% of the
canvas width. Do not shrink, offset, or resize the red square itself to make room for
the circle — the red square always stays the full 1024x1024 canvas; only the white
circle sits on top of it.

Style: flat 2D vector graphic, solid colors only. No gradients, no shadows, no
outlines, no texture, no 3D effect, no border, no frame, no rounded corners on the
square itself, no other shapes, no text, no letters, no numbers, no logo, no pattern.
Only two flat colors in the whole image: red (#EF4444) and white.
```

## 확인할 것 (받은 이미지가 이거랑 안 맞으면 다시 생성)

- 이미지 네 귀퉁이가 전부 빨간색이어야 한다. 귀퉁이에 흰색/회색/다른 색이 조금이라도
  보이면 잘못 나온 것.
- 빨간 부분이 계단식이거나 도형처럼 잘려 있으면 안 된다 — 처음부터 끝까지 꽉 찬 정사각형.
- 흰 원은 정중앙에 있어야 하고, 전체 폭의 절반 정도 크기여야 한다.

---

## 받은 다음에 할 일

1. 나온 1024×1024 이미지를 마음에 들 때까지 몇 번 다시 생성해 볼 것 (특히 원이 완벽하게
   중앙에 있는지, 배경이 요청한 빨간색과 맞는지 확인).
2. 마음에 드는 결과가 나오면 파일로 저장해서 나한테 주면, 거기서 192×192·512×512·
   180×180(애플용)·maskable 버전으로 잘라내고 `manifest.json`과 `layout.tsx`에
   연결하는 건 내가 처리한다 — 이미지 생성 자체만 나노바나나가 할 일이고, 나머지는
   코드 작업이라 내 몫이다.
