# GPT(챗GPT 이미지 생성)용 프롬프트 — 앱 아이콘

> 사용법: 아래 "그대로 붙여넣을 프롬프트"만 이미지 생성 되는 GPT(챗GPT)에 입력.
> 나노바나나로 이미 한 번 통과한 디자인(빨간 전체 배경 + 중앙 흰 원)과 같은 디자인이다.
> 도구만 바꾸는 것.

---

## 왜 필요한가

`public/icon.svg`는 브라우저 탭용 벡터 하나뿐이라, iOS 홈 화면 추가·안드로이드 설치 시
쓸 PNG 아이콘(192×192, 512×512, 애플용 180×180)이 없다. 나노바나나로 두 번째 시도에서
"빨간 배경이 캔버스 전체를 꽉 채우고, 중앙에 흰 원 하나"인 디자인이 정상적으로 나왔다.
이번엔 같은 디자인을 GPT 이미지 생성으로 다시 뽑는다.

**GPT 이미지 생성이 잘 저지르는 실수**: 정사각형을 요청해도 살짝 여백을 남기거나,
테두리를 추가하거나, 배경에 은은한 그라데이션·텍스처를 넣는 경우가 있다. 아래 프롬프트는
그걸 막는 문구를 명시적으로 넣었다.

---

## 그대로 붙여넣을 프롬프트

```
Generate a single square image, exactly 1024x1024 pixels, 1:1 aspect ratio, no
letterboxing, no white margin or border around the image.

Fill the ENTIRE canvas, corner to corner, edge to edge, with one solid flat color:
#EF4444 (a bright red). There must be no background color, no white space, no gray
space, and no border or frame visible anywhere outside this red — the red must touch
all four edges of the image with zero margin, zero padding, zero rounded corners.

On top of that solid red square, draw one single simple white filled circle, centered
exactly in the middle of the canvas. The circle's diameter should be about 45% of the
canvas width. Do not shrink, offset, or resize the red square itself to make room for
the circle — the red square always stays the full 1024x1024 canvas; only the white
circle sits on top of it.

Style: flat 2D vector graphic icon, solid colors only, like a minimalist app icon or
favicon design. No gradients, no shadows, no outlines, no texture, no 3D effect, no
noise, no border, no frame, no drop shadow, no other shapes, no text, no letters, no
numbers, no logo, no watermark, no pattern. Only two flat colors in the whole image:
red (#EF4444) and white. This is a simple geometric icon, not a photo or illustration.
```

## 확인할 것 (받은 이미지가 이거랑 안 맞으면 다시 생성)

- 이미지 네 귀퉁이가 전부 빨간색이어야 한다. 귀퉁이·가장자리에 흰색/회색 테두리가
  조금이라도 보이면 잘못 나온 것 — GPT가 종종 여백을 넣는다.
- 빨간 부분이 계단식이거나 도형처럼 잘려 있으면 안 된다 — 처음부터 끝까지 꽉 찬 정사각형.
- 흰 원은 정중앙에 있어야 하고, 전체 폭의 절반 정도 크기여야 한다.
- 그림자·그라데이션·질감이 있으면 안 된다 — 완전히 평평한 두 가지 색(빨강/흰색)만.

받은 이미지 파일을 아무 곳에나 저장해서 경로만 알려주면, 거기서 192×192·512×512·
180×180(애플용)·maskable 버전으로 만들고 `manifest.json`·`layout.tsx`에 연결하는 건
이어서 처리한다.
