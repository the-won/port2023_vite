const { escapeHtml, getCurrentTimestamp } = require('./utils');

class HTMLTemplate {
    constructor(theme = 'dark') {
        this.theme = theme;
    }

    /**
     * 기본 CSS 스타일 반환
     */
    getBaseStyles() {
        const darkTheme = `
            body { 
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace; 
                background: #0d1117; 
                color: #e6edf3; 
                margin: 0; 
                padding: 0;
                line-height: 1.5;
            }
            .container { 
                max-width: 1200px; 
                margin: 0 auto; 
                padding: 20px; 
            }
            .header { 
                background: #21262d; 
                padding: 20px; 
                border-radius: 8px; 
                margin-bottom: 20px;
                border: 1px solid #30363d;
            }
            .file-header { 
                background: #21262d; 
                padding: 15px 20px; 
                border-bottom: 1px solid #30363d;
                border-top: 1px solid #30363d;
                margin: 20px 0 0 0;
            }
            .file-path { 
                font-size: 16px; 
                font-weight: bold; 
                color: #58a6ff; 
                margin-bottom: 8px; 
            }
            .diff-stats { 
                display: flex; 
                gap: 15px; 
                font-size: 13px; 
            }
            .stat-added { color: #3fb950; }
            .stat-removed { color: #f85149; }
            .line { 
                display: flex; 
                font-size: 13px; 
                border-bottom: 1px solid #21262d;
                min-height: 20px;
            }
            .line-number { 
                width: 60px; 
                text-align: center; 
                padding: 4px 8px; 
                background: #161b22; 
                border-right: 1px solid #30363d; 
                color: #7d8590; 
                font-size: 11px; 
                user-select: none;
                flex-shrink: 0;
            }
            .line-content { 
                flex: 1; 
                padding: 4px 12px; 
                white-space: pre-wrap; 
                overflow-x: auto;
                word-break: break-all;
            }
            .line-added { 
                background: #0d4429; 
                border-left: 3px solid #3fb950; 
            }
            .line-added .line-number { 
                background: #0d4429; 
                color: #3fb950; 
            }
            .line-removed { 
                background: #5d1a1d; 
                border-left: 3px solid #f85149; 
            }
            .line-removed .line-number { 
                background: #5d1a1d; 
                color: #f85149; 
            }
            .hunk-header { 
                background: #1c2128; 
                color: #7d8590; 
                padding: 8px 12px; 
                font-weight: bold; 
                border-bottom: 1px solid #30363d;
                border-top: 1px solid #30363d;
                margin: 10px 0;
            }
            .commit-item {
                background: #161b22;
                border: 1px solid #30363d;
                border-radius: 6px;
                margin: 15px 0;
                padding: 20px;
            }
            .commit-hash {
                font-family: monospace;
                color: #58a6ff;
                font-weight: bold;
            }
            .commit-author {
                color: #7d8590;
                margin: 5px 0;
            }
            .commit-date {
                color: #7d8590;
                font-size: 12px;
            }
            .commit-message {
                margin: 10px 0;
                white-space: pre-wrap;
            }
        `;

        return this.theme === 'dark' ? darkTheme : this.getLightTheme();
    }

    /**
     * Diff HTML 생성
     */
    generateDiffHTML(parsedData) {
        const { files, hunks, stats, timestamp } = parsedData;
        
        const filesHTML = files.map(file => {
            const fileHunks = hunks.filter(hunk => 
                hunk.lines && hunk.lines.length > 0
            );
            
            return `
                <div class="file-header">
                    <div class="file-path">📁 ${escapeHtml(file.newPath || file.oldPath)}</div>
                    <div class="diff-stats">
                        <span class="stat-added">+ ${this.countFileLines(fileHunks, 'added')}</span>
                        <span class="stat-removed">- ${this.countFileLines(fileHunks, 'removed')}</span>
                    </div>
                </div>
                ${fileHunks.map(hunk => this.generateHunkHTML(hunk)).join('')}
            `;
        }).join('');

        return this.wrapInHTMLTemplate('Git Diff Report', `
            <div class="header">
                <h1>📊 Git Diff Report</h1>
                <p>생성 시간: ${timestamp}</p>
                <div class="diff-stats">
                    <span class="stat-added">+ ${stats.added} 라인 추가</span>
                    <span class="stat-removed">- ${stats.removed} 라인 삭제</span>
                    <span style="color: #58a6ff;">📁 ${files.length} 파일 변경</span>
                </div>
            </div>
            <div class="diff-content">
                ${filesHTML}
            </div>
        `);
    }

    /**
     * Log HTML 생성
     */
    generateLogHTML(parsedData) {
        const { commits, totalCount, timestamp } = parsedData;
        
        const commitsHTML = commits.map(commit => `
            <div class="commit-item">
                <div class="commit-hash">${escapeHtml(commit.hash)}</div>
                <div class="commit-author">👤 ${escapeHtml(commit.author)}</div>
                <div class="commit-date">🕒 ${escapeHtml(commit.date)}</div>
                <div class="commit-message">${escapeHtml(commit.message.trim())}</div>
            </div>
        `).join('');

        return this.wrapInHTMLTemplate('Git Log Report', `
            <div class="header">
                <h1>📚 Git Log Report</h1>
                <p>생성 시간: ${timestamp}</p>
                <p>총 ${totalCount}개의 커밋</p>
            </div>
            <div class="log-content">
                ${commitsHTML}
            </div>
        `);
    }

    /**
     * Show HTML 생성
     */
    generateShowHTML(parsedData) {
        const { commit, diff } = parsedData;
        
        const diffHTML = diff ? this.generateDiffContent(diff) : '<p>변경사항이 없습니다.</p>';
        
        return this.wrapInHTMLTemplate('Git Show Report', `
            <div class="header">
                <h1>🔍 Git Show Report</h1>
                <div class="commit-info">
                    <div class="commit-hash">${escapeHtml(commit.hash)}</div>
                    <div class="commit-author">👤 ${escapeHtml(commit.author)}</div>
                    <div class="commit-date">🕒 ${escapeHtml(commit.date)}</div>
                    <div class="commit-message">${escapeHtml(commit.message)}</div>
                </div>
            </div>
            <div class="show-content">
                ${diffHTML}
            </div>
        `);
    }

    /**
     * Hunk HTML 생성
     */
    generateHunkHTML(hunk) {
        const linesHTML = hunk.lines.map(line => {
            const lineClass = `line line-${line.type}`;
            const lineNumber = this.getLineNumber(line);
            
            return `
                <div class="${lineClass}">
                    <div class="line-number">${lineNumber}</div>
                    <div class="line-content">${escapeHtml(line.content)}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="hunk-header">${escapeHtml(hunk.header)}</div>
            ${linesHTML}
        `;
    }

    /**
     * 라인 번호 생성
     */
    getLineNumber(line) {
        switch (line.type) {
            case 'added':
                return `+${line.lineNumber}`;
            case 'removed':
                return `-${line.lineNumber}`;
            case 'context':
                return line.oldLineNumber || line.newLineNumber || '';
            default:
                return '';
        }
    }

    /**
     * 파일별 라인 수 계산
     */
    countFileLines(hunks, type) {
        return hunks.reduce((count, hunk) => {
            return count + hunk.lines.filter(line => line.type === type).length;
        }, 0);
    }

    /**
     * HTML 템플릿으로 감싸기
     */
    wrapInHTMLTemplate(title, content) {
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <style>${this.getBaseStyles()}</style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
    }

    /**
     * 라이트 테마 (선택사항)
     */
    getLightTheme() {
        // 라이트 테마 CSS 구현
        return `/* Light theme styles */`;
    }
}

module.exports = { HTMLTemplate };