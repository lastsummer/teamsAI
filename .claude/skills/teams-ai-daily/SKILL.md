---
name: teams-ai-daily
description: 生成 Teams AI 頻道每日新聞日報。當用戶想看 AI 新聞概覽、每日 AI 日報、Teams AI 新聞摘要，或直接說「產生日報」、「今天有什麼AI新聞」、「teams-ai-daily」時觸發。讀取 archive/AI news/ 下最新的 JSON，過濾整理後輸出精美 HTML 報告到 ./dailyReport/daily_report_YYYY-MM-DD.html。
---

# Teams AI 日報產生器

你的目標是把 Teams AI 頻道的原始訊息，變成一份讓人一眼看完重點、想繼續閱讀的日報 HTML。

## 步驟

### 1. 找到資料

讀取 `archive/AI news/` 下**最新的 JSON 檔案**（按檔名排序，取最後一個）。

### 2. 解析與過濾訊息

每則訊息的關鍵欄位：
- `body.content`：HTML 格式內文，含標題、連結、摘要
- `from.application.displayName` / `onBehalfOf.user.displayName`：發送者
- `createdDateTime`：發送時間
- `webUrl`：Teams 原文連結
- `messageType`：只保留 `"message"`，跳過其他類型

**過濾掉無價值訊息：**
- `messageType` 不是 `"message"` 的
- `body.content` 是空白或只有 `<p></p>` 之類空標籤的
- 系統通知類內容（通常沒有實質文字）
- `onBehalfOf.user.displayName` 或 `from.user.displayName` 是 `"Claudia Zhou 周家芸"` 的訊息

從 HTML 內容中提取：
- 文章標題（通常在 `<h1>` 或第一段粗體）
- 文章連結（`<a href>` 的第一個非 Teams 的外部連結）
- 原文摘要（HTML 去標籤後的文字）

### 3. 生成中文摘要

對每則有效訊息，根據已有的原文摘要（訊息已內含摘要文字）：
- 提煉 **50-100 字**的中文核心要點
- 標注 **3-5 個關鍵詞標籤**（例如：`#LLM`、`#職場衝擊`、`#OpenAI`）
- 如果原文已有中文摘要，可精煉改寫；如果是英文，翻譯成中文

### 3.5. 評選「程式設計師必讀」文章（最多 20 筆）

從所有有效訊息中，以程式設計師的視角挑選最值得閱讀的文章，標記 `important: true`。

**評選標準（依優先順序）：**
1. **實用工具 / 框架更新**：直接影響開發工作流程的工具、SDK、API 變更（如 Claude Code、MCP、Cursor、GitHub Copilot 等）
2. **重大技術突破**：新模型發布、benchmark 刷新、架構創新，足以改變技術選型
3. **AI 輔助開發**：提升編碼效率的技巧、workflow、prompt 工程、AI agent 開發實踐
4. **職場 / 產業趨勢**：直接影響程式設計師就業、技能需求、薪資的研究或報告
5. **安全 / 合規**：影響 AI 應用開發的安全漏洞、監管政策

**排除**：純套件版本升級無說明、頁面載入錯誤、無實質內容的摘要。

### 4. 生成 HTML 並儲存

由於 JSON 檔案可能超過 256KB，**必須使用 Bash + Node.js 腳本**讀取完整 JSON（不可用 Read tool 分批讀取，否則會遺漏訊息）。確保所有訊息都被處理。

將結果寫入 `./dailyReport/daily_report_YYYY-MM-DD.html`，日期取自資料中最新訊息的台灣時間（UTC+8，格式 `YYYY-MM-DD`）。若 `dailyReport/` 目錄不存在，先用 `mkdir -p` 建立。

## HTML 模板

使用以下固定格式，確保每次產出風格一致：

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Teams AI 日報 - {日期}</title>
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
  /* Tag filter bar */
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
  /* Cards */
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
  /* 程式設計師必讀區塊 */
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
  .card.is-important { border-color: #44337a; }
  .card.is-important .card-title::before { content: '⭐ '; font-size: 0.9rem; }
  .featured-item-links {
    display: flex;
    gap: 1rem;
    margin-top: 0.4rem;
    font-size: 0.8rem;
  }
  .bilingual-link {
    color: #9f7aea;
    text-decoration: none;
    font-weight: 500;
  }
  .bilingual-link:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="header">
  <h1>Teams AI 日報</h1>
  <div class="meta">{日期} &nbsp;·&nbsp; <span class="count-badge" id="visibleCount">{N} 則資訊</span></div>
</div>

<!-- 程式設計師必讀（最多 20 筆，依重要性排序） -->
<div class="featured-section">
  <div class="featured-title">程式設計師必讀</div>
  <div class="featured-list">
    <!-- 每筆格式：rank = 序號，title = 文章標題，link = 外部連結，reason = 一句話說明為何重要 -->
    <!-- bilingual_link = 若成功生成雙語 HTML 則填入相對路徑（如 articles/article_1.html），否則省略該連結 -->
    <div class="featured-item">
      <span class="featured-rank">#1</span>
      <div class="featured-content">
        <div class="featured-item-title"><a href="{外部連結}" target="_blank">{標題}</a></div>
        <div class="featured-item-reason">{一句話：為何程式設計師應該看這篇}</div>
        <div class="featured-item-links">
          <a class="read-more" href="{外部連結}" target="_blank">閱讀原文 →</a>
          <!-- 若有雙語 HTML 才加入此連結 -->
          <a class="bilingual-link" href="articles/article_1.html">中文導讀 →</a>
        </div>
      </div>
    </div>
    <!-- ... 其餘最多 19 筆 ... -->
  </div>
</div>

<!-- Tag 篩選列：列出所有出現的 tag，點擊可篩選 -->
<div class="filter-bar">
  <div class="filter-bar-title">依標籤篩選</div>
  <div class="filter-tags" id="filterTags">
    <span class="filter-tag clear-btn" onclick="clearFilter()">全部顯示</span>
    <!-- 動態產生所有 tag，格式如下（依出現次數排序，顯示該 tag 的文章數）： -->
    <span class="filter-tag" onclick="filterByTag(this, '#LLM')">#LLM <span class="tag-count">6</span></span>
    <!-- ... 其餘 tag ... -->
  </div>
</div>

<div class="no-results" id="noResults">沒有符合「<span id="noResultsTag"></span>」的資訊</div>

<div class="grid" id="grid">
  <!-- 每張卡片：data-tags 存放該卡片所有 tag（用逗號分隔，方便 JS 篩選） -->
  <div class="card" data-tags="#LLM,#職場衝擊,#Anthropic">
    <div class="card-title">{標題}</div>
    <div class="card-summary">{50-100字中文摘要}</div>
    <div class="tags">
      <span class="tag" onclick="filterByTag(null, '#LLM')">#LLM</span>
      <span class="tag" onclick="filterByTag(null, '#職場衝擊')">#職場衝擊</span>
    </div>
    <div class="card-footer">
      <span>{時間}</span>
      <a class="read-more" href="{外部連結}" target="_blank">閱讀原文 →</a>
    </div>
    <details>
      <summary>查看原始內容</summary>
      <div class="original">{原始文字內容}</div>
    </details>
  </div>
</div>

<script>
  let activeTag = null;
  const totalCount = {N};

  function filterByTag(el, tag) {
    if (activeTag === tag) { clearFilter(); return; }
    activeTag = tag;

    // 更新篩選列高亮
    document.querySelectorAll('.filter-tag:not(.clear-btn)').forEach(t => {
      t.classList.toggle('active', t.textContent === tag);
    });

    // 顯示 / 隱藏卡片
    let visible = 0;
    document.querySelectorAll('.card').forEach(card => {
      const tags = card.dataset.tags.split(',');
      const show = tags.includes(tag);
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });

    document.getElementById('visibleCount').textContent = `${visible} 則資訊`;
    const noResults = document.getElementById('noResults');
    noResults.style.display = visible === 0 ? 'block' : 'none';
    document.getElementById('noResultsTag').textContent = tag;
  }

  function clearFilter() {
    activeTag = null;
    document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.card').forEach(c => c.classList.remove('hidden'));
    document.getElementById('visibleCount').textContent = `${totalCount} 則資訊`;
    document.getElementById('noResults').style.display = 'none';
  }
</script>
</body>
</html>
```

## 注意事項

- **時間格式**：`createdDateTime` 轉換為台灣時間（UTC+8），顯示為 `HH:MM`
- **日期標題**：使用最新訊息的日期，格式 `YYYY年MM月DD日`
- **連結優先順序**：優先用 `body.content` 中的外部文章連結；若無，才用 `webUrl`（Teams 連結）
- **HTML 清理**：從 body.content 提取純文字時，去除所有 HTML 標籤
- **程式設計師必讀**：在 filter-bar 上方插入 `.featured-section`，依評選標準挑選最多 20 筆；每筆需附一句說明為何值得看。被選入的卡片同時加上 `is-important` class（呈現金色左邊框 + ⭐ 前綴）
- **雙語導讀連結**：必讀文章區塊需包含 `.featured-item-links` 和 `.bilingual-link` CSS 樣式，但不自動生成雙語 HTML（使用 teams-ai-translate skill 另行處理）
- **輸出路徑**：主日報寫到 `./dailyReport/daily_report_YYYY-MM-DD.html`（日期取自資料最新訊息的台灣時間），完成後告知用戶路徑並提示用瀏覽器開啟
- **必須處理全部訊息**：JSON 檔案可能含 100+ 則訊息，務必用 Node.js 腳本一次讀取完整 JSON，不得用 Read tool 分批讀檔（否則會遺漏大量資料）
