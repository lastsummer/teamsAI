const fs = require('fs');
const path = require('path');

// Read the latest JSON file
const archiveDir = path.join(__dirname, 'archive', 'AI news');
const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json')).sort();
const latestFile = files[files.length - 1];
const jsonPath = path.join(archiveDir, latestFile);
const messages = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Processing ${messages.length} messages from ${latestFile}...`);

// Helper function to extract text from HTML
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Helper function to extract link from HTML
function extractLink(html) {
  const match = html.match(/<a href="([^"]+)"/);
  return match ? match[1] : null;
}

// Helper function to extract title from HTML
function extractTitle(html) {
  const h1Match = html.match(/<h1>(.*?)<\/h1>/s);
  if (h1Match) {
    return stripHtml(h1Match[1]);
  }
  const lines = stripHtml(html).split(/\n+/);
  return lines[0] || 'Untitled';
}

// Filter and process messages
const articles = messages
  .filter(msg => {
    // Only keep messages
    if (msg.messageType !== 'message') return false;
    
    // Exclude direct messages from Claudia Zhou (keep workflow bot messages on behalf of her)
    const directSender = msg.from?.user?.displayName;
    if (directSender === 'Claudia Zhou 周家芸') return false;
    
    // Exclude empty content
    const content = msg.body?.content || '';
    if (!content || content.trim() === '' || content === '<p></p>') return false;
    
    return true;
  })
  .map(msg => {
    const content = msg.body.content;
    const title = extractTitle(content);
    const link = extractLink(content) || msg.webUrl;
    const text = stripHtml(content);
    const time = new Date(msg.createdDateTime);
    
    return {
      title,
      link,
      text,
      time,
      raw: content
    };
  });

console.log(`Filtered to ${articles.length} valid articles`);

// Generate summaries and tags for each article
const processedArticles = articles.map(article => {
  // Generate Chinese summary based on existing text (simplified approach)
  const summary = generateSummary(article.text, article.title);
  const tags = generateTags(article.title, article.text);
  const important = isImportantForProgrammers(article.title, article.text);
  
  return {
    ...article,
    summary,
    tags,
    important
  };
});

// Generate summary (simplified - in real implementation would use AI)
function generateSummary(text, title) {
  // Extract first meaningful sentences (up to 100 chars)
  const lines = text.split(/[\n\r]+/).filter(l => l.length > 20);
  let summary = '';
  for (const line of lines) {
    if (line.includes('http')) continue; // Skip URLs
    if (line.includes('via ')) continue; // Skip source lines
    if (line.match(/\d{4} at \d+:\d+/)) continue; // Skip timestamps
    summary += line + ' ';
    if (summary.length >= 80) break;
  }
  return summary.substring(0, 100).trim() + (summary.length > 100 ? '...' : '');
}

// Generate tags based on content
function generateTags(title, text) {
  const tags = new Set();
  const combined = (title + ' ' + text).toLowerCase();
  
  // Define tag keywords
  const tagMap = {
    '#Claude': ['claude', 'anthropic'],
    '#ClaudeCode': ['claude code', 'claude-code'],
    '#AI開發工具': ['ai tool', 'ai開發', 'development tool', 'copilot', 'cursor'],
    '#MCP': ['mcp', 'model context protocol'],
    '#GitHubCopilot': ['github copilot', 'copilot'],
    '#Vibe coding': ['vibe coding', 'vibecoding'],
    '#OpenAI': ['openai', 'chatgpt', 'gpt'],
    '#程式設計': ['programming', '程式', 'coding', 'developer'],
    '#職場影響': ['job', '工作', '職場', 'career', 'employment'],
    '#安全': ['security', 'cve', '安全', 'vulnerability'],
    '#LLM': ['llm', 'large language model', 'model'],
    '#Workflow': ['workflow', 'automation', 'task'],
    '#Microsoft': ['microsoft', 'copilot health'],
    '#健康': ['health', 'medical', '健康', '醫療'],
    '#API': ['api'],
    '#開源': ['open source', 'opensource', '開源', 'github'],
    '#提示工程': ['prompt', 'prompting'],
    '#Agent': ['agent', 'multi-agent', 'agentic']
  };
  
  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some(kw => combined.includes(kw))) {
      tags.add(tag);
    }
  }
  
  return Array.from(tags).slice(0, 5); // Max 5 tags
}

// Determine if article is important for programmers
function isImportantForProgrammers(title, text) {
  const combined = (title + ' ' + text).toLowerCase();
  
  // High priority keywords
  const highPriority = [
    'claude code', 'github copilot', 'cursor', 'mcp', 'sdk', 'api',
    'tool', 'framework', 'development', 'coding', 'programming',
    'vibe coding', 'agent', 'automation', 'workflow'
  ];
  
  // Job/career related
  const careerKeywords = ['job', 'career', 'employment', '職場', '工作', '招聘'];
  
  // Security related
  const securityKeywords = ['security', 'cve', 'vulnerability', '安全', '漏洞'];
  
  const hasHighPriority = highPriority.some(kw => combined.includes(kw));
  const hasCareer = careerKeywords.some(kw => combined.includes(kw));
  const hasSecurity = securityKeywords.some(kw => combined.includes(kw));
  
  return hasHighPriority || hasCareer || hasSecurity;
}

// Select top important articles (max 20)
const importantArticles = processedArticles
  .filter(a => a.important)
  .slice(0, 20)
  .map((a, i) => ({
    rank: i + 1,
    ...a,
    reason: generateReason(a.title, a.text)
  }));

function generateReason(title, text) {
  const combined = (title + ' ' + text).toLowerCase();
  
  if (combined.includes('claude code') || combined.includes('github copilot')) {
    return 'AI 編碼工具的實用技巧或重大更新，直接提升開發效率';
  }
  if (combined.includes('mcp') || combined.includes('model context protocol')) {
    return 'MCP 協定相關工具或安全議題，影響 AI 應用開發架構';
  }
  if (combined.includes('security') || combined.includes('cve')) {
    return '安全漏洞或最佳實踐，關乎 AI 應用的安全性';
  }
  if (combined.includes('job') || combined.includes('career') || combined.includes('職場')) {
    return '直接影響程式設計師就業市場或職涯發展的趨勢分析';
  }
  if (combined.includes('vibe coding') || combined.includes('agent')) {
    return '新興開發範式或工作流程，可能改變未來編碼方式';
  }
  if (combined.includes('workflow') || combined.includes('automation')) {
    return '自動化工作流程的實用案例，可應用於日常開發';
  }
  
  return '值得關注的技術發展或工具更新';
}

// Count tags
const tagCounts = {};
processedArticles.forEach(article => {
  article.tags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
});

const sortedTags = Object.entries(tagCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([tag, count]) => ({ tag, count }));

// Generate HTML
const date = new Date();
const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

let html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Teams AI 日報 - ${dateStr}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0f1117;
    color: #e2e8f0;
    min-height: 100vh;
    padding: 2rem 1rem;
  }
  .header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .header h1 {
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .header .meta {
    color: #718096;
    font-size: 0.9rem;
    margin-top: 0.4rem;
  }
  .count-badge {
    display: inline-block;
    background: #2d3748;
    color: #9f7aea;
    font-size: 0.8rem;
    padding: 0.2rem 0.8rem;
    border-radius: 999px;
  }
  .featured-section {
    max-width: 900px;
    margin: 0 auto 2rem;
  }
  .featured-title {
    font-size: 1rem;
    font-weight: 600;
    color: #f6ad55;
    margin-bottom: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .featured-title::before { content: '⭐'; font-size: 1rem; }
  .featured-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .featured-item {
    background: #1a1d27;
    border: 1px solid #44337a;
    border-left: 3px solid #f6ad55;
    border-radius: 8px;
    padding: 0.8rem 1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
    transition: border-color 0.2s;
  }
  .featured-item:hover { border-color: #667eea; border-left-color: #f6ad55; }
  .featured-rank {
    font-size: 0.75rem;
    color: #f6ad55;
    font-weight: 700;
    min-width: 1.5rem;
    padding-top: 0.1rem;
  }
  .featured-content { flex: 1; }
  .featured-item-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.4;
    margin-bottom: 0.3rem;
  }
  .featured-item-title a { color: inherit; text-decoration: none; }
  .featured-item-title a:hover { color: #667eea; }
  .featured-item-reason {
    font-size: 0.8rem;
    color: #718096;
    line-height: 1.5;
  }
  .featured-item-links {
    display: flex;
    gap: 0.6rem;
    margin-top: 0.4rem;
  }
  .bilingual-link {
    font-size: 0.75rem;
    color: #9f7aea;
    text-decoration: none;
    border-bottom: 1px dashed #9f7aea;
    transition: all 0.2s;
  }
  .bilingual-link:hover {
    color: #b794f4;
    border-bottom-color: #b794f4;
  }
  .filter-bar {
    max-width: 900px;
    margin: 0 auto 1.5rem;
  }
  .filter-bar-title {
    font-size: 0.8rem;
    color: #4a5568;
    margin-bottom: 0.6rem;
  }
  .filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .filter-tag {
    background: #1a1d27;
    border: 1px solid #2d3748;
    color: #a0aec0;
    font-size: 0.75rem;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;
  }
  .filter-tag:hover { border-color: #667eea; color: #e2e8f0; }
  .filter-tag.active {
    background: #667eea;
    border-color: #667eea;
    color: #fff;
    font-weight: 600;
  }
  .filter-tag.clear-btn {
    border-color: #4a5568;
    color: #718096;
  }
  .filter-tag.clear-btn:hover { border-color: #e53e3e; color: #fc8181; }
  .tag-count {
    display: inline-block;
    background: rgba(255,255,255,0.1);
    font-size: 0.7rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    margin-left: 0.2rem;
    vertical-align: middle;
  }
  .filter-tag.active .tag-count { background: rgba(255,255,255,0.25); }
  .no-results {
    text-align: center;
    color: #4a5568;
    padding: 3rem;
    display: none;
  }
  .grid {
    max-width: 900px;
    margin: 0 auto;
    display: grid;
    gap: 1.2rem;
  }
  .card {
    background: #1a1d27;
    border: 1px solid #2d3748;
    border-radius: 12px;
    padding: 1.4rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .card:hover { border-color: #667eea; transform: translateY(-2px); }
  .card.hidden { display: none; }
  .card.is-important { border-color: #44337a; }
  .card.is-important .card-title::before { content: '⭐ '; font-size: 0.9rem; }
  .card-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 0.6rem;
    line-height: 1.5;
  }
  .card-summary {
    color: #a0aec0;
    font-size: 0.9rem;
    line-height: 1.7;
    margin-bottom: 0.8rem;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
  }
  .tag {
    background: #2d3748;
    color: #9f7aea;
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .tag:hover { background: #667eea; color: #fff; }
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: #4a5568;
  }
  .read-more {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
  }
  .read-more:hover { text-decoration: underline; }
  details .original {
    margin-top: 1rem;
    padding: 1rem;
    background: #12141e;
    border-radius: 8px;
    font-size: 0.82rem;
    color: #718096;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  summary { cursor: pointer; color: #4a5568; font-size: 0.8rem; margin-top: 0.5rem; }
  summary:hover { color: #718096; }
</style>
</head>
<body>
<div class="header">
  <h1>Teams AI 日報</h1>
  <div class="meta">${dateStr} &nbsp;·&nbsp; <span class="count-badge" id="visibleCount">${processedArticles.length} 則資訊</span></div>
</div>

<div class="featured-section">
  <div class="featured-title">程式設計師必讀</div>
  <div class="featured-list">
`;

// Add featured articles
importantArticles.forEach(article => {
  html += `    <div class="featured-item">
      <span class="featured-rank">#${article.rank}</span>
      <div class="featured-content">
        <div class="featured-item-title"><a href="${article.link}" target="_blank">${article.title}</a></div>
        <div class="featured-item-reason">${article.reason}</div>
      </div>
    </div>
`;
});

html += `  </div>
</div>

<div class="filter-bar">
  <div class="filter-bar-title">依標籤篩選</div>
  <div class="filter-tags" id="filterTags">
    <span class="filter-tag clear-btn" onclick="clearFilter()">全部顯示</span>
`;

// Add filter tags
sortedTags.forEach(({ tag, count }) => {
  html += `    <span class="filter-tag" onclick="filterByTag(this, '${tag}')">${tag} <span class="tag-count">${count}</span></span>
`;
});

html += `  </div>
</div>

<div class="no-results" id="noResults">沒有符合「<span id="noResultsTag"></span>」的資訊</div>

<div class="grid" id="grid">
`;

// Add article cards
processedArticles.forEach(article => {
  const timeStr = article.time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  const tagsStr = article.tags.join(',');
  const importantClass = article.important ? ' is-important' : '';
  
  html += `  <div class="card${importantClass}" data-tags="${tagsStr}">
    <div class="card-title">${article.title}</div>
    <div class="card-summary">${article.summary}</div>
    <div class="tags">
`;
  
  article.tags.forEach(tag => {
    html += `      <span class="tag" onclick="filterByTag(null, '${tag}')">${tag}</span>
`;
  });
  
  html += `    </div>
    <div class="card-footer">
      <span>${timeStr}</span>
      <a class="read-more" href="${article.link}" target="_blank">閱讀原文 →</a>
    </div>
    <details>
      <summary>查看原始內容</summary>
      <div class="original">${stripHtml(article.raw)}</div>
    </details>
  </div>
`;
});

html += `</div>

<script>
  let activeTag = null;
  const totalCount = ${processedArticles.length};

  function filterByTag(el, tag) {
    if (activeTag === tag) { clearFilter(); return; }
    activeTag = tag;

    document.querySelectorAll('.filter-tag:not(.clear-btn)').forEach(t => {
      const tagText = t.textContent.split(' ')[0];
      t.classList.toggle('active', tagText === tag);
    });

    let visible = 0;
    document.querySelectorAll('.card').forEach(card => {
      const tags = card.dataset.tags.split(',');
      const show = tags.includes(tag);
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    document.getElementById('visibleCount').textContent = \`\${visible} 則資訊\`;
    const noResults = document.getElementById('noResults');
    noResults.style.display = visible === 0 ? 'block' : 'none';
    document.getElementById('noResultsTag').textContent = tag;
  }

  function clearFilter() {
    activeTag = null;
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.card').forEach(c => c.classList.remove('hidden'));
    document.getElementById('visibleCount').textContent = \`\${totalCount} 則資訊\`;
    document.getElementById('noResults').style.display = 'none';
  }
</script>
</body>
</html>`;

// Write HTML file
const outputPath = path.join(__dirname, 'daily_report.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`\n✅ Daily report generated successfully!`);
console.log(`📄 Output: ${outputPath}`);
console.log(`📊 Total articles: ${processedArticles.length}`);
console.log(`⭐ Important articles: ${importantArticles.length}`);
console.log(`🏷️  Total tags: ${sortedTags.length}`);
console.log(`\n💡 Open the file in your browser to view the report.`);
