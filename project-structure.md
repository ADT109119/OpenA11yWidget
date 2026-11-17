# 網頁無障礙小工具 (OpenA11yWidget) 專案架構文件

本專案為純原生 Vanilla JavaScript（零外部依賴）實作之網頁無障礙輔助小工具，採用 **Shadow DOM 樣式隔離** 設計，任何網站僅需一行 `<script>` 即可嵌入完整無障礙輔助功能，並附帶互動展示網站與站長專屬的視覺化嵌入碼產生器後台。

---

## 一、目錄與檔案清單

| 檔案路徑 | 用途與角色說明 |
| --- | --- |
| `a11y-widget.js` | **核心獨立 Widget 程式**：IIFE 封裝、零依賴，自動建立 `#a11y-widget-host`（控制面板與輔助疊層）與 `#a11y-skip-host`（頁面頂部 Skip-to-Content 快速導覽列）兩個 Open Shadow DOM 容器，並掛載 `#a11y-svg-defs` 色盲補償濾鏡與公開 API `window.A11yWidget`。 |
| `index.html` | **無障礙互動展示與測試首頁**：包含完整語意化地標 (`header`, `nav`, `main`, `article`, `section`, `aside`, `footer`)、`H1`–`H4` 多層級標題、色彩狀態表、含 `alt` 替代文字圖片、表單、Tooltips 測試目標、自動 ARIA 修補測試元件與 CSS Keyframes 動畫測試區。 |
| `configurator.html` | **站長嵌入碼產生器後台**：雙欄式視覺化設定介面，支援即時預覽按鈕顏色、位置、尺寸、形狀、圖示、邊距偏移、語言、快捷鍵與功能模組開關，並即時產生 `<script data-*>` 嵌入碼與 `window.A11yWidgetConfig` 初始化程式碼（含一鍵複製）。 |
| `README.md` | **GitHub 專案公開說明文件**：包含品牌 Banner 與 Logo、合規免責聲明、核心功能與架構亮點、jsDelivr CDN 引入 (`ADT109119/OpenA11yWidget`)、配置屬性與公開 API 說明。 |
| `assets/logo.svg` | **品牌主標誌** (240x240 SVG)：結合藍青漸層圓角盾牌、通用無障礙人形、焦點角標與語音聲波。 |
| `assets/favicon.svg` | **瀏覽器分頁圖示** (64x64 SVG)：供 `index.html` 與 `configurator.html` 引用。 |
| `assets/banner.svg` | **專案展示橫幅海報** (1200x440 SVG)：用於 `README.md` 頂部展示。 |
| `project-structure.md` | **專案架構說明文件**：記錄整體專案架構、各檔案功能、API 規格、參數屬性與技術實作細節。 |

---

## 二、核心技術架構 (`a11y-widget.js`)

1. **Shadow DOM 樣式隔離與濾鏡不破壞 `position: fixed`**
   - 小工具介面、閱讀尺規、專注遮罩、提示氣泡 (`#a11y-tooltip-bubble`) 與圖片 `alt` 提示框皆渲染於 `document.body` 下的 `#a11y-widget-host` Open Shadow DOM 中，避免與宿主網站 CSS 互相干擾。
   - **Backdrop Filter 隔離層 (`#a11y-backdrop-filter`)**：色彩反相 (`invert`)、飽和度 (`high`/`low`) 與全灰階 (`grayscale`) 透過 Shadow DOM 內全螢幕疊層的 `backdrop-filter` 套用（媒體節點則於需要時局部反轉還原），**不在宿主網站的 `#app` / 容器上套用 `filter`**，避免建立新的 containing block 進而破壞宿主網站既有的 `position: fixed` / `sticky` 排版。
   - 色盲補償 SVG `<feColorMatrix>` 濾鏡 (`#a11y-svg-defs`) 套用至：
     `html[data-a11y-filter-active="true"] body > *:not(#a11y-widget-host):not(#a11y-skip-host):not(#a11y-svg-defs):not(script):not(style):not(link)`。

2. **鍵盤安全與原生 Skip-to-Content 導覽列**
   - **Skip Bar (`#a11y-skip-host`)**：插入於 `document.body` 第一個子節點，使用者初次按下 `Tab` 時於螢幕左上角浮現「跳至主要內容」與「開啟無障礙選單」按鈕，解決外掛位於頁面尾端導致鍵盤導覽順序受阻的問題。
   - **`inert` 與 Focus Trap 循環**：面板關閉時設定 `aria-hidden="true"` 與 `inert` 屬性防止鍵盤誤入隱藏節點；開啟時於面板內部循環 `Tab` / `Shift+Tab`，按下 `Escape` 關閉並歸還焦點。
   - **`aria-live="polite"` 即時狀態播報**：透過 `#a11y-sr-announcer` 向螢幕報讀器回報每次設定切換。

3. **即時 DOM 監聽 (`MutationObserver`) 與自動基礎 ARIA 修補 (`runAutoRemediation`)**
   - 自動為缺漏 `alt` 的 `<img>` 補齊 `alt=""` 與 `role="presentation"`（或繼承 `aria-label`/`title`）、為無標記的表單欄位由 `placeholder`/`title`/`name` 推論補齊 `aria-label`、並為 `target="_blank"` 連結補上 `rel="noopener noreferrer"` 與新分頁語意提示。
   - 透過防抖 `MutationObserver` 監聽動態路由或 SPA 內容更新，即時維持字體縮放與修補狀態，並可於「無障礙聲明」視窗或 `getRemediationStats()` 查看修補計數。

4. **列印隔離 (`@media print`)**
   - 所有視覺覆寫樣式均包覆於 `@media screen` 內，並於 `@media print` 隱藏 `#a11y-widget-host`、`#a11y-skip-host` 與 `#a11y-svg-defs`，確保列印時頁面乾淨不受影響。

5. **非破壞性字體等比縮放**
   - 使用 `WeakMap` (`fontSizeCache`) 記錄宿主頁面文字元素的原始計算 `fontSize` 與行內 `style.fontSize`，在多段放大 (`+15%`, `+30%`, `+45%`) 切換與重設時可精準還原，避免雙重倍率疊加。

6. **六大無障礙功能模組 (`ALL_MODULES`)**
   - `profiles`（8 大情境快速模式）：
     - `visually-impaired`（視障輔助）
     - `colorblind-friendly`（色盲友善）
     - `dyslexia-friendly`（閱讀障礙友善）
     - `adhd-focus`（ADHD 專注模式）
     - `senior-friendly`（長者友善模式）
     - `motor-impaired`（肢體 / 鍵盤輔助）
     - `cognitive-learning`（認知與學習輔助）
     - `seizure-safe`（防癲癇 / 無閃爍模式）
   - `visual`（視覺與色彩）：對比模式（`normal` / `dark` / `light` / `invert`）、飽和度與灰階（`normal` / `high` / `low` / `grayscale`）、SVG `<feColorMatrix>` 色盲濾鏡（`none` / `deuteranopia` / `protanopia` / `tritanopia`）。
   - `typography`（文字與排版）：字體大小（`0`–`3`）、行高調整（`0`–`3`）、字距與詞距調整（`0`–`3`）、易讀字體（`0` 預設 / `1` 高易讀黑體 / `2` 閱讀障礙專用字體）、文字對齊（`normal` / `left` / `center` / `justify`）。
   - `navigation`（導航與閱讀輔助）：44x44 高對比大游標（`none` / `white` / `black`）、硬體加速閱讀尺規 (`readingGuide`)、140px 清晰視窗專注遮罩 (`readingMask`)、醒目連結 (`highlightLinks`)、醒目標題 (`highlightHeadings`)、鍵盤焦點強化 (`focusOutline`)、懸停與焦點提示氣泡 (`tooltips`)。
   - `motion`（動態抑制與語音）：暫停動畫與 `<video>` 播放 (`stopAnimations`)、隱藏圖片並於 Shadow DOM 疊層顯示 `alt` 文字 (`hideImages`)、整合 `window.speechSynthesis` 之點擊朗讀與語速控制 (`ttsClick`)。
   - `structure`（頁面結構導覽）：自動掃描宿主頁面 `H1`–`H6` 標題樹、語意地標 (`Landmarks`) 與可見連結清單，點擊可平滑捲動定位、聚焦並短暫高亮。
   - **面板整合控制**：標題列內建 **XL 超大面板模式 (`oversizedWidget`)**、語言切換 (`zh-TW` / `en`)，頁尾提供 **移動左側/右側與階段隱藏 (`Move / Hide`)** 及 **無障礙聲明與即時修補統計 (`Statement`)**。

7. **狀態持久化 (`localStorage`)**
   - 儲存鍵值：`a11y_widget_state_v1`
   - 自動保存使用者的無障礙調整狀態、目前啟用的情境模式、XL 面板模式、左右側覆寫與介面語言偏好 (`zh-TW` / `en`)。

---

## 三、`<script>` 配置屬性與公開 API

### `<script>` 標籤 `data-*` 屬性
可透過 `<script src="./a11y-widget.js" ... defer></script>` 或全域物件 `window.A11yWidgetConfig` 進行初始配置：

| 屬性名稱 | JS 配置鍵 | 預設值 | 可選值 / 說明 |
| --- | --- | --- | --- |
| `data-color` | `color` | `#2563eb` | 主題 HEX 色碼（自動計算文字反白對比色） |
| `data-position` | `position` | `bottom-right` | `bottom-right` \| `bottom-left` \| `top-right` \| `top-left` \| `middle-right` \| `middle-left` |
| `data-size` | `size` | `md` | `sm` (46px) \| `md` (54px) \| `lg` (64px) |
| `data-shape` | `shape` | `circle` | `circle` (圓形純圖示) \| `pill` (膠囊圖示+文字) |
| `data-icon` | `icon` | `universal` | `universal` \| `eye` \| `sliders` |
| `data-offset-x` | `offsetX` | `24` | 水平邊距 px (`0`–`120`) |
| `data-offset-y` | `offsetY` | `24` | 垂直邊距 px (`0`–`120`) |
| `data-lang` | `lang` | `zh-TW` | `zh-TW` \| `en` |
| `data-shortcut` | `shortcut` | `Alt+U` | 鍵盤快速開關面板組合鍵 |
| `data-modules` | `modules` | 全部啟用 | 逗號分隔啟用模組：`profiles,visual,typography,navigation,motion,structure` |

### `window.A11yWidget` 公開方法
- `init(customConfig)`: 重新讀取配置並掛載初始化。
- `updateConfig(partialConfig)`: 即時更新主題外觀、位置、語言或啟用模組配置（供 `configurator.html` 即時預覽使用）。
- `getConfig()`: 取得目前套用的配置物件複本。
- `open()` / `close()` / `toggle()`: 控制無障礙面板開關。
- `getState()` / `setState(partialState)`: 讀取或批次更新無障礙功能狀態。
- `applyProfile(profileId)`: 一鍵套用指定的情境快速模式。
- `getRemediationStats()`: 取得目前自動 ARIA 修補的計數統計 (`imgAltFixed`, `inputLabelFixed`, `blankLinksSecured`)。
- `reset()`: 清除所有無障礙設定並停止語音朗讀，還原預設狀態。
