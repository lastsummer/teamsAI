---
name: teams-ai-total
description: 產生 Teams AI 日報總覽 index.html。當用戶說「產生索引」、「列出日報」、「generate index」、「teams-ai-total」時觸發。可選擇性指定日期（如「產生到 2026-03-18 為止的索引」），讀取 ./docs/ 下的 daily_report_*.html 檔案，生成 index.html 列出所有（或截至指定日期的）日報並提供快速連結。
---

# Teams AI 日報總覽產生器

你的目標是掃描 `./docs/` 目錄，列出 `daily_report_*.html` 檔案，生成一個精美的 `./docs/index.html` 總覽頁面。

## 日期參數

用戶可以在訊息中指定截止日期，支援以下格式：
- `2026-03-18`（YYYY-MM-DD）
- `03/18`、`3月18日` 等自然語言日期

**若有指定日期**：只列出檔名日期 ≤ 指定日期的日報。

**若未指定日期**：列出全部日報（預設行為）。

## 步驟

### 1. 掃描日報檔案

使用 Bash 列出 `./docs/` 下所有符合 `daily_report_*.html` 模式的檔案：

```bash
ls ./docs/daily_report_*.html 2>/dev/null | sort -r
```

取得檔名列表後，從每個檔名提取日期（格式 `YYYY-MM-DD`）：
- 檔名格式：`daily_report_2026-03-19.html` → 日期：`2026-03-19`
- 若用戶指定了截止日期，過濾掉日期 > 截止日期的檔案

### 2. 讀取每份日報的摘要資訊

對每個日報檔案，使用 Node.js 腳本讀取並提取：
- 日報日期（從檔名）
- 文章總數（`<div class="card">` 的數量）
- 必讀文章數（`<div class="featured-item">` 的數量）
- 已翻譯文章數（`<a class="bilingual-link"` 的數量）

```bash
node -e "
const fs = require('fs');
const cutoff = process.argv[1]; // 'YYYY-MM-DD' 或空字串
let files = fs.readdirSync('./docs').filter(f => f.match(/^daily_report_\d{4}-\d{2}-\d{2}\.html$/)).sort().reverse();
if (cutoff) {
  files = files.filter(f => f.match(/daily_report_(\d{4}-\d{2}-\d{2})/)[1] <= cutoff);
}
const result = files.map(f => {
  const html = fs.readFileSync('./docs/' + f, 'utf8');
  const date = f.match(/daily_report_(\d{4}-\d{2}-\d{2})\.html/)[1];
  const cards = (html.match(/<div class=\"card\"/g) || []).length;
  const featured = (html.match(/<div class=\"featured-item\">/g) || []).length;
  const translated = (html.match(/<a class=\"bilingual-link\"/g) || []).length;
  return { file: f, date, cards, featured, translated };
});
console.log(JSON.stringify(result, null, 2));
"
```

### 3. 生成 index.html

將結果寫入 `./docs/index.html`，使用下方模板。

## HTML 模板

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Teams AI 日報總覽</title>
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
    margin-bottom: 2rem;
  }
  .header h1 {
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.4rem;
  }
  .header .meta {
    color: #718096;
    font-size: 0.9rem;
  }
  .grid {
    max-width: 700px;
    margin: 0 auto;
    display: grid;
    gap: 1rem;
  }
  .card {
    background: #1a1d27;
    border: 1px solid #2d3748;
    border-radius: 12px;
    padding: 1.2rem 1.4rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    transition: border-color 0.2s, transform 0.2s;
    text-decoration: none;
    color: inherit;
  }
  .card:hover {
    border-color: #667eea;
    transform: translateY(-2px);
  }
  .card-left { flex: 1; }
  .card-date {
    font-size: 1.1rem;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 0.4rem;
  }
  .card-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .stat-badge {
    font-size: 0.78rem;
    color: #718096;
  }
  .stat-badge span {
    color: #9f7aea;
    font-weight: 600;
  }
  .card-arrow {
    color: #4a5568;
    font-size: 1.2rem;
    flex-shrink: 0;
  }
  .card:hover .card-arrow { color: #667eea; }
  .empty {
    text-align: center;
    color: #4a5568;
    padding: 3rem;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>Teams AI 日報總覽</h1>
    <div class="meta">共 {N} 份日報</div>
  </div>
  <div class="grid">
    <!-- 每份日報一張卡片，最新的在最上面 -->
    <a class="card" href="{檔名}">
      <div class="card-left">
        <div class="card-date">{YYYY年MM月DD日}</div>
        <div class="card-stats">
          <span class="stat-badge">📰 <span>{cards}</span> 則資訊</span>
          <span class="stat-badge">⭐ <span>{featured}</span> 篇必讀</span>
          <span class="stat-badge">🌐 <span>{translated}</span> 篇中文導讀</span>
        </div>
      </div>
      <div class="card-arrow">→</div>
    </a>
  </div>
</body>
</html>
```

## 日期格式轉換

將 `YYYY-MM-DD` 轉為 `YYYY年MM月DD日` 顯示於卡片標題：
- `2026-03-19` → `2026年03月19日`

## 輸出

- **檔案路徑**：`./docs/index.html`
- **排序**：最新日期在最上方（降序）
- **完成後**：告知用戶並提示在瀏覽器開啟 `docs/index.html`

## 注意事項

- 若 `./docs/` 不存在或沒有任何 `daily_report_*.html`，輸出空狀態提示頁
- 每次執行都完整重寫 `index.html`（不是增量更新）
- 中文導讀數若為 0，仍正常顯示（`0 篇中文導讀`）
