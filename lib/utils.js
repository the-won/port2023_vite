/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 바이트를 읽기 쉬운 형태로 변환
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 현재 타임스탬프 반환
 */
function getCurrentTimestamp() {
    return new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Hunk 헤더 파싱
 */
function parseHunkHeader(hunkLine) {
    const match = hunkLine.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
    if (!match) return null;

    return {
        oldStart: parseInt(match[1]),
        oldCount: match[2] ? parseInt(match[2]) : 1,
        newStart: parseInt(match[3]),
        newCount: match[4] ? parseInt(match[4]) : 1
    };
}

/**
 * 파일 경로 정규화
 */
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}

/**
 * Git 출력에서 색상 코드 제거
 */
function stripAnsiColors(text) {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 안전한 파일명 생성
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-z0-9가-힣.\-_]/gi, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * 디렉토리 경로에서 파일명 추출
 */
function getBasename(filePath) {
    return filePath.split('/').pop() || filePath;
}

/**
 * 상대 시간 표시 (예: "2시간 전")
 */
function getRelativeTime(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSecs < 60) return `${diffSecs}초 전`;
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 30) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
}

module.exports = {
    escapeHtml,
    formatBytes,
    getCurrentTimestamp,
    parseHunkHeader,
    normalizePath,
    stripAnsiColors,
    sanitizeFilename,
    getBasename,
    getRelativeTime
};