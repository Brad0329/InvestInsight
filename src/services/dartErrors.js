/**
 * DART API 응답 상태 코드 정의
 * @see https://opendart.fss.or.kr/guide/detail.do?apiGrpCd=DS001&apiId=2019001
 */
export const DART_STATUS = {
  SUCCESS: '000',
  INVALID_KEY: '010',
  DISABLED_KEY: '011',
  BLOCKED_IP: '012',
  NO_DATA: '013',
  NO_FILE: '014',
  RATE_LIMITED: '020',
  INVALID_PARAM: '100',
  SERVER_BUSY: '800',
  UNKNOWN_ERROR: '900',
};

const STATUS_MESSAGES = {
  '000': '정상',
  '010': '등록되지 않은 API 키입니다',
  '011': '사용할 수 없는 API 키입니다',
  '012': '접근할 수 없는 IP입니다',
  '013': '조회된 데이터가 없습니다',
  '014': '파일이 존재하지 않습니다',
  '020': 'API 요청 한도를 초과했습니다 (일 10,000건)',
  '100': '요청 파라미터가 올바르지 않습니다',
  '800': '서버가 요청을 처리 중입니다. 잠시 후 다시 시도해주세요',
  '900': '정의되지 않은 오류가 발생했습니다',
};

/**
 * DART API 전용 에러 클래스
 */
export class DartApiError extends Error {
  constructor(status, message, endpoint) {
    super(message || STATUS_MESSAGES[status] || `DART API 오류 (${status})`);
    this.name = 'DartApiError';
    this.status = status;
    this.endpoint = endpoint;
  }

  get isNoData() {
    return this.status === DART_STATUS.NO_DATA;
  }

  get isRateLimited() {
    return this.status === DART_STATUS.RATE_LIMITED;
  }

  get isAuthError() {
    return (
      this.status === DART_STATUS.INVALID_KEY || this.status === DART_STATUS.DISABLED_KEY
    );
  }

  get isRetryable() {
    return (
      this.status === DART_STATUS.RATE_LIMITED || this.status === DART_STATUS.SERVER_BUSY
    );
  }
}

/**
 * DART 응답을 검증하고, 에러 시 DartApiError를 throw
 * NO_DATA("013")도 throw — 호출부에서 catch 후 빈 결과로 처리 가능
 */
export function validateDartResponse(data, endpoint) {
  if (!data || typeof data.status === 'undefined') {
    throw new DartApiError('900', 'DART API로부터 유효하지 않은 응답을 받았습니다', endpoint);
  }

  if (data.status !== DART_STATUS.SUCCESS) {
    throw new DartApiError(data.status, data.message, endpoint);
  }

  return data;
}
