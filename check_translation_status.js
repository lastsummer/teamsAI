const fs = require('fs');
const path = require('path');

// Read daily_report.html
const reportPath = path.join(__dirname, 'daily_report.html');
const reportHtml = fs.readFileSync(reportPath, 'utf8');

// Extract featured articles
const featuredRegex = /<span class="featured-rank">#(\d+)<\/span>[\s\S]*?<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
const bilinguallinkRegex = /<a class="bilingual-link" href="articles\/article_(\d+).html">中文導讀 →<\/a>/g;

const featuredArticles = [];
let match;

while ((match = featuredRegex.exec(reportHtml)) !== null) {
  const rank = parseInt(match[1]);
  const url = match[2];
  const title = match[3];
  featuredArticles.push({ rank, url, title });
}

// Check which articles have bilingual versions
const bilingualArticles = new Set();
while ((match = bilinguallinkRegex.exec(reportHtml)) !== null) {
  bilingualArticles.add(parseInt(match[1]));
}

// Read articles directory
const articlesDir = path.join(__dirname, 'articles');
const existingFiles = fs.existsSync(articlesDir) 
  ? fs.readdirSync(articlesDir).filter(f => f.match(/^article_\d+\.html$/))
  : [];

// Read the original JSON to detect language
const archiveDir = path.join(__dirname, 'archive', 'AI news');
const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json')).sort();
const latestFile = files[files.length - 1];
const jsonPath = path.join(archiveDir, latestFile);
const messages = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Helper to detect language
function detectLanguage(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const total = chineseChars + englishChars;
  
  if (total === 0) return '無法判定';
  
  const chineseRatio = chineseChars / total;
  const englishRatio = englishChars / total;
  
  if (chineseRatio > 0.5) return '中文文章';
  if (englishRatio > 0.8) return '英文文章';
  return '混合語言';
}

// Strip HTML
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Build a map of articles by URL
const articlesByUrl = new Map();
messages.forEach(msg => {
  if (msg.messageType !== 'message') return;
  const content = msg.body?.content || '';
  if (!content) return;
  
  const linkMatch = content.match(/<a href="([^"]+)"/);
  if (!linkMatch) return;
  
  const url = linkMatch[1];
  const text = stripHtml(content);
  const language = detectLanguage(text);
  
  articlesByUrl.set(url, { text, language });
});

// Generate report
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  Teams AI 日報 - 雙語導讀翻譯狀態報告');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`📊 統計資訊：`);
console.log(`   • 必讀文章總數：${featuredArticles.length} 篇`);
console.log(`   • 已生成雙語版本：${bilingualArticles.size} 篇`);
console.log(`   • 現有雙語檔案：${existingFiles.length} 個檔案\n`);

console.log('─────────────────────────────────────────────────────────\n');

let englishCount = 0;
let chineseCount = 0;
let mixedCount = 0;
let unknownCount = 0;
let hasTranslationCount = 0;

featuredArticles.forEach(article => {
  const { rank, url, title } = article;
  const hasTranslation = bilingualArticles.has(rank);
  const fileExists = existingFiles.includes(`article_${rank}.html`);
  
  // Get language from original messages
  const articleData = articlesByUrl.get(url);
  const language = articleData ? articleData.language : '無法判定';
  
  // Count by language
  if (language === '中文文章') chineseCount++;
  else if (language === '英文文章') englishCount++;
  else if (language === '混合語言') mixedCount++;
  else unknownCount++;
  
  if (hasTranslation) hasTranslationCount++;
  
  // Determine status and reason
  let status = '';
  let reason = '';
  
  if (hasTranslation && fileExists) {
    status = '✅ 已翻譯';
    reason = '已生成雙語 HTML';
  } else if (language === '中文文章') {
    status = '⏭️  已跳過';
    reason = '中文文章';
  } else if (language === '英文文章' && !hasTranslation) {
    status = '❌ 未翻譯';
    reason = '待處理';
  } else if (language === '混合語言') {
    status = '⏭️  已跳過';
    reason = '混合語言';
  } else {
    status = '❓ 未知';
    reason = '語言無法判定';
  }
  
  console.log(`${status} #${rank}. ${title}`);
  console.log(`   語言：${language}`);
  console.log(`   原因：${reason}`);
  console.log(`   連結：${url}`);
  console.log();
});

console.log('─────────────────────────────────────────────────────────\n');

console.log('📈 語言分布：');
console.log(`   ■ 中文文章：${chineseCount} 篇 (${Math.round(chineseCount/featuredArticles.length*100)}%)`);
console.log(`   ■ 英文文章：${englishCount} 篇 (${Math.round(englishCount/featuredArticles.length*100)}%)`);
console.log(`   ■ 混合語言：${mixedCount} 篇 (${Math.round(mixedCount/featuredArticles.length*100)}%)`);
console.log(`   ■ 無法判定：${unknownCount} 篇 (${Math.round(unknownCount/featuredArticles.length*100)}%)\n`);

console.log('🔄 翻譯進度：');
const translationRate = Math.round(hasTranslationCount / englishCount * 100);
console.log(`   ${hasTranslationCount} / ${englishCount} 篇英文文章已翻譯 (${translationRate}%)`);

const remaining = englishCount - hasTranslationCount;
if (remaining > 0) {
  console.log(`   ⚠️  還有 ${remaining} 篇英文文章待翻譯\n`);
} else {
  console.log(`   ✅ 所有英文文章已完成翻譯！\n`);
}

console.log('═══════════════════════════════════════════════════════════\n');
