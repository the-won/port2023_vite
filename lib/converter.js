const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { GitParser } = require('./parser');
const { HTMLTemplate } = require('./template');
const { formatBytes, getCurrentTimestamp } = require('./utils');

class GitToHTMLConverter {
    constructor(options = {}) {
        this.options = {
            theme: 'dark',
            includeStats: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            ...options
        };
        this.parser = new GitParser();
        this.template = new HTMLTemplate(this.options.theme);
    }

    /**
     * Git 명령어 실행
     */
    async executeGitCommand(command, args = []) {
        return new Promise((resolve, reject) => {
            const fullCommand = `git ${command} ${args.join(' ')}`;
            console.log(chalk.blue(`🔄 실행중: ${fullCommand}`));

            exec(fullCommand, { 
                cwd: process.cwd(),
                maxBuffer: this.options.maxFileSize 
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Git 명령어 실행 실패: ${error.message}`));
                    return;
                }
                
                if (stderr) {
                    console.warn(chalk.yellow(`⚠️  Warning: ${stderr}`));
                }
                
                resolve(stdout);
            });
        });
    }

    /**
     * Diff를 HTML로 변환
     */
    async convertDiff(gitArgs = [], outputPath = 'git-diff.html') {
        try {
            const gitOutput = await this.executeGitCommand('diff', gitArgs);
            
            if (!gitOutput.trim()) {
                console.log(chalk.yellow('📭 변경사항이 없습니다.'));
                return;
            }

            const parsedData = this.parser.parseDiff(gitOutput);
            const htmlContent = this.template.generateDiffHTML(parsedData);
            
            await this.saveFile(htmlContent, outputPath);
            this.printStats(parsedData);
            
        } catch (error) {
            console.error(chalk.red(`❌ Diff 변환 실패: ${error.message}`));
            throw error;
        }
    }

    // lib/converter.js에서 convertShow 메소드 확인 및 수정

async convertShow(gitArgs = [], outputPath = 'git-show.html') {
    try {
        console.log('🔍 Debug: Git show 명령어 실행 중...');
        console.log('🔍 Debug: gitArgs =', gitArgs);
        
        const gitOutput = await this.executeGitCommand('show', gitArgs);
        
        console.log('🔍 Debug: Git 출력 길이 =', gitOutput.length);
        console.log('🔍 Debug: Git 출력 (첫 200자) =', gitOutput.substring(0, 200));
        
        if (!gitOutput.trim()) {
            console.log('📭 show 결과가 없습니다.');
            return;
        }

        console.log('🔍 Debug: show 파싱 시작...');
        const parsedData = this.parser.parseShow(gitOutput);
        
        console.log('🔍 Debug: show 파싱 결과 =', {
            commit: parsedData.commit,
            hasDiff: !!parsedData.diff
        });
        
        console.log('🔍 Debug: show HTML 생성 시작...');
        const htmlContent = this.template.generateShowHTML(parsedData);
        
        console.log('🔍 Debug: HTML 길이 =', htmlContent.length);
        console.log('🔍 Debug: 파일 저장 시작...');
        
        await this.saveFile(htmlContent, outputPath);
        
        if (parsedData.diff) {
            this.printStats(parsedData.diff);
        }
        
    } catch (error) {
        console.error(`❌ Show 변환 실패: ${error.message}`);
        throw error;
    }
}

    /**
     * Log를 HTML로 변환
     */
    async convertLog(gitArgs = [], outputPath = 'git-log.html') {
        try {
            const gitOutput = await this.executeGitCommand('log', gitArgs);
            
            if (!gitOutput.trim()) {
                console.log(chalk.yellow('📭 로그가 없습니다.'));
                return;
            }

            const parsedData = this.parser.parseLog(gitOutput);
            const htmlContent = this.template.generateLogHTML(parsedData);
            
            await this.saveFile(htmlContent, outputPath);
            console.log(chalk.green(`📊 ${parsedData.commits.length}개의 커밋을 변환했습니다.`));
            
        } catch (error) {
            console.error(chalk.red(`❌ Log 변환 실패: ${error.message}`));
            throw error;
        }
    }

    /**
     * Show를 HTML로 변환
     */
    async convertShow(gitArgs = [], outputPath = 'git-show.html') {
        try {
            const gitOutput = await this.executeGitCommand('show', gitArgs);
            const parsedData = this.parser.parseShow(gitOutput);
            const htmlContent = this.template.generateShowHTML(parsedData);
            
            await this.saveFile(htmlContent, outputPath);
            
        } catch (error) {
            console.error(chalk.red(`❌ Show 변환 실패: ${error.message}`));
            throw error;
        }
    }

    /**
     * 파일 저장
     */
    async saveFile(content, outputPath) {
        try {
            await fs.ensureDir(path.dirname(outputPath));
            await fs.writeFile(outputPath, content, 'utf8');
            
            const stats = await fs.stat(outputPath);
            console.log(chalk.green(`✅ HTML 파일 생성 완료!`));
            console.log(chalk.gray(`   📁 경로: ${path.resolve(outputPath)}`));
            console.log(chalk.gray(`   📊 크기: ${formatBytes(stats.size)}`));
            
        } catch (error) {
            throw new Error(`파일 저장 실패: ${error.message}`);
        }
    }

    /**
     * 통계 정보 출력
     */
    printStats(parsedData) {
        if (!this.options.includeStats) return;

        console.log(chalk.cyan('\n📈 변경 통계:'));
        console.log(chalk.green(`   + ${parsedData.stats.added} 라인 추가`));
        console.log(chalk.red(`   - ${parsedData.stats.removed} 라인 삭제`));
        console.log(chalk.blue(`   📁 ${parsedData.files.length} 파일 변경`));
    }
}

module.exports = { GitToHTMLConverter };