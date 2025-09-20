const { escapeHtml, parseHunkHeader } = require('./utils');

class GitParser {
    constructor() {
        this.stats = { added: 0, removed: 0 };
    }

    parseDiff(diffOutput) {
        const lines = diffOutput.split('\n');
        const result = {
            files: [],
            stats: { added: 0, removed: 0 },
            timestamp: new Date().toISOString()
        };

        let currentFile = null;
        let oldLineNum = 0;
        let newLineNum = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('diff --git')) {
                // 새 파일 시작 - 이전 파일이 있으면 결과에 추가
                if (currentFile) {
                    result.files.push(currentFile);
                }
                
                currentFile = this.parseFileHeader(line);
                currentFile.hunks = []; // 파일별 hunk 배열 추가
                
            } else if (line.startsWith('index ')) {
                if (currentFile) {
                    currentFile.index = line.substring(6);
                }
                
            } else if (line.startsWith('--- ') || line.startsWith('+++ ')) {
                this.parseFilePathInfo(line, currentFile);
                
            } else if (line.startsWith('@@')) {
                if (currentFile) {
                    const hunkData = parseHunkHeader(line);
                    if (hunkData) {
                        oldLineNum = hunkData.oldStart;
                        newLineNum = hunkData.newStart;
                    }
                    
                    // 새 hunk 생성하고 현재 파일에 추가
                    const newHunk = {
                        header: line,
                        lines: [],
                        context: line.split('@@')[2] || ''
                    };
                    currentFile.hunks.push(newHunk);
                }
                
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                if (currentFile && currentFile.hunks.length > 0) {
                    const currentHunk = currentFile.hunks[currentFile.hunks.length - 1];
                    const diffLine = {
                        type: 'added',
                        content: line.substring(1),
                        lineNumber: newLineNum,
                        raw: line
                    };
                    currentHunk.lines.push(diffLine);
                    result.stats.added++;
                    newLineNum++;
                }
                
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                if (currentFile && currentFile.hunks.length > 0) {
                    const currentHunk = currentFile.hunks[currentFile.hunks.length - 1];
                    const diffLine = {
                        type: 'removed',
                        content: line.substring(1),
                        lineNumber: oldLineNum,
                        raw: line
                    };
                    currentHunk.lines.push(diffLine);
                    result.stats.removed++;
                    oldLineNum++;
                }
                
            } else if (line.startsWith(' ') || (!this.isSpecialLine(line) && line.length > 0)) {
                if (currentFile && currentFile.hunks.length > 0) {
                    const currentHunk = currentFile.hunks[currentFile.hunks.length - 1];
                    const diffLine = {
                        type: 'context',
                        content: line.startsWith(' ') ? line.substring(1) : line,
                        oldLineNumber: oldLineNum,
                        newLineNumber: newLineNum,
                        raw: line
                    };
                    currentHunk.lines.push(diffLine);
                    oldLineNum++;
                    newLineNum++;
                }
            }
        }

        // 마지막 파일 추가
        if (currentFile) {
            result.files.push(currentFile);
        }

        return result;
    }

    parseFileHeader(line) {
        const match = line.match(/diff --git a\/(.*?) b\/(.*?)$/);
        return {
            oldPath: match ? match[1] : 'unknown',
            newPath: match ? match[2] : 'unknown',
            type: 'modified',
            index: '',
            hunks: [] // 파일별 hunk 배열 초기화
        };
    }

    parseFilePathInfo(line, currentFile) {
        if (!currentFile) return;
        
        if (line.startsWith('--- ')) {
            const path = line.substring(4);
            if (path === '/dev/null') {
                currentFile.type = 'added';
            }
        } else if (line.startsWith('+++ ')) {
            const path = line.substring(4);
            if (path === '/dev/null') {
                currentFile.type = 'deleted';
            }
        }
    }

    isSpecialLine(line) {
        return line.startsWith('diff ') || 
               line.startsWith('index ') || 
               line.startsWith('--- ') || 
               line.startsWith('+++ ') || 
               line.startsWith('@@');
    }

    // 다른 메소드들은 그대로 유지...

    /**
     * Git show 출력 파싱 (여러 커밋 지원) - 개선된 버전
     */
    parseShow(showOutput) {
        const lines = showOutput.split('\n');
        const commits = [];
        let currentCommit = null;
        let messageLines = [];
        let diffLines = [];
        let inMessage = false;
        let inDiff = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('commit ')) {
                // 이전 커밋 저장
                if (currentCommit) {
                    // 메시지 정리
                    currentCommit.message = messageLines.join('\n').trim();
                    
                    // diff 파싱
                    if (diffLines.length > 0) {
                        const diffText = diffLines.join('\n');
                        currentCommit.diff = this.parseDiff(diffText);
                    }
                    
                    commits.push(currentCommit);
                }

                // 새 커밋 시작
                currentCommit = {
                    hash: line.substring(7),
                    author: '',
                    date: '',
                    message: '',
                    diff: null
                };
                
                // 상태 초기화
                messageLines = [];
                diffLines = [];
                inMessage = false;
                inDiff = false;

            } else if (line.startsWith('Author: ') && currentCommit) {
                currentCommit.author = line.substring(8);
                
            } else if (line.startsWith('Date: ') && currentCommit) {
                currentCommit.date = line.substring(6);
                inMessage = true; // Date 이후부터 메시지 시작
                
            } else if (line.startsWith('diff --git')) {
                inDiff = true;
                inMessage = false;
                diffLines = [line]; // diff 시작
                
            } else if (inDiff) {
                // diff 내용 수집 (다음 commit이 나올 때까지)
                if (line.startsWith('commit ')) {
                    // 새로운 커밋이 시작되면 diff 종료
                    inDiff = false;
                    i--; // 현재 라인을 다시 처리하기 위해 인덱스 감소
                } else {
                    diffLines.push(line);
                }
                
            } else if (inMessage && currentCommit && !inDiff) {
                // 커밋 메시지 수집 (diff가 시작되기 전까지)
                if (line.trim() === '') {
                    // 빈 라인은 메시지 끝을 의미할 수 있음
                    if (messageLines.length > 0) {
                        // 이미 메시지가 있다면 빈 라인도 추가
                        messageLines.push('');
                    }
                } else if (line.startsWith('    ')) {
                    // 들여쓰기된 메시지
                    messageLines.push(line.substring(4));
                } else if (line.startsWith('diff --git')) {
                    // diff 시작이면 메시지 종료
                    inMessage = false;
                    inDiff = true;
                    diffLines = [line];
                } else if (line.trim().length > 0) {
                    // 일반 메시지 라인
                    messageLines.push(line.trim());
                }
            }
        }

        // 마지막 커밋 처리
        if (currentCommit) {
            currentCommit.message = messageLines.join('\n').trim();
            
            if (diffLines.length > 0) {
                const diffText = diffLines.join('\n');
                currentCommit.diff = this.parseDiff(diffText);
            }
            
            commits.push(currentCommit);
        }

        // 여러 커밋이면 배열로 반환
        if (commits.length > 1) {
            return {
                commits: commits,
                isMultiple: true
            };
        } else if (commits.length === 1) {
            return {
                commit: commits[0],
                diff: commits[0].diff
            };
        } else {
            return {
                commit: { hash: '', author: '', date: '', message: '' },
                diff: null
            };
        }
    }


}

module.exports = { GitParser };