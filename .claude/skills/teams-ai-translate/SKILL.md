---
name: teams-ai-translate
description: 針對程式設計師必讀文章生成雙語（英中對照）HTML 導讀。當用戶說「翻譯文章」、「生成雙語導讀」、「translate articles」、「teams-ai-translate」時觸發。從 ./docs/ 最新的 HTML 讀取必讀文章清單，抓取英文文章內容並生成雙語 HTML 到 ./docs/{日期}/ 目錄。
---

# Teams AI 文章翻譯器

你的目標是為程式設計師必讀的英文技術文章生成雙語（英中對照）HTML 導讀，幫助讀者更有效地理解技術內容。

## 使用時機

- 已執行 `teams-ai-daily` skill 生成日報，需要為必讀文章加上中文導讀
- 用戶明確要求翻譯特定文章或全部必讀文章
- 需要更新現有翻譯或補充新的翻譯

## 輸入來源

### 選項 1：從 docs/ 最新 HTML 自動讀取（推薦）

使用 Bash 列出 `./docs/` 目錄下所有 `.html` 檔案，取檔名排序最後一個（即最新日報）。
從該檔案的 `<div class="featured-list">` 區塊中解析：
- 文章序號（`#1`, `#2`, ...）
- 文章標題
- 原文連結
- 是否已有雙語導讀（檢查是否存在 `<a class="bilingual-link">`）

### 選項 2：用戶直接提供

用戶可直接提供：
- 文章 URL
- 文章標題（可選，用於檔案命名）
- 輸出檔案路徑（可選，預設為 `./docs/{date}/article_N.html`）

## 翻譯流程

### 1. 抓取文章內容

使用 **WebFetch** 抓取文章原文：
```
fetch_webpage(urls=[文章URL])
```

**處理失敗情況：**
- **重定向/廣告頁**：記錄為「抓取失敗」，跳過
- **付費牆（Paywall）**：記錄為「付費牆」，跳過
- **404/500 錯誤**：記錄為「頁面錯誤」，跳過
- **無法解析內容**：記錄為「無法解析」，跳過

### 2. 判斷文章語言

統計文章正文中的字元類型：
```javascript
const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
const englishChars = text.match(/[a-zA-Z]/g) || [];
const chineseRatio = chineseChars.length / (chineseChars.length + englishChars.length);
const englishRatio = englishChars.length / (chineseChars.length + englishChars.length);
```

**語言判定規則：**
- `englishRatio > 0.8`  → **英文文章**，進行翻譯
- `chineseRatio > 0.5`  → **中文文章**，記錄為「中文文章」，跳過
- 其他情況 → **混合語言或無法判定**，記錄為「語言無法判定」，跳過

### 3. 生成雙語 HTML

**針對英文文章**，生成包含以下內容的雙語導讀：

#### 翻譯策略
採用**核心摘要式翻譯**而非逐句翻譯：
- 提煉文章核心要點（3-5 個重點）
- 翻譯關鍵技術段落
- 標注重要技術術語的中文對照

**不採用完整逐句翻譯的原因：**
- 避免版權問題
- 提供更高效的閱讀體驗
- 聚焦程式設計師最關注的技術細節

#### HTML 結構
```html
<h2>核心摘要 / 專案介紹</h2>
<p>文章的主要內容概述，包含關鍵技術詞彙的雙語標注。</p>

<h2>關鍵要點 / 核心功能</h2>
<ul>
  <li>要點 1 with technical terms<span class="zh">（技術術語）</span></li>
  <li>要點 2 ...</li>
</ul>

<h2>效能比較 / 使用範例（視文章類型）</h2>
<p>具體技術細節...</p>
<pre><code>// 程式碼範例（若有）</code></pre>

<h2>對程式設計師的意義</h2>
<p>說明為何這篇文章值得關注，如何應用到實際工作中。</p>
```

#### 雙語標注規則
- **標注對象：** 技術術語、專有名詞、框架名稱、API 概念
- **不標注：** 介詞（in, on, at）、冠詞（a, the）、常用動詞（is, are, do）
- **格式：** `technical term<span class="zh">（中文翻譯）</span>`
- **保持可讀性：** 避免過度標注，確保流暢閱讀

**範例：**
```html
<p>mcp2cli is a runtime CLI generator<span class="zh">（運行時 CLI 產生器）</span> 
that connects Large Language Models<span class="zh">（大型語言模型）</span> 
to MCP servers<span class="zh">（MCP 伺服器）</span> 
with dramatically reduced token usage<span class="zh">（大幅降低 token 使用量）</span>.</p>
```

### 4. 生成輸出檔案

**檔案命名規則：**
- 從 docs/ 最新 HTML 讀取：`./docs/{date}/article_{rank}.html`（如 `./docs/2026-03-19/article_1.html`）
- `{date}` 取自最新日報檔案名稱（如 `daily_report_2026-03-19.html` → `2026-03-19`）
- 輸出前先執行 `mkdir -p ./docs/{date}/` 確保目錄存在
- 用戶直接提供：`./docs/{date}/article_{自動編號}.html` 或用戶指定路徑

**檔案內容：** 完整的 HTML 文件（見下方模板）

### 5. 更新日報 HTML（可選）

如果文章來自 docs/ 最新日報的必讀清單，在對應的 `<div class="featured-item">` 中加入雙語連結：

```html
<div class="featured-item-links">
  <a class="read-more" href="{原文連結}" target="_blank">閱讀原文 →</a>
  <a class="bilingual-link" href="{date}/article_{rank}.html">中文導讀 →</a>
</div>
```

### 6. 生成翻譯狀態報告

完成所有翻譯後，輸出詳細報告：

```
翻譯狀態報告
═══════════════════════════════════════

已翻譯文章 (2 篇):
  ✅ #3: mcp2cli - 節省 90% Token 的 CLI 工具
  ✅ #4: GitHub Copilot Instructions Files

未翻譯文章 (18 篇):
  ⏭️ #1: Anthropic AI 對工作的實際衝擊 (抓取失敗)
  ⏭️ #2: Y Combinator CEO 用 Claude Code (付費牆)
  ❓ #5: Vibe Coding 的最終目標 (語言無法判定)
  ...

翻譯統計:
  • 英文文章: 18 篇
  • 中文文章: 0 篇
  • 混合語言: 2 篇
  • 翻譯完成率: 11% (2/18)

檔案位置:
  • articles/article_3.html
  • articles/article_4.html
```

## 雙語 HTML 模板

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{文章標題} - 中文導讀</title>
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
  .article-body h2 {
    color: #e2e8f0;
    margin: 1.5rem 0 0.8rem;
    font-weight: 600;
    font-size: 1.15rem;
  }
  .article-body h3 {
    color: #e2e8f0;
    margin: 1.2rem 0 0.6rem;
    font-weight: 600;
    font-size: 1rem;
  }
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
  .article-body a {
    color: #667eea;
    text-decoration: none;
  }
  .article-body a:hover { text-decoration: underline; }
  /* 中文翻譯標注 */
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
</style>
</head>
<body>
  <a class="back-link" href="../daily_report_{date}.html">← 返回日報</a>
  <div class="article-header">
    <h1>{文章標題}</h1>
    <div class="article-meta">原文來源：<a href="{原文連結}" target="_blank">{原文連結}</a></div>
  </div>
  <div class="notice">以下為核心要點摘要，附英文技術詞彙對照（<span class="zh">紫色</span>）幫助理解。</div>
  <div class="article-body">
    <!-- 文章內容，採用核心摘要式翻譯 -->
    <h2>核心摘要</h2>
    <p>...</p>
    
    <h2>關鍵要點</h2>
    <ul>
      <li>...</li>
    </ul>
    
    <h2>對程式設計師的意義</h2>
    <p>...</p>
  </div>
</body>
</html>
```

## 批次處理模式

### 全部翻譯（預設）
從 `./docs/` 最新日報 HTML 讀取所有必讀文章，逐一處理：
1. 檢查是否已有雙語導讀（避免重複）
2. 抓取文章內容
3. 判斷語言
4. 若為英文，生成雙語 HTML 到 `./docs/{date}/`
5. 更新最新日報 HTML 加入連結
6. 輸出翻譯狀態報告

### 指定文章翻譯
用戶可指定：
- 序號：`翻譯第 3 篇文章`
- 範圍：`翻譯第 1-5 篇`
- 標題關鍵字：`翻譯包含 MCP 的文章`

### 補充翻譯
只處理未翻譯的文章（已有雙語連結的跳過）

## 注意事項

- **優先順序**：先處理技術教學類 > 工具介紹類 > 新聞討論類
- **版權考量**：使用核心摘要式翻譯，不完整複製原文
- **錯誤處理**：付費牆、抓取失敗等情況要明確記錄，方便用戶了解
- **檔案管理**：確保 `./docs/{date}/` 目錄存在（用 `mkdir -p`），不覆蓋已有檔案（除非用戶明確要求）
- **HTML 品質**：所有 HTML 檔案需符合 W3C 標準，正確編碼（UTF-8）
- **返回連結**：雙語 HTML 的返回連結固定使用相對路徑 `../daily_report_{date}.html`（`{date}` 取自最新日報檔名）
- **技術準確性**：技術術語翻譯需準確，必要時保留英文原文作為主體

## 輸出範例

### 成功訊息
```
✅ 翻譯完成！

📝 已生成 2 篇雙語導讀：
  • docs/2026-03-19/article_3.html - mcp2cli: 節省 90% Token 的 CLI 工具
  • docs/2026-03-19/article_4.html - GitHub Copilot Instructions Files 完整指南

⏭️ 跳過 2 篇文章：
  • #1: 抓取失敗（網頁重定向）
  • #2: 付費牆（Medium 需登入）

📊 翻譯統計：
  • 英文文章: 18 篇
  • 翻譯完成: 2 篇 (11%)
  • 待處理: 16 篇

💡 建議：在瀏覽器中開啟 docs/daily_report_2026-03-19.html，點擊「中文導讀 →」查看翻譯結果。
```

### 失敗訊息
```
❌ 翻譯失敗

原因：無法在 ./docs/ 找到任何 HTML 檔案
建議：請先執行 teams-ai-daily skill 生成日報
```
