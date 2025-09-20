#!/usr/bin/env node

const path = require('path');
const { Command } = require('commander');
const { GitToHTMLConverter } = require('../lib/converter');

const program = new Command();

program
  .name('git2html')
  .description('Git 명령어 결과를 HTML로 변환')
  .version('1.0.0');

// diff 명령어
program
  .command('diff')
  .description('git diff를 HTML로 변환')
  .argument('[git-options...]', 'git diff 옵션들')
  .option('-o, --output <file>', '출력 파일명', 'git-diff.html')
  .action(async (gitOptions, options) => {
    try {
      console.log('🔍 Debug: gitOptions =', gitOptions);
      console.log('🔍 Debug: output =', options.output);
      console.log('🔍 Debug: 변환 시작...');
      
      const converter = new GitToHTMLConverter();
      await converter.convertDiff(gitOptions, options.output);
      
      console.log('🔍 Debug: 변환 완료!');
    } catch (error) {
      console.error('❌ 변환 실패:', error.message);
      console.error('❌ 스택:', error.stack);
      process.exit(1);
    }
  });

// log 명령어
program
  .command('log')
  .description('git log를 HTML로 변환')
  .argument('[git-options...]', 'git log 옵션들')
  .option('-o, --output <file>', '출력 파일명', 'git-log.html')
  .action(async (gitOptions, options) => {
    try {
      console.log('🔍 Debug: gitOptions =', gitOptions);
      console.log('🔍 Debug: output =', options.output);
      console.log('🔍 Debug: 변환 시작...');
      
      const converter = new GitToHTMLConverter();
      await converter.convertLog(gitOptions, options.output);
      
      console.log('🔍 Debug: 변환 완료!');
    } catch (error) {
      console.error('❌ 변환 실패:', error.message);
      console.error('❌ 스택:', error.stack);
      process.exit(1);
    }
  });

// show 명령어 추가
program
  .command('show')
  .description('git show를 HTML로 변환')
  .argument('[git-options...]', 'git show 옵션들')
  .option('-o, --output <file>', '출력 파일명', 'git-show.html')
  .action(async (gitOptions, options) => {
    try {
      console.log('🔍 Debug: gitOptions =', gitOptions);
      console.log('🔍 Debug: output =', options.output);
      console.log('🔍 Debug: show 변환 시작...');
      
      const converter = new GitToHTMLConverter();
      await converter.convertShow(gitOptions, options.output);
      
      console.log('🔍 Debug: show 변환 완료!');
    } catch (error) {
      console.error('❌ show 변환 실패:', error.message);
      console.error('❌ 스택:', error.stack);
      process.exit(1);
    }
  });

program.parse();