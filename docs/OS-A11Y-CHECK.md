# OS·보조기술 실측 기록 (P0)

- 실측일: 2026-09-23
- 대상: 공개 URL https://wbmaker2.github.io/relativity-observatory/ (배포 빌드)
- 방법: Playwright `emulateMedia` 실측 + WCAG 대비율 직접 계산 + 접근성 트리·Tab 순서 실측.
  실제 스크린리더(VoiceOver·NVDA)는 이 환경에 설치되어 있지 않아 낭독 품질 실측은 제외하고 사람 확인으로 남긴다.

## 1. 움직임 줄이기 (OS 설정 에뮬레이션)

- `reducedMotion: reduce` 적용 시 `matchMedia('(prefers-reduced-motion: reduce)')` = true 확인.
- 펄스 버튼 계산 스타일: 애니메이션 `none` + 외곽선 `2px`. gi-pulse 아우라가 정적 테두리로 대체됨을 실측으로 확인.
- 재생은 단계 이동(0.2초씩 setInterval)이라 모션 없이도 수치 상태가 그대로 갱신된다.

## 2. 고대비 (강제 색상 에뮬레이션)

- `forcedColors: active` 적용 시 `matchMedia('(forced-colors: active)')` = true 확인.
- 기본 버튼이 시스템 색상(흰 글자/검정 배경)으로 전환됨을 실측. `forced-color-adjust: auto`라 OS 팔레트를 막지 않는다.
- 일반 모드 대비율(WCAG 2.x 공식 직접 계산): 본문 18.88:1, 보조 7.46:1, 강조 10.69:1, 버튼(흰/강조) 10.69:1. 전부 4.5:1 이상으로 AA 통과.

## 3. 스크린리더 대체 실측 (접근성 트리 + 키보드)

- 23개 컨트롤(button·input·select·textarea·link) 전부 접근 가능한 이름 보유. 이름 없음 0개.
- `h1` 1개, 랜드마크(header·main·footer) 존재, `role="img"` SVG 전부 `aria-label` 보유.
- Tab 8회 순서 실측: 건너뛰기 → 업데이트 내역 → 시작하기 → β → 기준계 → A-t → A-x → B-t. 시각 순서와 일치, 함정 없음.
- 오류 2곳 `role="alert"`, 저장 상태 `role="status"` 확인.

## 4. 사람 확인 필요 (정직 기록)

- 실제 VoiceOver·NVDA 낭독 순서와 알림 품질은 실측하지 못했다. (공통 원칙도 VoiceOver 구현·검증을 제외한다.)
- OS 고대비 실제 적용 화면과 200% 확대 인지 용이성은 사람 확인이 필요하다.
