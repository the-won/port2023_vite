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
     * Git show 출력 파싱
     */
    parseShow(showOutput) {
        const lines = showOutput.split('\n');
        const result = {
            commit: {
                hash: '',
                author: '',
                date: '',
                message: ''
            },
            diff: null
        };

        let diffStartIndex = -1;
        let messageLines = [];
        let inMessage = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('commit ')) {
                result.commit.hash = line.substring(7);
            } else if (line.startsWith('Author: ')) {
                result.commit.author = line.substring(8);
            } else if (line.startsWith('Date: ')) {
                result.commit.date = line.substring(6);
                inMessage = true; // Date 이후부터 메시지 시작
            } else if (inMessage && line.startsWith('diff --git')) {
                diffStartIndex = i;
                break;
            } else if (inMessage && line.trim() !== '') {
                // 커밋 메시지 수집 (공백 라인 제외)
                if (line.startsWith('    ')) {
                    messageLines.push(line.substring(4));
                } else if (!line.startsWith(' ') && line.length > 0) {
                    messageLines.push(line);
                }
            }
        }

        // 커밋 메시지 정리
        result.commit.message = messageLines.join('\n').trim();

        // Diff 부분이 있으면 파싱
        if (diffStartIndex >= 0) {
            const diffLines = lines.slice(diffStartIndex).join('\n');
            result.diff = this.parseDiff(diffLines);
        }

        return result;
    }


}

module.exports = { GitParser };