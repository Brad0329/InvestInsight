# Phase 4 개발 기록 — AI 채팅 연동

## 커밋
`f41bf49` feat: Phase 4 AI 채팅 연동 — Claude/GPT-4o 멀티 AI 채팅 패널 구현

## 목표
우측 패널(RightPanel) AI 채팅 기능 구현. Claude Sonnet 4.6 + GPT-4o 2개 모델 우선 지원.

## 주요 결정사항

| 항목 | 결정 | 이유 |
|------|------|------|
| API 호출 방식 | 브라우저 직접 호출 | 개인용 앱, aiApi.js가 이미 클라이언트 호출 구조 |
| Claude CORS | `anthropic-dangerous-direct-browser-access: true` 헤더 | 프록시 없이 CORS 해결 |
| 채팅 상태 | `useChat` 커스텀 훅 분리 | RightPanel에서만 사용, AppContext 비대화 방지 |
| 시스템 프롬프트 | `utils/systemPrompt.js` 순수 함수 | 재사용·테스트 용이 |
| 마크다운 렌더링 | `react-markdown` 패키지 | AI 응답 포맷 품질 보장 |

## 신규/수정 파일

### 신규
- `src/services/aiApi.js` — Claude CORS 헤더, label 필드, 에러 파싱 개선
- `src/utils/systemPrompt.js` — `buildSystemPrompt()` 순수 함수
- `src/hooks/useChat.js` — 채팅 상태 훅 (messages, send, clearHistory, selectedModel)
- `src/components/chat/ChatMessage.jsx` — 메시지 버블 (react-markdown 렌더링)
- `src/components/chat/QuestionTemplates.jsx` — 3카테고리 × 3질문 템플릿

### 수정
- `src/components/layout/RightPanel.jsx` — 플레이스홀더 → 완전한 채팅 UI
- `src/pages/SettingsPage.jsx` — API 키 입력/관리 UI (저장/변경/삭제)

## 시스템 프롬프트 구성

`buildSystemPrompt({ stock, companyInfo, keyMetrics, theme, bsnsYear, reprtCode })`

포함 내용:
1. 역할 정의 (투자 분석 전문가)
2. 종목명 / 종목코드 / 밸류체인 포지션 / 참고(memo)
3. 소속 테마명 / 설명 / 밸류체인 단계
4. 기업 개황 (대표이사, 시장, 설립일, 홈페이지)
5. 주요 재무 지표 7개 × 3개년 (자산총계, 유동자산, 부채총계, 자본총계, 매출액, 영업이익, 당기순이익)
6. 응답 지침 (팩트 기반, 수치 인용, 전문용어 설명, 투자 권유 금지)

## useChat 훅 설계

```javascript
const { messages, loading, error, selectedModel, setSelectedModel, send, clearHistory } = useChat();
```

- `messagesRef`로 클로저 문제 방지 (send 호출 시 최신 messages 참조)
- 종목 변경 시 RightPanel의 useEffect에서 `clearHistory()` 호출
- 모델 전환 시 대화 히스토리 유지 (의도적)

## 트러블슈팅

### Claude API 400 에러 (크레딧 부족)
- 증상: `{"error":{"type":"invalid_request_error","message":"Your credit balance is too low..."}}`
- 원인: Anthropic 계정 크레딧 소진
- 해결: console.anthropic.com → Plans & Billing → 크레딧 충전

### 에러 메시지 truncate 문제
- 증상: RightPanel 에러 바에서 메시지가 잘려 원인 파악 불가
- 해결: `truncate` → `break-words`로 교체, aiApi.js 에러 파싱 개선 (JSON 파싱 후 error.message 추출)

## API 키 저장 구조

```
investinsight_claude_key    → Claude Sonnet 4.6
investinsight_gpt_key       → GPT-4o
investinsight_deepseek_key  → DeepSeek (미사용)
investinsight_gemini_key    → Gemini (미사용)
```

- `/settings` 페이지에서 입력, `storage.set(keyName, value)` 패턴
- 브라우저 localStorage에만 저장, 서버 전송 없음

## 미구현 (Phase 4 범위 외)
- SSE 스트리밍 응답 (Phase 4 낮은 우선순위)
- AI 핵심요약 카드 (자동 생성, 비용 관리 이슈로 보류)
- 질문 템플릿 전체 40개 (현재 9개 구현)
- DeepSeek / Gemini 활성화
