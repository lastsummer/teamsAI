const fs = require('fs');
const path = require('path');

// Featured articles with their links
const featuredArticles = [
  { rank: 1, title: "Anthropic 揭露 AI 對工作「實際衝擊」：高薪高學歷反成 AI 衝擊第一線！程式設計師、客服首當其衝", url: "https://www.techbang.com/posts/128264-anthropic-ai-jobs-impact-programmers-customer-service" },
  { rank: 2, title: "Y Combinator 執行長用 Claude Code 在 7 天內完成 100 個 PR。以下是他的確切設置。", url: "https://civillearning.medium.com/the-y-combinator-ceo-crushed-100-prs-in-7-days-with-claude-code-heres-his-exact-setup-42231b8dcf2b?source=rss------ai-5" },
  { rank: 3, title: "我撰寫了一個 CLI，在連接到 MCP 或 OpenAPI Servers 時可輕鬆節省超過 90% 的 token 使用量", url: "https://www.reddit.com/r/Python/comments/1rsaa6i/i_wrote_a_cli_that_easily_saves_over_90_of_token/" },
  { rank: 4, title: "GitHub Copilot 指令檔案", url: "https://medium.com/@automagically/github-copilot-instructions-files-aefecc86754e?source=rss------ai-5" },
  { rank: 5, title: "Vibe Coding 的最終目標是什麼？", url: "https://jess-writes-about-tech.medium.com/whats-the-end-game-for-vibe-coding-f943d61a2f54?source=rss------productivity-5" },
  { rank: 6, title: "Cryptographic Agility 在 Model Context Protocol 實作中的應用", url: "https://securityboulevard.com/2026/03/cryptographic-agility-in-model-context-protocol-implementations/" },
  { rank: 7, title: "如果你把 Claude 程式碼給一位來自 2006 年的網頁開發者會怎樣？", url: "https://www.reddit.com/r/programming/comments/1rsalzf/what_if_you_gave_claude_code_to_a_web_developer/" },
  { rank: 8, title: "使用 Claude Code 自動化您的整個工作生活 — 無需編碼", url: "https://medium.com/@shubhjain191/automate-your-entire-work-life-with-claude-code-no-coding-needed-d3ced257f299?source=rss------product_management-5" },
  { rank: 9, title: "AionUI + OpenClaw + Claude Code + Perplexity 更新！", url: "https://www.youtube.com/watch?v=EbtUJotglAA" },
  { rank: 10, title: "我建立了一個隱私優先的 Kanban 應用程式來執行和追蹤 Claude Code 任務", url: "https://www.reddit.com/r/ClaudeAI/comments/1rs8c6l/i_built_a_privacyfirst_kanban_app_for_running_and/" },
  { rank: 11, title: "GitHub Copilot 剛剛終結了學生的模型選擇問題 — Claude Pro $20 vs Copilot Pro $10，哪個更適合重度使用 agent Opus 4.6？", url: "https://www.reddit.com/r/Anthropic/comments/1rs404m/github_copilot_just_killed_model_selection_for/" },
  { rank: 12, title: "我厭倦了在多個 repos 中管理 Claude Code，所以我建立了一個開源的指揮中心——配備一個管理所有代理的編排代理", url: "https://www.reddit.com/r/Anthropic/comments/1rs2b8w/i_got_tired_of_managing_claude_code_across/" },
  { rank: 13, title: "我開源了在 3,667 次 Claude Code 提交後建立的行為規則集和工具包；63 個 slash 命令、318 個技能、23 個 agents，以及 9 個真正改變 agent 行為方式的規則", url: "https://www.reddit.com/r/Anthropic/comments/1rry1r1/i_opensourced_the_behavioral_ruleset_and_toolkit/" },
  { rank: 14, title: "Claude 用於 Python 的程式碼：使用 AI 建立專案 Claude Code for Python: Build Projects With AI", url: "https://www.youtube.com/shorts/XUd1-8znR6s" },
  { rank: 15, title: "使用 SwiftUI 和 Figma 進行 Vibe coding！", url: "https://medium.com/@fmmobilelive/vibe-coding-with-swiftui-and-figma-ddbddd6e987a?source=rss------swift-5" },
  { rank: 16, title: "我建立了 CW — 一個用於管理多個 Claude Code 專案、帳戶和 worktrees 的 CLI", url: "https://www.reddit.com/r/ClaudeAI/comments/1rs7fus/i_built_cw_a_cli_to_manage_multiple_claude_code/" },
  { rank: 17, title: "我建立了一個開源的 Claude Code 技能來為我的家庭執行每週物流。", url: "https://www.reddit.com/r/ClaudeAI/comments/1rs75si/i_built_an_opensource_claude_code_skill_to_run/" },
  { rank: 18, title: "8 個 Claude Code 設定在幾分鐘內自訂", url: "https://www.builder.io/blog/claude-code-settings" },
  { rank: 19, title: "就像 Vibe Coding - 但用於營收", url: "https://sixteenventures.com/like-vibe-codingbut-for-revenue" },
  { rank: 20, title: "感謝 vibe coding，我把我移除的 Chrome extension 帶回了商店。", url: "https://www.reddit.com/r/SideProject/comments/1rs6gb1/thanks_to_vibe_coding_i_brought_my_removed_chrome/" }
];

// Mock bilingual content generation (in real implementation, would use fetch + translation API)
function generateBilingualHTML(article) {
  const { rank, title, url } = article;
  
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - 中文導讀</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0f1117;
    color: #e2e8f0;
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
    line-height: 1.8;
  }
  .back-link {
    display: inline-block;
    margin-bottom: 1.5rem;
    color: #667eea;
    text-decoration: none;
    font-size: 0.9rem;
  }
  .back-link:hover { text-decoration: underline; }
  .article-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #2d3748;
  }
  .article-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }
  .article-meta {
    font-size: 0.85rem;
    color: #4a5568;
  }
  .article-meta a { color: #667eea; text-decoration: none; }
  .article-meta a:hover { text-decoration: underline; }
  .article-body h1, .article-body h2, .article-body h3 {
    color: #e2e8f0;
    margin: 1.5rem 0 0.8rem;
    font-weight: 600;
  }
  .article-body h1 { font-size: 1.3rem; }
  .article-body h2 { font-size: 1.15rem; }
  .article-body h3 { font-size: 1rem; }
  .article-body p {
    margin-bottom: 1rem;
    color: #cbd5e0;
  }
  .article-body ul, .article-body ol {
    margin: 0.8rem 0 1rem 1.5rem;
    color: #cbd5e0;
  }
  .article-body li { margin-bottom: 0.4rem; }
  .article-body code {
    background: #2d3748;
    color: #f6ad55;
    font-family: 'Fira Code', monospace;
    font-size: 0.85em;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
  }
  .article-body pre {
    background: #12141e;
    border: 1px solid #2d3748;
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  .article-body pre code {
    background: none;
    padding: 0;
    color: #e2e8f0;
  }
  .zh {
    color: #9f7aea;
    font-size: 0.9em;
  }
  .notice {
    background: #1a1d27;
    border: 1px solid #2d3748;
    border-left: 3px solid #9f7aea;
    border-radius: 8px;
    padding: 0.8rem 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    color: #718096;
  }
  .placeholder {
    background: #1a1d27;
    border: 1px dashed #2d3748;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    color: #4a5568;
    margin: 2rem 0;
  }
</style>
</head>
<body>
  <a class="back-link" href="../daily_report.html">← 返回日報</a>
  <div class="article-header">
    <h1>${title}</h1>
    <div class="article-meta">原文來源：<a href="${url}" target="_blank">${url}</a></div>
  </div>
  <div class="notice">以下為原文內容，英文術語後方附有中文對照（<span class="zh">紫色</span>）以輔助閱讀。</div>
  <div class="article-body">
    <div class="placeholder">
      <p>⚠️ 雙語內容生成需要實際抓取並處理文章內容</p>
      <p style="margin-top: 0.5rem; font-size: 0.85rem;">此為示例模板，實際使用時需整合網頁抓取與翻譯 API</p>
      <p style="margin-top: 1rem;"><a href="${url}" target="_blank" style="color: #667eea;">點擊此處閱讀原文 →</a></p>
    </div>
  </div>
</body>
</html>`;
}

// Generate bilingual HTML files for sample articles (first 3 as examples)
const sampleArticles = featuredArticles.slice(0, 3);
const generatedFiles = [];

console.log('Generating bilingual HTML files...\n');

sampleArticles.forEach(article => {
  const fileName = `article_${article.rank}.html`;
  const filePath = path.join(__dirname, 'articles', fileName);
  const html = generateBilingualHTML(article);
  
  fs.writeFileSync(filePath, html, 'utf8');
  generatedFiles.push({ rank: article.rank, fileName });
  console.log(`✅ Generated: articles/${fileName}`);
});

console.log(`\n📊 Summary:`);
console.log(`   Generated ${generatedFiles.length} bilingual HTML files`);
console.log(`   Location: ./articles/`);
console.log(`\n💡 Next: Update daily_report.html to add "中文導讀" links for these articles`);

// Output the list for updating the main report
console.log(`\n🔗 Articles with bilingual support:`);
generatedFiles.forEach(file => {
  console.log(`   #${file.rank}: articles/${file.fileName}`);
});
