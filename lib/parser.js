const { escapeHtml, parseHunkHeader } = require('./utils');

class GitParser {
    constructor() {
        this.stats = { added: 0, removed: 0 };
    }

    /**
     * Git diff 출력 파싱
     */
    parseDiff(diffOutput) {
        const lines = diffOutput.split('\n');
        const result = {
            files: [],
            hunks: [],
            stats: { added: 0, removed: 0 },
            timestamp: new Date().toISOString()
        };

        let currentFile = null;
        let currentHunk = null;
        let oldLineNum = 0;
        let newLineNum = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('diff --git')) {
                // 새 파일 시작
                currentFile = this.parseFileHeader(line);
                result.files.push(currentFile);
                
            } else if (line.startsWith('index ')) {
                // 인덱스 정보
                if (currentFile) {
                    currentFile.index = line.substring(6);
                }
                
            } else if (line.startsWith('--- ') || line.startsWith('+++ ')) {
                // 파일 경로 정보
                this.parseFilePathInfo(line, currentFile);
                
            } else if (line.startsWith('@@')) {
                // Hunk 헤더
                currentHunk = this.parseHunkInfo(line);
                result.hunks.push(currentHunk);
                
                const hunkData = parseHunkHeader(line);
                if (hunkData) {
                    oldLineNum = hunkData.oldStart;
                    newLineNum = hunkData.newStart;
                }
                
            } else if (line.startsWith('+') && !line.startsWith('+++')) {
                // 추가된 라인
                const diffLine = {
                    type: 'added',
                    content: line.substring(1),
                    lineNumber: newLineNum,
                    raw: line
                };
                
                if (currentHunk) {
                    currentHunk.lines.push(diffLine);
                }
                
                result.stats.added++;
                newLineNum++;
                
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                // 삭제된 라인
                const diffLine = {
                    type: 'removed',
                    content: line.substring(1),
                    lineNumber: oldLineNum,
                    raw: line
                };
                
                if (currentHunk) {
                    currentHunk.lines.push(diffLine);
                }
                
                result.stats.removed++;
                oldLineNum++;
                
            } else if (line.startsWith(' ') || (!this.isSpecialLine(line) && line.length > 0)) {
                // 컨텍스트 라인
                const diffLine = {
                    type: 'context',
                    content: line.startsWith(' ') ? line.substring(1) : line,
                    oldLineNumber: oldLineNum,
                    newLineNumber: newLineNum,
                    raw: line
                };
                
                if (currentHunk) {
                    currentHunk.lines.push(diffLine);
                }
                
                oldLineNum++;
                newLineNum++;
            }
        }

        return result;
    }

    /**
     * Git log 출력 파싱
     */
    parseLog(logOutput) {
        const commits = [];
        const lines = logOutput.split('\n');
        let currentCommit = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('commit ')) {
                if (currentCommit) {
                    commits.push(currentCommit);
                }
                
                currentCommit = {
                    hash: line.substring(7),
                    author: '',
                    date: '',
                    message: '',
                    files: []
                };
                
            } else if (line.startsWith('Author: ') && currentCommit) {
                currentCommit.author = line.substring(8);
                
            } else if (line.startsWith('Date: ') && currentCommit) {
                currentCommit.date = line.substring(6);
                
            } else if (line.trim() && currentCommit && !line.startsWith(' ')) {
                // 커밋 메시지 (들여쓰기된 라인)
                if (line.startsWith('    ')) {
                    currentCommit.message += line.substring(4) + '\n';
                }
            }
        }

        if (currentCommit) {
            commits.push(currentCommit);
        }

        return {
            commits,
            totalCount: commits.length,
            timestamp: new Date().toISOString()
        };
    }

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
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.startsWith('commit ')) {
                result.commit.hash = line.substring(7);
            } else if (line.startsWith('Author: ')) {
                result.commit.author = line.substring(8);
            } else if (line.startsWith('Date: ')) {
                result.commit.date = line.substring(6);
            } else if (line.startsWith('    ') && result.commit.message === '') {
                result.commit.message = line.substring(4);
            } else if (line.startsWith('diff --git')) {
                diffStartIndex = i;
                break;
            }
        }

        // Diff 부분이 있으면 파싱
        if (diffStartIndex >= 0) {
            const diffLines = lines.slice(diffStartIndex).join('\n');
            result.diff = this.parseDiff(diffLines);
        }

        return result;
    }

    /**
     * 파일 헤더 파싱
     */
    parseFileHeader(line) {
        const match = line.match(/diff --git a\/(.*?) b\/(.*?)$/);
        return {
            oldPath: match ? match[1] : 'unknown',
            newPath: match ? match[2] : 'unknown',
            type: 'modified', // modified, added, deleted
            index: ''
        };
    }

    /**
     * 파일 경로 정보 파싱
     */
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

    /**
     * Hunk 정보 파싱
     */
    parseHunkInfo(line) {
        return {
            header: line,
            lines: [],
            context: line.split('@@')[2] || ''
        };
    }

    /**
     * 특수 라인 체크
     */
    isSpecialLine(line) {
        return line.startsWith('diff ') || 
               line.startsWith('index ') || 
               line.startsWith('--- ') || 
               line.startsWith('+++ ') || 
               line.startsWith('@@');
    }
}

module.exports = { GitParser };