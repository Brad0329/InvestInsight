# Phase 3 — 밸류체인 시각화 (개발 히스토리)

> 작성일: 2026-02-27
> 목표: Mermaid.js 기반 밸류체인 플로우 다이어그램 구현 (스테이지 연결 + 종목 노드 + 클릭 인터랙션)

---

## 1. Phase 2 완료 상태

| 항목 | 상태 |
|------|------|
| AppContext 전역 상태 (테마/종목/탭) | 완성 |
| CenterPanel 4탭 (밸류체인 플레이스홀더) | 밸류체인 탭만 미구현 |
| themes.json value_chain_stages + stage_id | 데이터 준비 완료 |
| FinancialTabContent 재무 탭 | 완성 |
| selectStock() → 재무 탭 자동 전환 | 완성 |

---

## 2. 구현 내용

### 2-1. Mermaid.js 설치

`mermaid@^11.12.3` 설치. Vite에 의해 다이어그램 타입별로 자동 chunk split됨.

### 2-2. Mermaid 다이어그램 생성 유틸

**파일**: `src/utils/mermaidGenerator.js`

`generateMermaidChart(theme)` 함수:
- theme 객체의 `value_chain_stages[]` → Mermaid `graph LR` 문법 변환
- 스테이지 노드: HTML 라벨 (`<b>라벨</b><br/><small>부가설명</small>`)
- 스테이지 간 화살표(`-->`) 순차 연결
- 종목 노드: `stock_{code}` ID 부여, 점선(`-.-`) 연결
- 스타일 지정: 스테이지(스카이블루 `#0ea5e9`), 종목(연한 파랑 `#f0f9ff`, pill 형태 `rx:16`)

### 2-3. ValueChainDiagram 컴포넌트

**파일**: `src/components/valuechain/ValueChainDiagram.jsx`

- `mermaid.initialize()` — `securityLevel: 'loose'`로 클릭 이벤트 허용
- `mermaid.render()` 비동기 호출 → SVG innerHTML 삽입
- 클릭 이벤트 위임: SVG 노드 ID에서 `stock_(\d+)` 정규식으로 종목코드 추출 → `selectStock()` 호출
- 선택된 종목 하이라이트: `rect` 요소의 fill/stroke 직접 조작
- ResizeObserver로 부모 컨테이너 크기 변경 시 다이어그램 재렌더링
- 에러 시 폴백 메시지 표시

### 2-4. ValueChainTabContent 컴포넌트

**파일**: `src/components/valuechain/ValueChainTabContent.jsx`

- 테마 미선택 시 안내 메시지 (🔗 아이콘 + "테마를 선택하세요")
- 테마 선택 시: 테마명 헤더 + 설명 + 종목 수 + ValueChainDiagram
- 하단 안내: "종목 노드를 클릭하면 재무 탭으로 이동합니다"

### 2-5. CenterPanel 수정

**파일**: `src/components/layout/CenterPanel.jsx`

- `ValueChainTabContent` import 추가
- `<Placeholder label="밸류체인 시각화" />` → `<ValueChainTabContent />` 교체

---

## 3. 파일 구조 (Phase 3 신규)

```
src/
├── utils/
│   └── mermaidGenerator.js         (신규) Mermaid 다이어그램 생성
├── components/
│   ├── valuechain/
│   │   ├── ValueChainTabContent.jsx  (신규) 밸류체인 탭 컨텐츠
│   │   └── ValueChainDiagram.jsx     (신규) Mermaid 렌더링 + 인터랙션
│   └── layout/
│       └── CenterPanel.jsx          (수정) ValueChainTabContent 연결
└── package.json                     (수정) mermaid 의존성 추가
```

---

## 4. 설계 결정

| 결정 | 이유 |
|------|------|
| Mermaid.js (Phase 7에서 Reactflow 전환) | 빠른 초기 구현, Reactflow는 후순위 |
| graph LR 방향 | 밸류체인 흐름은 좌→우가 직관적 |
| 종목 노드 점선(-.-) 연결 | 소속 관계 표현, 화살표와 구분 |
| securityLevel: 'loose' | SVG 노드 클릭 이벤트 위임 필요 |
| stock_{code} ID 패턴 | 정규식으로 종목코드 추출 용이 |
| ResizeObserver 재렌더링 | 패널 리사이즈 시 다이어그램 깨짐 방지 |
| SVG rect 직접 스타일 조작 | Mermaid 렌더링 후 DOM 접근으로 하이라이트 |

---

## 5. 검증 결과

- ✅ `npm run build` 성공 (0 errors)
- ✅ Mermaid 다이어그램 타입별 자동 chunk split (flowDiagram, sequenceDiagram 등)
- ✅ 수소 테마 선택 → 밸류체인 다이어그램 렌더링
- ✅ 종목 노드 클릭 → selectStock() → 재무 탭 전환
- ✅ 선택 종목 하이라이트 스타일 적용
- ✅ Phase 2 기능 (재무 탭, 반응형) 영향 없음
