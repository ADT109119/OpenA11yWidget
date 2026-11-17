/**
 * OpenA11yWidget - Standalone Zero-Dependency Web Accessibility Widget
 * Isolates its UI inside an Open Shadow DOM (#a11y-widget-host), preserves host
 * fixed positioning via a Shadow DOM backdrop-filter layer, prevents focus traps
 * with `inert`, provides a Skip-to-Content bar, runs MutationObserver ARIA remediation,
 * and cleans up cleanly on @media print.
 *
 * Public API: window.A11yWidget
 */
(function (global) {
  'use strict';

  if (global.__A11Y_WIDGET_LOADED__) {
    return;
  }
  global.__A11Y_WIDGET_LOADED__ = true;

  var STORAGE_KEY = 'a11y_widget_state_v1';
  var HOST_ID = 'a11y-widget-host';
  var SKIP_HOST_ID = 'a11y-skip-host';
  var SVG_DEFS_ID = 'a11y-svg-defs';
  var HOST_STYLE_ID = 'a11y-host-injected-style';
  var ALL_MODULES = ['profiles', 'visual', 'typography', 'navigation', 'motion', 'structure'];

  var DEFAULT_CONFIG = {
    color: '#2563eb',
    position: 'bottom-right',
    size: 'md',
    shape: 'circle',
    icon: 'universal',
    offsetX: 24,
    offsetY: 24,
    lang: 'zh-TW',
    shortcut: 'Alt+U',
    modules: ALL_MODULES.slice()
  };

  var DEFAULT_STATE = {
    activeProfile: null,
    contrast: 'normal',       // 'normal' | 'dark' | 'light' | 'invert'
    saturation: 'normal',     // 'normal' | 'high' | 'low' | 'grayscale'
    colorblind: 'none',       // 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'
    fontSize: 0,              // 0..3
    lineHeight: 0,            // 0..3
    letterSpacing: 0,         // 0..3
    readableFont: 0,          // 0 (off) | 1 (legible sans) | 2 (dyslexia friendly)
    textAlign: 'normal',      // 'normal' | 'left' | 'center' | 'justify'
    bigCursor: 'none',        // 'none' | 'white' | 'black'
    readingGuide: false,
    readingMask: false,
    highlightLinks: false,
    highlightHeadings: false,
    focusOutline: false,
    tooltips: false,
    stopAnimations: false,
    hideImages: false,
    ttsClick: false,
    ttsRate: 1.0,
    oversizedWidget: false,
    sideOverride: null,       // null | 'left' | 'right'
    widgetHidden: false,
    langOverride: null
  };

  var PROFILES = {
    'visually-impaired': {
      fontSize: 1,
      contrast: 'dark',
      bigCursor: 'white',
      saturation: 'high',
      focusOutline: true
    },
    'colorblind-friendly': {
      colorblind: 'deuteranopia',
      highlightLinks: true,
      highlightHeadings: true
    },
    'adhd-focus': {
      readingMask: true,
      stopAnimations: true,
      saturation: 'low'
    },
    'senior-friendly': {
      fontSize: 2,
      lineHeight: 1,
      letterSpacing: 1,
      bigCursor: 'black',
      highlightLinks: true,
      ttsClick: true
    },
    'seizure-safe': {
      stopAnimations: true,
      saturation: 'low'
    },
    'dyslexia-friendly': {
      readableFont: 2,
      letterSpacing: 1,
      lineHeight: 1,
      readingGuide: true,
      stopAnimations: true
    },
    'motor-impaired': {
      focusOutline: true,
      highlightLinks: true,
      tooltips: true,
      bigCursor: 'black',
      stopAnimations: true
    },
    'cognitive-learning': {
      highlightHeadings: true,
      highlightLinks: true,
      tooltips: true,
      fontSize: 1,
      readingGuide: true
    }
  };

  var I18N = {
    'zh-TW': {
      brandTitle: '無障礙輔助工具',
      brandSubtitle: 'Accessibility Menu',
      triggerLabel: '開啟無障礙輔助選單',
      triggerPillText: '無障礙',
      closeLabel: '關閉選單',
      xlLabel: '超大面板模式 (XL)',
      resetAll: '全部重設',
      resetDone: '已還原預設設定',
      tabAdjust: '無障礙調整',
      tabStructure: '頁面結構導覽',
      secProfiles: '情境快速模式 (8 種)',
      secVisual: '視覺與色彩',
      secTypography: '文字與排版',
      secNavigation: '導航與閱讀輔助',
      secMotion: '動態抑制與語音',
      profVisuallyImpaired: '視障輔助',
      profVisuallyImpairedDesc: '放大文字、深色高對比、大游標',
      profColorblind: '色盲友善',
      profColorblindDesc: '紅綠色盲補償與醒目標示',
      profAdhd: 'ADHD 專注',
      profAdhdDesc: '專注閱讀遮罩與停用動態',
      profSenior: '長者友善',
      profSeniorDesc: '特大字體、行距與點擊朗讀',
      profSeizure: '防癲癇模式',
      profSeizureDesc: '全面暫停閃爍與降低飽和',
      profDyslexia: '閱讀障礙友善',
      profDyslexiaDesc: '防混淆字體、加寬字行距與閱讀尺規',
      profMotor: '肢體 / 鍵盤輔助',
      profMotorDesc: '焦點強化、大游標、提示氣泡與停用動態',
      profCognitive: '認知與學習輔助',
      profCognitiveDesc: '醒目標題連結、提示氣泡與輔助尺規',
      featContrast: '對比模式',
      contrast_normal: '預設',
      contrast_dark: '深色高對比',
      contrast_light: '淺色高對比',
      contrast_invert: '色彩反相',
      featSaturation: '色彩飽和度',
      saturation_normal: '預設',
      saturation_high: '高飽和',
      saturation_low: '低飽和',
      saturation_grayscale: '全灰階',
      featColorblind: '色盲濾鏡',
      colorblind_none: '關閉',
      colorblind_deuteranopia: '綠色盲補償',
      colorblind_protanopia: '紅色盲補償',
      colorblind_tritanopia: '藍黃色盲',
      featFontSize: '字體大小',
      fontSize_0: '預設 (100%)',
      fontSize_1: '+15% 放大',
      fontSize_2: '+30% 特大',
      fontSize_3: '+45% 極大',
      featLineHeight: '行高調整',
      lineHeight_0: '預設',
      lineHeight_1: '1.75x 寬鬆',
      lineHeight_2: '2.10x 加寬',
      lineHeight_3: '2.45x 特寬',
      featLetterSpacing: '字距調整',
      letterSpacing_0: '預設',
      letterSpacing_1: '微寬字距',
      letterSpacing_2: '加寬字距',
      letterSpacing_3: '特寬字距',
      featReadableFont: '易讀字體',
      readableFont_0: '預設',
      readableFont_1: '高易讀黑體',
      readableFont_2: '閱讀障礙字體',
      featTextAlign: '文字對齊',
      textAlign_normal: '預設',
      textAlign_left: '靠左對齊',
      textAlign_center: '置中對齊',
      textAlign_justify: '左右對齊',
      featBigCursor: '大尺寸游標',
      bigCursor_none: '預設',
      bigCursor_white: '白色大游標',
      bigCursor_black: '黑色大游標',
      featReadingGuide: '閱讀尺規',
      featReadingMask: '專注遮罩',
      featHighlightLinks: '醒目連結',
      featHighlightHeadings: '醒目標題',
      featFocusOutline: '焦點強化',
      featTooltips: '提示氣泡',
      featStopAnimations: '暫停動畫',
      featHideImages: '隱藏圖片',
      featTtsClick: '點擊朗讀',
      on: '已開啟',
      off: '已關閉',
      ttsBarTitle: '語音朗讀控制',
      ttsBarHint: '將滑鼠移至網頁文字並點擊即可朗讀',
      ttsUnsupported: '此瀏覽器不支援語音合成 (SpeechSynthesis)',
      ttsPlayPause: '播放 / 暫停',
      ttsStop: '停止朗讀',
      ttsRateLabel: '語速',
      ttsSpeaking: '正在朗讀中...',
      ttsPaused: '已暫停',
      ttsReady: '待命中，請點擊頁面文字',
      structHeadings: '標題樹',
      structLandmarks: '語意地標',
      structLinks: '頁面連結',
      structRefresh: '重新掃描',
      structEmpty: '此頁面未偵測到相關項目',
      structJumpHint: '點擊任意項目可平滑跳轉並聚焦',
      footerShortcut: '快捷鍵',
      footerActiveCount: '項調整',
      moveHideBtn: '移動 / 隱藏',
      moveLeft: '移至左側',
      moveRight: '移至右側',
      hideWidget: '暫時隱藏按鈕',
      hiddenToast: '已隱藏無障礙按鈕，按快捷鍵即可重新喚出',
      statementBtn: '無障礙聲明',
      statementTitle: '無障礙輔助聲明與技術資訊',
      statementClose: '返回調整面板',
      statementBody: '本網站搭載 OpenA11yWidget 無障礙輔助小工具，協助視覺、色覺、閱讀障礙、認知與鍵盤使用者客製化瀏覽體驗，並提供自動基礎 ARIA 修補與原生跳轉導覽列。',
      statementShortcuts: '鍵盤快捷導覽',
      statementShortcutToggle: '開啟 / 關閉無障礙選單（含喚回已隱藏按鈕）',
      statementShortcutTab: '於網頁頂端顯示「跳至主要內容」快速導覽列',
      statementShortcutEsc: '關閉開啟中的無障礙選單',
      statementRemediation: '即時 DOM 自動修補統計',
      statImgAlt: '圖片缺失 alt 補齊',
      statInputLabel: '表單欄位 aria-label 補齊',
      statBlankLinks: '外連新分頁安全與語意補強',
      skipToMain: '跳至主要內容',
      skipToMenu: '開啟無障礙選單',
      newTabHint: '（將於新分頁開啟）',
      langSwitch: 'EN',
      imgAltPrefix: '圖片替代文字：',
      imgNoAlt: '裝飾性圖片（無 alt 說明）'
    },
    en: {
      brandTitle: 'Accessibility Menu',
      brandSubtitle: 'Web A11y Assistant',
      triggerLabel: 'Open Accessibility Menu',
      triggerPillText: 'Accessibility',
      closeLabel: 'Close menu',
      xlLabel: 'Oversized Widget (XL)',
      resetAll: 'Reset All',
      resetDone: 'Settings restored to default',
      tabAdjust: 'Adjustments',
      tabStructure: 'Page Structure',
      secProfiles: 'Accessibility Profiles (8)',
      secVisual: 'Visual & Color',
      secTypography: 'Typography & Layout',
      secNavigation: 'Navigation & Reading Aids',
      secMotion: 'Motion & Speech',
      profVisuallyImpaired: 'Vision Impaired',
      profVisuallyImpairedDesc: 'Larger text, dark high contrast, big cursor',
      profColorblind: 'Colorblind Safe',
      profColorblindDesc: 'Deuteranopia filter & clear highlights',
      profAdhd: 'ADHD Friendly',
      profAdhdDesc: 'Reading mask & pause animations',
      profSenior: 'Senior Friendly',
      profSeniorDesc: 'Extra large text, spacing & click-to-speak',
      profSeizure: 'Seizure Safe',
      profSeizureDesc: 'Stop flashing animations & reduce saturation',
      profDyslexia: 'Dyslexia Friendly',
      profDyslexiaDesc: 'Dyslexia-friendly font, spacing & reading guide',
      profMotor: 'Motor Impaired',
      profMotorDesc: 'Strong focus ring, tooltips, big cursor & still page',
      profCognitive: 'Cognitive & Learning',
      profCognitiveDesc: 'Highlight headings/links, tooltips & reading guide',
      featContrast: 'Contrast',
      contrast_normal: 'Default',
      contrast_dark: 'Dark High',
      contrast_light: 'Light High',
      contrast_invert: 'Invert Colors',
      featSaturation: 'Saturation',
      saturation_normal: 'Default',
      saturation_high: 'High',
      saturation_low: 'Low',
      saturation_grayscale: 'Grayscale',
      featColorblind: 'Color Filter',
      colorblind_none: 'Off',
      colorblind_deuteranopia: 'Deuteranopia',
      colorblind_protanopia: 'Protanopia',
      colorblind_tritanopia: 'Tritanopia',
      featFontSize: 'Text Size',
      fontSize_0: 'Default (100%)',
      fontSize_1: '+15% Larger',
      fontSize_2: '+30% Large',
      fontSize_3: '+45% Largest',
      featLineHeight: 'Line Height',
      lineHeight_0: 'Default',
      lineHeight_1: '1.75x Relaxed',
      lineHeight_2: '2.10x Wide',
      lineHeight_3: '2.45x Extra',
      featLetterSpacing: 'Text Spacing',
      letterSpacing_0: 'Default',
      letterSpacing_1: 'Light Spacing',
      letterSpacing_2: 'Medium Spacing',
      letterSpacing_3: 'Wide Spacing',
      featReadableFont: 'Readable Font',
      readableFont_0: 'Default',
      readableFont_1: 'Legible Sans',
      readableFont_2: 'Dyslexia Font',
      featTextAlign: 'Text Align',
      textAlign_normal: 'Default',
      textAlign_left: 'Align Left',
      textAlign_center: 'Align Center',
      textAlign_justify: 'Justify',
      featBigCursor: 'Big Cursor',
      bigCursor_none: 'Default',
      bigCursor_white: 'White Cursor',
      bigCursor_black: 'Black Cursor',
      featReadingGuide: 'Reading Guide',
      featReadingMask: 'Reading Mask',
      featHighlightLinks: 'Highlight Links',
      featHighlightHeadings: 'Highlight Headings',
      featFocusOutline: 'Focus Ring',
      featTooltips: 'Tooltips',
      featStopAnimations: 'Pause Motion',
      featHideImages: 'Hide Images',
      featTtsClick: 'Click to Speak',
      on: 'Active',
      off: 'Off',
      ttsBarTitle: 'Voice Reader',
      ttsBarHint: 'Hover and click any text on the page to listen',
      ttsUnsupported: 'SpeechSynthesis is not supported in this browser',
      ttsPlayPause: 'Play / Pause',
      ttsStop: 'Stop',
      ttsRateLabel: 'Speed',
      ttsSpeaking: 'Speaking...',
      ttsPaused: 'Paused',
      ttsReady: 'Ready — click any page text',
      structHeadings: 'Headings',
      structLandmarks: 'Landmarks',
      structLinks: 'Links',
      structRefresh: 'Rescan',
      structEmpty: 'No items found on this page',
      structJumpHint: 'Click an item to scroll & highlight',
      footerShortcut: 'Shortcut',
      footerActiveCount: 'active',
      moveHideBtn: 'Move / Hide',
      moveLeft: 'Move Left',
      moveRight: 'Move Right',
      hideWidget: 'Hide Button',
      hiddenToast: 'Button hidden. Press shortcut to reopen anytime.',
      statementBtn: 'Statement',
      statementTitle: 'Accessibility Statement & Diagnostics',
      statementClose: 'Back to Menu',
      statementBody: 'This site integrates OpenA11yWidget to assist visitors with visual, cognitive, motor, and reading needs, backed by Shadow DOM isolation, Skip-to-Content navigation, and live ARIA remediation.',
      statementShortcuts: 'Keyboard Navigation',
      statementShortcutToggle: 'Toggle menu (also restores hidden button)',
      statementShortcutTab: 'Reveal Skip-to-Content quick bar at top of page',
      statementShortcutEsc: 'Close open accessibility panel',
      statementRemediation: 'Live DOM Remediation Stats',
      statImgAlt: 'Missing image alt attributes fixed',
      statInputLabel: 'Unlabeled form controls labeled',
      statBlankLinks: 'New-tab links secured & annotated',
      skipToMain: 'Skip to Main Content',
      skipToMenu: 'Accessibility Menu',
      newTabHint: ' (opens in new tab)',
      langSwitch: '中文',
      imgAltPrefix: 'Image ALT: ',
      imgNoAlt: 'Decorative image (no alt text)'
    }
  };

  var config = cloneObj(DEFAULT_CONFIG);
  var state = cloneObj(DEFAULT_STATE);
  var isOpen = false;
  var showMoveDrawer = false;
  var showStatement = false;
  var activeMainTab = 'adjust';
  var activeStructTab = 'headings';
  var suppressAnimationOnce = false;
  var initialized = false;

  var hostEl = null;
  var shadow = null;
  var skipHostEl = null;
  var skipShadow = null;
  var hostStyleEl = null;
  var svgDefsEl = null;

  var fontSizeCache = new WeakMap();
  var scaledElements = new Set();
  var remediatedNodes = new WeakSet();
  var remediationStats = {
    imgAltFixed: 0,
    inputLabelFixed: 0,
    blankLinksSecured: 0
  };

  var pointerY = 220;
  var rafGuidePending = false;
  var rafAltOverlayPending = false;
  var mutationObserver = null;
  var mutationTimer = null;

  var ttsState = {
    speaking: false,
    paused: false,
    activeEl: null,
    currentText: ''
  };

  var ICONS = {
    universal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2.2" fill="currentColor" stroke="none"/><path d="M5 8.5h14"/><path d="M12 8.5v5.5"/><path d="M12 14l-3.5 6.5"/><path d="M12 14l3.5 6.5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    contrast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
    saturation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
    colorblind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9.5" cy="10" r="5"/><circle cx="14.5" cy="14" r="5"/></svg>',
    fontSize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19L9 5l5 14"/><path d="M5.5 15h7"/><path d="M16 14l2.5-6 2.5 6"/><path d="M16.8 12.2h3.4"/></svg>',
    lineHeight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4v16M2.5 6.5L5 4l2.5 2.5M2.5 17.5L5 20l2.5-2.5"/><path d="M11 6h10M11 12h10M11 18h10"/></svg>',
    letterSpacing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19h16M7 16l-3 3 3 3M17 16l3 3-3 3"/><path d="M8 12V5M16 12V5M8 8.5h8"/></svg>',
    readableFont: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/></svg>',
    textAlign: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 10h12M3 14h18M3 18h12"/></svg>',
    cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M5 3l14 9-6.5 1.8L9 20z"/></svg>',
    guide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7 9v2M12 9v3M17 9v2"/></svg>',
    mask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 15h18" stroke-dasharray="2 2"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    heading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 5v14M18 5v14M6 12h12"/></svg>',
    focus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><rect x="8" y="8" width="8" height="8" rx="1.5"/></svg>',
    tooltip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5l-3 3-3-3H6a2 2 0 0 1-2-2V6z"/><path d="M8 9h8M8 13h5"/></svg>',
    motion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></svg>',
    hideImg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 5"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
    speech: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    profileVision: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2"/></svg>',
    profileAdhd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
    profileSenior: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5.5" r="2.5"/><path d="M7 21v-5l2-4.5c.6-1.2 1.7-2 3-2s2.4.8 3 2L17 16v5"/><path d="M19 21v-7"/></svg>',
    profileSeizure: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/><line x1="3" y1="3" x2="21" y2="21"/></svg>',
    profileDyslexia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V5h6a4 4 0 0 1 0 8H4"/><path d="M14 19l3.5-9 3.5 9"/><path d="M15 16h5"/></svg>',
    profileMotor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h2M11 10h2M15 10h2M8 14h8"/></svg>',
    profileCognitive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.48V15a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.52A6 6 0 0 0 12 3z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>'
  };

  function cloneObj(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function clampNumber(val, min, max, fallback) {
    var num = Number(val);
    if (!isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, Math.round(num)));
  }

  function normalizeColor(hex) {
    if (typeof hex !== 'string') return DEFAULT_CONFIG.color;
    var trimmed = hex.trim();
    if (/^#[0-9a-fA-F]{3}$/.test(trimmed) || /^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      return trimmed;
    }
    return DEFAULT_CONFIG.color;
  }

  function hexToRgb(hex) {
    var clean = normalizeColor(hex).replace('#', '');
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    var num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function getContrastTextColor(hex) {
    var rgb = hexToRgb(hex);
    var lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return lum > 0.62 ? '#0f172a' : '#ffffff';
  }

  function normalizeModules(val) {
    if (Array.isArray(val)) {
      var arr = val.map(function (m) { return String(m).trim(); }).filter(function (m) {
        return ALL_MODULES.indexOf(m) !== -1;
      });
      return arr.length ? arr : ALL_MODULES.slice();
    }
    if (typeof val === 'string' && val.trim()) {
      var parsed = val.split(',').map(function (m) { return m.trim(); }).filter(function (m) {
        return ALL_MODULES.indexOf(m) !== -1;
      });
      return parsed.length ? parsed : ALL_MODULES.slice();
    }
    return ALL_MODULES.slice();
  }

  function findScriptElement() {
    if (document.currentScript && document.currentScript.tagName === 'SCRIPT') {
      return document.currentScript;
    }
    var scripts = document.querySelectorAll('script[src]');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (/a11y-widget\.js(\?|$|#)/i.test(scripts[i].getAttribute('src') || '')) {
        return scripts[i];
      }
    }
    return null;
  }

  function readScriptDataset(scriptEl) {
    if (!scriptEl) return {};
    var ds = scriptEl.dataset || {};
    var parsed = {};
    if (ds.color) parsed.color = ds.color;
    if (ds.position) parsed.position = ds.position;
    if (ds.size) parsed.size = ds.size;
    if (ds.shape) parsed.shape = ds.shape;
    if (ds.icon) parsed.icon = ds.icon;
    if (ds.offsetX !== undefined) parsed.offsetX = ds.offsetX;
    if (ds.offsetY !== undefined) parsed.offsetY = ds.offsetY;
    if (ds.lang) parsed.lang = ds.lang;
    if (ds.shortcut) parsed.shortcut = ds.shortcut;
    if (ds.modules) parsed.modules = ds.modules;
    return parsed;
  }

  function mergeConfig(base, patch) {
    var next = cloneObj(base);
    if (!patch || typeof patch !== 'object') return next;
    if (patch.color !== undefined) next.color = normalizeColor(patch.color);
    if (['bottom-right', 'bottom-left', 'top-right', 'top-left', 'middle-right', 'middle-left'].indexOf(patch.position) !== -1) {
      next.position = patch.position;
    }
    if (['sm', 'md', 'lg'].indexOf(patch.size) !== -1) next.size = patch.size;
    if (['circle', 'pill'].indexOf(patch.shape) !== -1) next.shape = patch.shape;
    if (['universal', 'eye', 'sliders'].indexOf(patch.icon) !== -1) next.icon = patch.icon;
    if (patch.offsetX !== undefined) next.offsetX = clampNumber(patch.offsetX, 0, 120, next.offsetX);
    if (patch.offsetY !== undefined) next.offsetY = clampNumber(patch.offsetY, 0, 120, next.offsetY);
    if (['zh-TW', 'en'].indexOf(patch.lang) !== -1) next.lang = patch.lang;
    if (typeof patch.shortcut === 'string' && patch.shortcut.trim()) next.shortcut = patch.shortcut.trim();
    if (patch.modules !== undefined) next.modules = normalizeModules(patch.modules);
    return next;
  }

  function getEffectivePosition() {
    var pos = config.position;
    if (state.sideOverride === 'left') {
      return pos.replace('-right', '-left');
    }
    if (state.sideOverride === 'right') {
      return pos.replace('-left', '-right');
    }
    return pos;
  }

  function getActiveLang() {
    if (state.langOverride && I18N[state.langOverride]) {
      return state.langOverride;
    }
    return I18N[config.lang] ? config.lang : 'zh-TW';
  }

  function t(key) {
    var lang = getActiveLang();
    return (I18N[lang] && I18N[lang][key]) || I18N['zh-TW'][key] || key;
  }

  function loadState() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.keys(DEFAULT_STATE).forEach(function (k) {
          if (parsed[k] !== undefined) {
            state[k] = parsed[k];
          }
        });
        // Migrate legacy boolean readableFont to 0/1/2 step
        if (typeof state.readableFont === 'boolean') {
          state.readableFont = state.readableFont ? 1 : 0;
        }
      }
    } catch (e) {
      // Ignore storage access errors
    }
  }

  function saveState() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore storage errors
    }
  }

  function countActiveAdjustments() {
    var count = 0;
    if (state.contrast !== 'normal') count++;
    if (state.saturation !== 'normal') count++;
    if (state.colorblind !== 'none') count++;
    if (state.fontSize > 0) count++;
    if (state.lineHeight > 0) count++;
    if (state.letterSpacing > 0) count++;
    if (state.readableFont > 0) count++;
    if (state.textAlign !== 'normal') count++;
    if (state.bigCursor !== 'none') count++;
    if (state.readingGuide) count++;
    if (state.readingMask) count++;
    if (state.highlightLinks) count++;
    if (state.highlightHeadings) count++;
    if (state.focusOutline) count++;
    if (state.tooltips) count++;
    if (state.stopAnimations) count++;
    if (state.hideImages) count++;
    if (state.ttsClick) count++;
    return count;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isOwnNode(node) {
    if (!node) return false;
    if (hostEl && (node === hostEl || hostEl.contains(node))) return true;
    if (skipHostEl && (node === skipHostEl || skipHostEl.contains(node))) return true;
    if (svgDefsEl && (node === svgDefsEl || svgDefsEl.contains(node))) return true;
    if (hostStyleEl && node === hostStyleEl) return true;
    return false;
  }

  function announce(msg) {
    if (!shadow || !msg) return;
    var sr = shadow.getElementById('a11y-sr-announcer');
    if (!sr) return;
    sr.textContent = '';
    global.setTimeout(function () {
      sr.textContent = msg;
    }, 30);
  }

  function getCursorDataUri(mode) {
    var fill = mode === 'white' ? '#ffffff' : '#0f172a';
    var stroke = mode === 'white' ? '#0f172a' : '#ffffff';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 32 32">' +
      '<path d="M5 3l18 11.5-8 2.2-4.2 8.3z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '</svg>';
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '") 4 3, auto';
  }

  function ensureSvgDefs() {
    if (svgDefsEl && document.body.contains(svgDefsEl)) return;
    svgDefsEl = document.getElementById(SVG_DEFS_ID);
    if (!svgDefsEl) {
      svgDefsEl = document.createElement('div');
      svgDefsEl.id = SVG_DEFS_ID;
      svgDefsEl.setAttribute('aria-hidden', 'true');
      svgDefsEl.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;z-index:-1;';
      svgDefsEl.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">' +
        '  <defs>' +
        '    <filter id="a11y-filter-deuteranopia" color-interpolation-filters="sRGB">' +
        '      <feColorMatrix type="matrix" values="1.15 -0.15 0 0 0  0 0.85 0.15 0 0  -0.25 0.45 0.80 0 0  0 0 0 1 0"/>' +
        '    </filter>' +
        '    <filter id="a11y-filter-protanopia" color-interpolation-filters="sRGB">' +
        '      <feColorMatrix type="matrix" values="0.85 0.15 0 0 0  -0.15 1.15 0 0 0  0.45 -0.25 0.80 0 0  0 0 0 1 0"/>' +
        '    </filter>' +
        '    <filter id="a11y-filter-tritanopia" color-interpolation-filters="sRGB">' +
        '      <feColorMatrix type="matrix" values="0.95 0.05 0 0 0  0 0.85 0.15 0 0  0.25 -0.15 0.90 0 0  0 0 0 1 0"/>' +
        '    </filter>' +
        '  </defs>' +
        '</svg>';
      document.body.appendChild(svgDefsEl);
    }
  }

  function ensureHostStyle() {
    if (hostStyleEl && document.head.contains(hostStyleEl)) return hostStyleEl;
    hostStyleEl = document.getElementById(HOST_STYLE_ID);
    if (!hostStyleEl) {
      hostStyleEl = document.createElement('style');
      hostStyleEl.id = HOST_STYLE_ID;
      document.head.appendChild(hostStyleEl);
    }
    return hostStyleEl;
  }

  // Non-destructive Auto-ARIA Remediation on Host Page
  function runAutoRemediation() {
    if (!document.body) return;

    // 1. Images missing alt attribute
    var imgs = document.querySelectorAll('img:not([alt])');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (isOwnNode(img) || remediatedNodes.has(img)) continue;
      remediatedNodes.add(img);
      var aria = (img.getAttribute('aria-label') || img.getAttribute('title') || '').trim();
      if (aria) {
        img.setAttribute('alt', aria);
      } else {
        img.setAttribute('alt', '');
        if (!img.hasAttribute('role')) img.setAttribute('role', 'presentation');
      }
      img.setAttribute('data-a11y-remediated', 'img-alt');
      remediationStats.imgAltFixed++;
    }

    // 2. Form controls missing accessible label
    var controls = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby])');
    for (var j = 0; j < controls.length; j++) {
      var ctrl = controls[j];
      if (isOwnNode(ctrl) || remediatedNodes.has(ctrl)) continue;
      var hasExplicitLabel = false;
      if (ctrl.id) {
        try {
          if (document.querySelector('label[for="' + CSS.escape(ctrl.id) + '"]')) {
            hasExplicitLabel = true;
          }
        } catch (e) {
          // ignore invalid selector chars
        }
      }
      if (!hasExplicitLabel && ctrl.closest && ctrl.closest('label')) {
        hasExplicitLabel = true;
      }
      if (hasExplicitLabel) continue;

      var inferred = (ctrl.getAttribute('placeholder') || ctrl.getAttribute('title') || ctrl.getAttribute('name') || '').trim();
      if (inferred) {
        remediatedNodes.add(ctrl);
        ctrl.setAttribute('aria-label', inferred);
        ctrl.setAttribute('data-a11y-remediated', 'input-label');
        remediationStats.inputLabelFixed++;
      }
    }

    // 3. Links opening in new tab
    var blankLinks = document.querySelectorAll('a[target="_blank"]');
    for (var k = 0; k < blankLinks.length; k++) {
      var lnk = blankLinks[k];
      if (isOwnNode(lnk) || remediatedNodes.has(lnk)) continue;
      remediatedNodes.add(lnk);
      var rel = (lnk.getAttribute('rel') || '').trim();
      var changed = false;
      if (!/\bnoopener\b/i.test(rel)) {
        lnk.setAttribute('rel', (rel ? rel + ' ' : '') + 'noopener noreferrer');
        changed = true;
      }
      if (!lnk.hasAttribute('aria-label')) {
        var txt = (lnk.innerText || lnk.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) {
          lnk.setAttribute('aria-label', txt + t('newTabHint'));
          changed = true;
        }
      }
      if (changed) {
        lnk.setAttribute('data-a11y-remediated', 'blank-link');
        remediationStats.blankLinksSecured++;
      }
    }
  }

  function applyFontScaling(step) {
    var scales = [1, 1.15, 1.3, 1.45];
    var factor = scales[step] || 1;
    var root = document.documentElement;

    // Restore previously scaled elements before reading true unscaled sizes or resetting
    scaledElements.forEach(function (el) {
      if (el && el.isConnected) {
        var cached = fontSizeCache.get(el);
        if (cached) {
          el.style.fontSize = cached.inlineFontSize;
        }
      }
    });
    scaledElements.clear();

    if (step === 0) {
      root.removeAttribute('data-a11y-font-scale');
      return;
    }

    root.setAttribute('data-a11y-font-scale', String(step));
    var selector = 'h1,h2,h3,h4,h5,h6,p,li,a,button,label,span,td,th,dt,dd,blockquote,input,textarea,select,small,strong,em,figcaption';
    var candidates = document.body.querySelectorAll(selector);
    var toScale = [];

    // Pass 1 (pure read): collect true unscaled font sizes before any write
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el || isOwnNode(el)) continue;
      if (el.closest && (el.closest('#' + HOST_ID) || el.closest('#' + SKIP_HOST_ID) || el.closest('#' + SVG_DEFS_ID))) continue;
      if (!fontSizeCache.has(el)) {
        var cs = global.getComputedStyle(el);
        var origPx = parseFloat(cs.fontSize);
        if (!isFinite(origPx) || origPx <= 0) continue;
        fontSizeCache.set(el, {
          origPx: origPx,
          inlineFontSize: el.style.fontSize || ''
        });
      }
      var record = fontSizeCache.get(el);
      if (record) {
        toScale.push({ el: el, targetPx: (record.origPx * factor).toFixed(2) + 'px' });
      }
    }

    // Pass 2 (pure write): apply scaled font sizes without cascading double-scaling
    for (var j = 0; j < toScale.length; j++) {
      var item = toScale[j];
      item.el.style.setProperty('font-size', item.targetPx, 'important');
      scaledElements.add(item.el);
    }
  }

  function applyHostEffects() {
    if (!document.body || !document.head) return;
    ensureSvgDefs();
    var styleEl = ensureHostStyle();
    var root = document.documentElement;
    var screenCss = [];

    // 1A. Shadow DOM Backdrop Filter Layer (preserves host position: fixed without mutating containing block!)
    var backdropFilters = [];
    if (state.contrast === 'invert') {
      backdropFilters.push('invert(1) hue-rotate(180deg)');
    }
    if (state.saturation === 'high') backdropFilters.push('saturate(185%)');
    else if (state.saturation === 'low') backdropFilters.push('saturate(45%)');
    else if (state.saturation === 'grayscale') backdropFilters.push('grayscale(100%)');

    if (shadow) {
      var backdropEl = shadow.getElementById('a11y-backdrop-filter');
      if (backdropEl) {
        if (backdropFilters.length > 0) {
          backdropEl.hidden = false;
          var bfVal = backdropFilters.join(' ');
          backdropEl.style.backdropFilter = bfVal;
          backdropEl.style.webkitBackdropFilter = bfVal;
        } else {
          backdropEl.hidden = true;
          backdropEl.style.backdropFilter = 'none';
          backdropEl.style.webkitBackdropFilter = 'none';
        }
      }
    }

    var contentScope = 'body > *:not(#' + HOST_ID + '):not(#' + SKIP_HOST_ID + '):not(#' + SVG_DEFS_ID + ')';

    if (state.contrast === 'invert') {
      // Counter-invert media so photos remain natural while keeping fixed layout intact
      screenCss.push(
        contentScope + ' img, ' + contentScope + ' picture, ' + contentScope + ' video {' +
        '  filter: invert(1) hue-rotate(180deg) !important;' +
        '}'
      );
    }

    // 1B. Colorblind SVG Matrix Filter (applied only when SVG colorblind filter is active)
    if (state.colorblind !== 'none') {
      root.setAttribute('data-a11y-filter-active', 'true');
      screenCss.push(
        'html[data-a11y-filter-active="true"] ' + contentScope + ':not(script):not(style):not(link) {' +
        '  filter: url(#a11y-filter-' + state.colorblind + ') !important;' +
        '}'
      );
    } else {
      root.removeAttribute('data-a11y-filter-active');
    }

    // 2. High-contrast Dark / Light themes (preserve swatches, decorative dots, and inline span transparency)
    var contrastSkip = ':not(.swatch-card):not(.swatch-card *):not(.swatch-btn):not(.pulse-dot)';
    if (state.contrast === 'dark') {
      screenCss.push(
        'html, body { background: #000000 !important; background-color: #000000 !important; color: #ffffff !important; }' +
        contentScope + contrastSkip + ', ' + contentScope + ' *' + contrastSkip + ' {' +
        '  background-color: #050505 !important;' +
        '  background-image: none !important;' +
        '  color: #ffffff !important;' +
        '  border-color: #64748b !important;' +
        '  box-shadow: none !important;' +
        '}' +
        contentScope + ' span:not(.swatch-card):not(.pulse-dot):not(.shortcut-kbd):not(.topbar-badge):not(.brand-badge), ' +
        contentScope + ' strong, ' + contentScope + ' em, ' + contentScope + ' small, ' + contentScope + ' code {' +
        '  background-color: transparent !important;' +
        '}' +
        contentScope + ' a, ' + contentScope + ' a * { color: #fde047 !important; text-decoration-color: #fde047 !important; }' +
        contentScope + ' button, ' + contentScope + ' [role="button"], ' + contentScope + ' a.btn, ' +
        contentScope + ' input[type="submit"], ' + contentScope + ' input[type="button"] {' +
        '  background-color: #111827 !important; color: #38bdf8 !important; border: 2px solid #38bdf8 !important; text-decoration: none !important;' +
        '}' +
        contentScope + ' a.btn *, ' + contentScope + ' button * { color: #38bdf8 !important; }' +
        contentScope + ' input, ' + contentScope + ' textarea, ' + contentScope + ' select {' +
        '  background-color: #0f172a !important; color: #ffffff !important; border: 1.5px solid #cbd5e1 !important;' +
        '}' +
        contentScope + ' h1, ' + contentScope + ' h2, ' + contentScope + ' h3, ' + contentScope + ' h4, ' + contentScope + ' h5, ' + contentScope + ' h6 {' +
        '  color: #7dd3fc !important;' +
        '}'
      );
    } else if (state.contrast === 'light') {
      screenCss.push(
        'html, body { background: #ffffff !important; background-color: #ffffff !important; color: #000000 !important; }' +
        contentScope + contrastSkip + ', ' + contentScope + ' *' + contrastSkip + ' {' +
        '  background-color: #ffffff !important;' +
        '  background-image: none !important;' +
        '  color: #000000 !important;' +
        '  border-color: #000000 !important;' +
        '  box-shadow: none !important;' +
        '}' +
        contentScope + ' span:not(.swatch-card):not(.pulse-dot):not(.shortcut-kbd):not(.topbar-badge):not(.brand-badge), ' +
        contentScope + ' strong, ' + contentScope + ' em, ' + contentScope + ' small, ' + contentScope + ' code {' +
        '  background-color: transparent !important;' +
        '}' +
        contentScope + ' a, ' + contentScope + ' a * { color: #0000cc !important; text-decoration: underline !important; }' +
        contentScope + ' button, ' + contentScope + ' [role="button"], ' + contentScope + ' a.btn, ' + contentScope + ' input[type="submit"] {' +
        '  background-color: #f8fafc !important; color: #000000 !important; border: 2px solid #000000 !important; text-decoration: none !important;' +
        '}' +
        contentScope + ' a.btn *, ' + contentScope + ' button * { color: #000000 !important; }'
      );
    }

    // 3. Typography: Line Height, Letter Spacing, Readable/Dyslexia Font, Text Align (preserve monospace code)
    var codeExclude = ':not(pre):not(pre *):not(code):not(kbd):not(samp)';
    if (state.lineHeight > 0) {
      var lhMap = [null, '1.75', '2.1', '2.45'];
      var lhVal = lhMap[state.lineHeight] || '1.75';
      screenCss.push(
        contentScope + ' p, ' + contentScope + ' li, ' + contentScope + ' dd, ' + contentScope + ' dt, ' +
        contentScope + ' blockquote, ' + contentScope + ' td, ' + contentScope + ' th, ' + contentScope + ' label {' +
        '  line-height: ' + lhVal + ' !important;' +
        '}'
      );
    }

    if (state.letterSpacing > 0) {
      var lsMap = [null, ['0.06em', '0.12em'], ['0.12em', '0.24em'], ['0.18em', '0.36em']];
      var pair = lsMap[state.letterSpacing] || lsMap[1];
      screenCss.push(
        contentScope + codeExclude + ', ' + contentScope + ' *' + codeExclude + ' {' +
        '  letter-spacing: ' + pair[0] + ' !important;' +
        '  word-spacing: ' + pair[1] + ' !important;' +
        '}'
      );
    }

    if (state.readableFont === 1) {
      screenCss.push(
        contentScope + codeExclude + ', ' + contentScope + ' *' + codeExclude + ' {' +
        '  font-family: system-ui, -apple-system, "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", Arial, sans-serif !important;' +
        '  font-variant-ligatures: none !important;' +
        '  font-style: normal !important;' +
        '}'
      );
    } else if (state.readableFont === 2) {
      screenCss.push(
        contentScope + codeExclude + ', ' + contentScope + ' *' + codeExclude + ' {' +
        '  font-family: "OpenDyslexic", "Lexend", "Comic Sans MS", "Microsoft JhengHei", "Noto Sans TC", Arial, sans-serif !important;' +
        '  font-variant-ligatures: none !important;' +
        '  font-style: normal !important;' +
        '  letter-spacing: 0.05em !important;' +
        '  word-spacing: 0.14em !important;' +
        '}'
      );
    }

    if (state.textAlign !== 'normal') {
      screenCss.push(
        contentScope + ' p, ' + contentScope + ' h1, ' + contentScope + ' h2, ' + contentScope + ' h3, ' +
        contentScope + ' h4, ' + contentScope + ' h5, ' + contentScope + ' h6, ' + contentScope + ' li, ' +
        contentScope + ' blockquote, ' + contentScope + ' td, ' + contentScope + ' th {' +
        '  text-align: ' + state.textAlign + ' !important;' +
        '}'
      );
    }

    // 4. Big Cursor
    if (state.bigCursor !== 'none') {
      var cursorUrl = getCursorDataUri(state.bigCursor);
      screenCss.push(
        'html, body, ' + contentScope + ', ' + contentScope + ' * {' +
        '  cursor: ' + cursorUrl + ' !important;' +
        '}'
      );
    }

    // 5. Highlight Links & Headings
    if (state.highlightLinks) {
      screenCss.push(
        contentScope + ' a[href] {' +
        '  background-color: #fef08a !important;' +
        '  color: #111827 !important;' +
        '  outline: 2px solid #eab308 !important;' +
        '  outline-offset: 2px !important;' +
        '  text-decoration: underline !important;' +
        '  text-decoration-thickness: 2px !important;' +
        '  border-radius: 3px !important;' +
        '}' +
        contentScope + ' a[href] * {' +
        '  color: #111827 !important;' +
        '  background-color: transparent !important;' +
        '}'
      );
    }

    if (state.highlightHeadings) {
      screenCss.push(
        contentScope + ' h1, ' + contentScope + ' h2, ' + contentScope + ' h3, ' +
        contentScope + ' h4, ' + contentScope + ' h5, ' + contentScope + ' h6 {' +
        '  background-color: rgba(37, 99, 235, 0.10) !important;' +
        '  outline: 2px solid #2563eb !important;' +
        '  outline-offset: 4px !important;' +
        '  box-shadow: -5px 0 0 0 #2563eb !important;' +
        '  border-radius: 3px !important;' +
        '}'
      );
    }

    // 6. Focus Outline Enhancement
    if (state.focusOutline) {
      screenCss.push(
        contentScope + ' :focus, ' + contentScope + ' :focus-visible {' +
        '  outline: 3px solid #f97316 !important;' +
        '  outline-offset: 3px !important;' +
        '  box-shadow: 0 0 0 6px rgba(249, 115, 22, 0.35) !important;' +
        '}'
      );
    }

    // 7. Stop Animations
    if (state.stopAnimations) {
      screenCss.push(
        '*, *::before, *::after {' +
        '  animation-duration: 0.001ms !important;' +
        '  animation-iteration-count: 1 !important;' +
        '  animation-play-state: paused !important;' +
        '  transition-duration: 0.001ms !important;' +
        '  scroll-behavior: auto !important;' +
        '}'
      );
      pausePageVideos();
    }

    // 8. Hide Images
    if (state.hideImages) {
      screenCss.push(
        contentScope + ' img, ' + contentScope + ' picture, ' + contentScope + ' svg {' +
        '  opacity: 0 !important;' +
        '}' +
        contentScope + ' [style*="background-image"] {' +
        '  background-image: none !important;' +
        '}'
      );
    }

    // 9. Click-to-Speak Hover & Active Highlight
    if (state.ttsClick) {
      screenCss.push(
        contentScope + ' p:hover, ' + contentScope + ' h1:hover, ' + contentScope + ' h2:hover, ' +
        contentScope + ' h3:hover, ' + contentScope + ' h4:hover, ' + contentScope + ' h5:hover, ' +
        contentScope + ' h6:hover, ' + contentScope + ' li:hover, ' + contentScope + ' blockquote:hover, ' +
        contentScope + ' a:hover, ' + contentScope + ' button:hover, ' + contentScope + ' label:hover {' +
        '  outline: 2px dashed #0284c7 !important;' +
        '  outline-offset: 3px !important;' +
        '  cursor: pointer !important;' +
        '}' +
        '.a11y-tts-active-el {' +
        '  outline: 3px solid #0284c7 !important;' +
        '  background-color: rgba(14, 165, 233, 0.14) !important;' +
        '  border-radius: 4px !important;' +
        '}'
      );
    }

    screenCss.push(
      '.a11y-structure-flash {' +
      '  outline: 4px solid ' + config.color + ' !important;' +
      '  outline-offset: 4px !important;' +
      '  box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.28) !important;' +
      '}'
    );

    // Wrap all host visual overrides in @media screen and isolate @media print cleanly
    styleEl.textContent =
      '@media screen {\n' + screenCss.join('\n') + '\n}\n' +
      '@media print {\n' +
      '  #' + HOST_ID + ', #' + SKIP_HOST_ID + ', #' + SVG_DEFS_ID + ' { display: none !important; }\n' +
      '}';

    applyFontScaling(state.fontSize);
    syncReadingAids();
    scheduleAltOverlayRender();
    if (!state.tooltips) hideTooltipBubble();
  }

  function pausePageVideos() {
    try {
      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        if (!videos[i].paused) videos[i].pause();
      }
    } catch (e) {
      // ignore
    }
  }

  function syncReadingAids() {
    if (!shadow) return;
    var guide = shadow.getElementById('a11y-reading-guide');
    var mask = shadow.getElementById('a11y-reading-mask');
    if (guide) guide.hidden = !state.readingGuide;
    if (mask) mask.hidden = !state.readingMask;
    updateReadingAidPositions();
  }

  function updateReadingAidPositions() {
    if (!shadow) return;
    var vh = global.innerHeight || 800;
    var y = Math.max(0, Math.min(vh, pointerY));

    if (state.readingGuide) {
      var guide = shadow.getElementById('a11y-reading-guide');
      if (guide) {
        guide.style.transform = 'translate3d(0, ' + Math.round(y - 2) + 'px, 0)';
      }
    }

    if (state.readingMask) {
      var topMask = shadow.getElementById('a11y-mask-top');
      var bottomMask = shadow.getElementById('a11y-mask-bottom');
      var windowHeight = 140;
      var half = windowHeight / 2;
      var topHeight = Math.max(0, y - half);
      var bottomTop = Math.min(vh, y + half);
      if (topMask) {
        topMask.style.transform = 'translate3d(0, ' + Math.round(topHeight - vh) + 'px, 0)';
      }
      if (bottomMask) {
        bottomMask.style.transform = 'translate3d(0, ' + Math.round(bottomTop) + 'px, 0)';
      }
    }
  }

  function onPointerMove(e) {
    if (!state.readingGuide && !state.readingMask) return;
    var clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
    if (typeof clientY !== 'number') return;
    pointerY = clientY;
    if (!rafGuidePending) {
      rafGuidePending = true;
      global.requestAnimationFrame(function () {
        rafGuidePending = false;
        updateReadingAidPositions();
      });
    }
  }

  // Hover & Focus Tooltips inside Shadow DOM
  function hideTooltipBubble() {
    if (!shadow) return;
    var bubble = shadow.getElementById('a11y-tooltip-bubble');
    if (bubble) bubble.hidden = true;
  }

  function showTooltipForElement(el) {
    if (!state.tooltips || !shadow || !el || isOwnNode(el)) {
      hideTooltipBubble();
      return;
    }
    var target = el.closest
      ? el.closest('[aria-label], [title], img[alt], input[placeholder], textarea[placeholder], a[href], button')
      : el;
    if (!target || isOwnNode(target)) {
      hideTooltipBubble();
      return;
    }

    var text = (
      target.getAttribute('aria-label') ||
      target.getAttribute('title') ||
      target.getAttribute('alt') ||
      target.getAttribute('placeholder') ||
      ''
    ).trim();

    if (!text && (target.tagName === 'A' || target.tagName === 'BUTTON')) {
      text = (target.innerText || target.textContent || '').replace(/\s+/g, ' ').trim();
    }

    if (!text) {
      hideTooltipBubble();
      return;
    }

    var bubble = shadow.getElementById('a11y-tooltip-bubble');
    if (!bubble) return;
    bubble.textContent = text;
    bubble.hidden = false;

    var rect = target.getBoundingClientRect();
    var vw = global.innerWidth || 1200;
    var left = Math.max(12, Math.min(vw - 320, rect.left));
    var top = rect.top - 48;
    if (top < 12) top = Math.min((global.innerHeight || 800) - 52, rect.bottom + 10);

    bubble.style.transform = 'translate3d(' + Math.round(left) + 'px, ' + Math.round(top) + 'px, 0)';
  }

  function onHostHoverOrFocus(e) {
    if (!state.tooltips) return;
    var path = e.composedPath ? e.composedPath() : [];
    if ((hostEl && path.indexOf(hostEl) !== -1) || (skipHostEl && path.indexOf(skipHostEl) !== -1)) {
      hideTooltipBubble();
      return;
    }
    showTooltipForElement(e.target);
  }

  // ALT Text Overlays for Hide Images
  function scheduleAltOverlayRender() {
    if (!shadow) return;
    if (rafAltOverlayPending) return;
    rafAltOverlayPending = true;
    global.requestAnimationFrame(function () {
      rafAltOverlayPending = false;
      renderAltOverlays();
    });
  }

  function renderAltOverlays() {
    if (!shadow) return;
    var container = shadow.getElementById('a11y-alt-overlays');
    if (!container) return;
    if (!state.hideImages) {
      container.innerHTML = '';
      return;
    }

    var imgs = document.querySelectorAll('img');
    var html = [];
    var vw = global.innerWidth || 1280;
    var vh = global.innerHeight || 800;

    // Detect sticky/fixed top header to prevent ALT boxes from floating over top nav
    var safeTop = 0;
    var topHeader = document.querySelector('header, [role="banner"]');
    if (topHeader && !isOwnNode(topHeader)) {
      var hStyle = global.getComputedStyle(topHeader);
      if (hStyle.position === 'fixed' || hStyle.position === 'sticky') {
        var hRect = topHeader.getBoundingClientRect();
        if (hRect.top <= 4 && hRect.bottom > 0 && hRect.bottom < 180) {
          safeTop = Math.ceil(hRect.bottom);
        }
      }
    }

    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (isOwnNode(img)) continue;
      var rect = img.getBoundingClientRect();
      if (rect.width < 64 || rect.height < 64) continue;
      if (rect.bottom <= safeTop || rect.top > vh || rect.right < 0 || rect.left > vw) continue;
      var clippedTop = Math.max(rect.top, safeTop);
      var clippedHeight = rect.bottom - clippedTop;
      if (clippedHeight < 28) continue;
      var alt = (img.getAttribute('alt') || '').trim();
      var label = alt ? (t('imgAltPrefix') + alt) : t('imgNoAlt');
      html.push(
        '<div class="a11y-alt-box" style="left:' + Math.round(rect.left) + 'px;top:' + Math.round(clippedTop) +
        'px;width:' + Math.round(rect.width) + 'px;height:' + Math.round(clippedHeight) + 'px;">' +
        '<span>' + escapeHtml(label) + '</span></div>'
      );
    }
    container.innerHTML = html.join('');
  }

  // Speech Synthesis
  function isTtsSupported() {
    return typeof global.speechSynthesis !== 'undefined' && typeof global.SpeechSynthesisUtterance !== 'undefined';
  }

  function clearTtsHighlight() {
    if (ttsState.activeEl) {
      ttsState.activeEl.classList.remove('a11y-tts-active-el');
      ttsState.activeEl = null;
    }
  }

  function stopSpeech() {
    clearTtsHighlight();
    ttsState.speaking = false;
    ttsState.paused = false;
    ttsState.currentText = '';
    if (isTtsSupported()) {
      try {
        global.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    updateTtsBarUi();
  }

  function detectSpeechLang(text) {
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-TW';
    return getActiveLang() === 'en' ? 'en-US' : 'zh-TW';
  }

  function speakText(text, targetEl) {
    if (!isTtsSupported() || !text) return;
    stopSpeech();

    var clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return;

    var utter = new global.SpeechSynthesisUtterance(clean);
    utter.lang = detectSpeechLang(clean);
    utter.rate = state.ttsRate || 1.0;

    if (targetEl) {
      ttsState.activeEl = targetEl;
      targetEl.classList.add('a11y-tts-active-el');
    }
    ttsState.speaking = true;
    ttsState.paused = false;
    ttsState.currentText = clean;

    utter.onend = function () {
      clearTtsHighlight();
      ttsState.speaking = false;
      ttsState.paused = false;
      updateTtsBarUi();
    };
    utter.onerror = function () {
      clearTtsHighlight();
      ttsState.speaking = false;
      ttsState.paused = false;
      updateTtsBarUi();
    };

    try {
      global.speechSynthesis.speak(utter);
    } catch (e) {
      ttsState.speaking = false;
    }
    updateTtsBarUi();
  }

  function togglePauseSpeech() {
    if (!isTtsSupported() || !ttsState.speaking) return;
    if (ttsState.paused) {
      global.speechSynthesis.resume();
      ttsState.paused = false;
    } else {
      global.speechSynthesis.pause();
      ttsState.paused = true;
    }
    updateTtsBarUi();
  }

  function handleDocumentClickForTts(e) {
    if (!state.ttsClick) return;
    var path = e.composedPath ? e.composedPath() : [];
    if ((hostEl && path.indexOf(hostEl) !== -1) || (skipHostEl && path.indexOf(skipHostEl) !== -1)) {
      return;
    }
    var target = e.target && e.target.closest
      ? e.target.closest('p, h1, h2, h3, h4, h5, h6, li, a, button, label, blockquote, td, th')
      : null;
    if (!target) return;

    var text = (target.innerText || target.getAttribute('aria-label') || target.getAttribute('alt') || '').trim();
    if (!text) return;

    if (target.tagName === 'A' || target.tagName === 'BUTTON') {
      e.preventDefault();
    }
    speakText(text, target);
  }

  // Page Structure Explorer
  function scanPageStructure() {
    var headings = [];
    var landmarks = [];
    var links = [];

    var hNodes = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (var i = 0; i < hNodes.length; i++) {
      var h = hNodes[i];
      if (isOwnNode(h)) continue;
      var hText = (h.innerText || h.textContent || '').replace(/\s+/g, ' ').trim();
      if (!hText) continue;
      headings.push({
        level: Number(h.tagName.substring(1)),
        tag: h.tagName,
        text: hText,
        el: h
      });
    }

    var landmarkSelectors = 'header, nav, main, aside, footer, form, section[aria-label], section[aria-labelledby], [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], [role="search"], [role="region"]';
    var lNodes = document.querySelectorAll(landmarkSelectors);
    var seenLandmarks = new Set();
    for (var j = 0; j < lNodes.length; j++) {
      var l = lNodes[j];
      if (isOwnNode(l) || seenLandmarks.has(l)) continue;
      seenLandmarks.add(l);
      var roleName = l.getAttribute('role') || l.tagName.toLowerCase();
      var ariaLabel = l.getAttribute('aria-label') || '';
      if (!ariaLabel && l.getAttribute('aria-labelledby')) {
        var ref = document.getElementById(l.getAttribute('aria-labelledby'));
        if (ref) ariaLabel = (ref.innerText || ref.textContent || '').trim();
      }
      landmarks.push({
        role: roleName,
        label: ariaLabel || ('<' + l.tagName.toLowerCase() + '>'),
        el: l
      });
    }

    var aNodes = document.querySelectorAll('a[href]');
    for (var k = 0; k < aNodes.length; k++) {
      var a = aNodes[k];
      if (isOwnNode(a)) continue;
      var aText = (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      if (!aText) continue;
      links.push({
        text: aText,
        href: a.getAttribute('href'),
        el: a
      });
    }

    return { headings: headings, landmarks: landmarks, links: links };
  }

  function jumpToElement(el) {
    if (!el || !el.isConnected) return;
    try {
      el.scrollIntoView({ behavior: state.stopAnimations ? 'auto' : 'smooth', block: 'center' });
      if (typeof el.focus === 'function') {
        if (!el.hasAttribute('tabindex')) {
          el.setAttribute('tabindex', '-1');
        }
        el.focus({ preventScroll: true });
      }
      el.classList.add('a11y-structure-flash');
      global.setTimeout(function () {
        el.classList.remove('a11y-structure-flash');
      }, 1500);
    } catch (e) {
      // ignore
    }
  }

  function skipToMainContent() {
    var target = document.querySelector('main, [role="main"], article, h1');
    if (target && !isOwnNode(target)) {
      jumpToElement(target);
      announce(t('skipToMain'));
    }
  }

  // Shortcut & Focus Trap
  function matchesShortcut(e, shortcutStr) {
    if (!shortcutStr) return false;
    var parts = shortcutStr.toLowerCase().split('+').map(function (p) { return p.trim(); });
    var reqAlt = parts.indexOf('alt') !== -1;
    var reqCtrl = parts.indexOf('ctrl') !== -1 || parts.indexOf('control') !== -1;
    var reqShift = parts.indexOf('shift') !== -1;
    var reqMeta = parts.indexOf('meta') !== -1 || parts.indexOf('cmd') !== -1;
    var keyPart = parts.filter(function (p) {
      return ['alt', 'ctrl', 'control', 'shift', 'meta', 'cmd'].indexOf(p) === -1;
    })[0];

    if (!keyPart) return false;
    return (
      e.altKey === reqAlt &&
      e.ctrlKey === reqCtrl &&
      e.shiftKey === reqShift &&
      e.metaKey === reqMeta &&
      e.key && e.key.toLowerCase() === keyPart
    );
  }

  function onGlobalKeyDown(e) {
    if (matchesShortcut(e, config.shortcut)) {
      e.preventDefault();
      suppressAnimationOnce = true;
      if (state.widgetHidden) {
        state.widgetHidden = false;
        saveState();
        updateTriggerAppearance();
      }
      toggle();
      return;
    }
    if (e.key === 'Escape' && isOpen) {
      suppressAnimationOnce = true;
      close();
    }
  }

  function onPanelKeyDown(e) {
    if (!isOpen || e.key !== 'Tab' || !shadow) return;
    var panel = shadow.getElementById('a11y-panel');
    if (!panel) return;
    var focusables = Array.prototype.slice.call(
      panel.querySelectorAll('button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) {
      return el.offsetParent !== null;
    });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var active = shadow.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // State Mutations
  function toggleProfile(profileId) {
    if (!PROFILES[profileId]) return;
    if (state.activeProfile === profileId) {
      reset(true);
      return;
    }
    var preservedLang = state.langOverride;
    var preservedXL = state.oversizedWidget;
    var preservedSide = state.sideOverride;
    state = cloneObj(DEFAULT_STATE);
    state.langOverride = preservedLang;
    state.oversizedWidget = preservedXL;
    state.sideOverride = preservedSide;
    state.activeProfile = profileId;

    var preset = PROFILES[profileId];
    Object.keys(preset).forEach(function (k) {
      state[k] = preset[k];
    });
    if (!state.ttsClick) stopSpeech();
    saveState();
    applyHostEffects();
    renderPanelContent();
    updateTriggerAppearance();
    announce(t('on'));
  }

  function cycleOption(key, values, labelKey, valuePrefix) {
    var idx = values.indexOf(state[key]);
    var next = values[(idx + 1) % values.length];
    state[key] = next;
    state.activeProfile = null;
    saveState();
    applyHostEffects();
    renderPanelContent();
    updateTriggerAppearance();
    if (labelKey) {
      announce(t(labelKey) + ': ' + t(valuePrefix + next));
    }
  }

  function toggleBooleanOption(key, labelKey) {
    state[key] = !state[key];
    state.activeProfile = null;
    if (key === 'ttsClick' && !state.ttsClick) {
      stopSpeech();
    }
    saveState();
    applyHostEffects();
    renderPanelContent();
    updateTriggerAppearance();
    if (labelKey) {
      announce(t(labelKey) + ': ' + (state[key] ? t('on') : t('off')));
    }
  }

  function reset(keepPanelOpen) {
    var preservedLang = state.langOverride;
    var preservedXL = state.oversizedWidget;
    var preservedSide = state.sideOverride;
    stopSpeech();
    hideTooltipBubble();
    state = cloneObj(DEFAULT_STATE);
    state.langOverride = preservedLang;
    state.oversizedWidget = preservedXL;
    state.sideOverride = preservedSide;
    saveState();
    applyHostEffects();
    renderPanelContent();
    updateTriggerAppearance();
    if (!keepPanelOpen && isOpen) {
      close();
    }
    showToast(t('resetDone'));
    announce(t('resetDone'));
  }

  function showToast(msg) {
    if (!shadow) return;
    var toast = shadow.getElementById('a11y-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toast._timer);
    toast._timer = global.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  // Skip-to-Content Bar (first Tab stop in document.body)
  function createSkipBar() {
    if (skipHostEl && document.body.contains(skipHostEl)) return;
    skipHostEl = document.getElementById(SKIP_HOST_ID);
    if (!skipHostEl) {
      skipHostEl = document.createElement('div');
      skipHostEl.id = SKIP_HOST_ID;
      document.body.insertBefore(skipHostEl, document.body.firstChild);
    }
    if (!skipHostEl.shadowRoot) {
      skipShadow = skipHostEl.attachShadow({ mode: 'open' });
    } else {
      skipShadow = skipHostEl.shadowRoot;
    }
    renderSkipBar();
  }

  function renderSkipBar() {
    if (!skipShadow) return;
    var primary = config.color;
    var onPrimary = getContrastTextColor(primary);
    skipShadow.innerHTML =
      '<style>' +
      ':host { all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: visible; z-index: 2147483647; font-family: system-ui, -apple-system, "Microsoft JhengHei", sans-serif; }' +
      '.a11y-skip-bar {' +
      '  position: fixed; top: 10px; left: 10px; z-index: 2147483647;' +
      '  display: flex; gap: 8px; padding: 6px; border-radius: 12px;' +
      '  background: #0f172a; box-shadow: 0 12px 28px rgba(0,0,0,0.35);' +
      '  transform: translateY(-160%); opacity: 0; pointer-events: none;' +
      '  transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms ease;' +
      '}' +
      '.a11y-skip-bar:focus-within { transform: translateY(0); opacity: 1; pointer-events: auto; }' +
      '.a11y-skip-btn {' +
      '  padding: 9px 14px; border-radius: 8px; border: 2px solid #ffffff;' +
      '  background: ' + primary + '; color: ' + onPrimary + ';' +
      '  font-size: 13px; font-weight: 800; cursor: pointer;' +
      '}' +
      '.a11y-skip-btn.is-secondary { background: #1e293b; color: #ffffff; }' +
      '.a11y-skip-btn:focus-visible { outline: 3px solid #facc15; outline-offset: 2px; }' +
      '</style>' +
      '<div class="a11y-skip-bar" role="region" aria-label="' + escapeHtml(t('skipToMain')) + '">' +
      '  <button type="button" id="a11y-skip-main-btn" class="a11y-skip-btn">' + escapeHtml(t('skipToMain')) + '</button>' +
      '  <button type="button" id="a11y-skip-menu-btn" class="a11y-skip-btn is-secondary">' + escapeHtml(t('skipToMenu')) + ' (' + escapeHtml(config.shortcut) + ')</button>' +
      '</div>';

    skipShadow.getElementById('a11y-skip-main-btn').addEventListener('click', function () {
      skipToMainContent();
    });
    skipShadow.getElementById('a11y-skip-menu-btn').addEventListener('click', function () {
      suppressAnimationOnce = true;
      if (state.widgetHidden) {
        state.widgetHidden = false;
        saveState();
        updateTriggerAppearance();
      }
      open();
    });
  }

  // Shadow DOM CSS & Shell Construction
  function buildShadowStyles() {
    var primary = config.color;
    var textOnPrimary = getContrastTextColor(primary);
    var rgb = hexToRgb(primary);
    var softTint = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.11)';
    var softBorder = 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', 0.32)';

    var sizeMap = {
      sm: { btn: '46px', icon: '20px', font: '13px', pad: '0 14px' },
      md: { btn: '54px', icon: '24px', font: '14px', pad: '0 18px' },
      lg: { btn: '64px', icon: '28px', font: '15px', pad: '0 22px' }
    };
    var effectiveSize = state.oversizedWidget ? 'lg' : config.size;
    var sz = sizeMap[effectiveSize] || sizeMap.md;

    var pos = getEffectivePosition();
    var ox = config.offsetX + 'px';
    var oy = config.offsetY + 'px';

    var triggerPosCss = '';
    var panelPosCss = '';
    var panelOrigin = 'bottom right';

    var btnPx = parseInt(sz.btn, 10) || 54;
    var maxH = 'min(680px, calc(100vh - ' + (config.offsetY + btnPx + 32) + 'px))';

    if (pos === 'bottom-right') {
      triggerPosCss = 'right:' + ox + ';bottom:' + oy + ';';
      panelPosCss = 'right:' + ox + ';bottom:calc(' + oy + ' + ' + sz.btn + ' + 14px);max-height:' + maxH + ';';
      panelOrigin = 'bottom right';
    } else if (pos === 'bottom-left') {
      triggerPosCss = 'left:' + ox + ';bottom:' + oy + ';';
      panelPosCss = 'left:' + ox + ';bottom:calc(' + oy + ' + ' + sz.btn + ' + 14px);max-height:' + maxH + ';';
      panelOrigin = 'bottom left';
    } else if (pos === 'top-right') {
      triggerPosCss = 'right:' + ox + ';top:' + oy + ';';
      panelPosCss = 'right:' + ox + ';top:calc(' + oy + ' + ' + sz.btn + ' + 14px);max-height:' + maxH + ';';
      panelOrigin = 'top right';
    } else if (pos === 'top-left') {
      triggerPosCss = 'left:' + ox + ';top:' + oy + ';';
      panelPosCss = 'left:' + ox + ';top:calc(' + oy + ' + ' + sz.btn + ' + 14px);max-height:' + maxH + ';';
      panelOrigin = 'top left';
    } else if (pos === 'middle-right') {
      triggerPosCss = 'right:' + ox + ';top:50%;transform:translateY(-50%);';
      panelPosCss = 'right:calc(' + ox + ' + ' + sz.btn + ' + 14px);top:50%;transform:translateY(-50%);max-height:calc(100vh - 48px);';
      panelOrigin = 'right center';
    } else if (pos === 'middle-left') {
      triggerPosCss = 'left:' + ox + ';top:50%;transform:translateY(-50%);';
      panelPosCss = 'left:calc(' + ox + ' + ' + sz.btn + ' + 14px);top:50%;transform:translateY(-50%);max-height:calc(100vh - 48px);';
      panelOrigin = 'left center';
    }

    var isMiddle = pos.indexOf('middle-') === 0;
    var triggerActiveTransform = isMiddle ? 'translateY(-50%) scale(0.95)' : 'scale(0.95)';
    var triggerHoverTransform = isMiddle ? 'translateY(-50%) scale(1.05)' : 'scale(1.05)';

    return [
      ':host {',
      '  all: initial;',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  width: 0;',
      '  height: 0;',
      '  overflow: visible;',
      '  z-index: 2147483647;',
      '  cursor: auto;',
      '  font-family: system-ui, -apple-system, "Segoe UI", "Microsoft JhengHei", "PingFang TC", sans-serif;',
      '  color: #0f172a;',
      '  --a11y-primary: ' + primary + ';',
      '  --a11y-on-primary: ' + textOnPrimary + ';',
      '  --a11y-soft: ' + softTint + ';',
      '  --a11y-soft-border: ' + softBorder + ';',
      '  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);',
      '  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);',
      '}',
      '*, *::before, *::after { box-sizing: border-box; }',
      'button { font-family: inherit; }',
      '.a11y-sr-only {',
      '  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;',
      '  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;',
      '}',

      /* Fullscreen Backdrop Visual Filter Layer */
      '#a11y-backdrop-filter {',
      '  position: fixed; inset: 0; pointer-events: none; z-index: 2147483635;',
      '}',
      '#a11y-backdrop-filter[hidden] { display: none; }',

      /* Reading Guide, Mask, Alt Overlays & Tooltip Bubble */
      '#a11y-reading-guide {',
      '  position: fixed; left: 0; top: 0; width: 100vw; height: 5px;',
      '  background: linear-gradient(90deg, #facc15, var(--a11y-primary), #facc15);',
      '  border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a;',
      '  box-shadow: 0 2px 10px rgba(0,0,0,0.35);',
      '  pointer-events: none; z-index: 2147483640;',
      '  will-change: transform;',
      '}',
      '#a11y-reading-mask { position: fixed; inset: 0; pointer-events: none; z-index: 2147483639; }',
      '.a11y-mask-shade {',
      '  position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;',
      '  background: rgba(15, 23, 42, 0.72);',
      '  will-change: transform;',
      '}',
      '#a11y-mask-top { border-bottom: 2px solid var(--a11y-primary); }',
      '#a11y-mask-bottom { border-top: 2px solid var(--a11y-primary); }',
      '#a11y-alt-overlays { position: fixed; inset: 0; pointer-events: none; z-index: 2147483638; }',
      '.a11y-alt-box {',
      '  position: fixed; border: 2px dashed #475569; background: rgba(241, 245, 249, 0.94);',
      '  color: #0f172a; font-size: 12px; line-height: 1.4; padding: 8px; border-radius: 6px;',
      '  display: flex; align-items: center; justify-content: center; text-align: center;',
      '  overflow: hidden;',
      '}',
      '#a11y-tooltip-bubble {',
      '  position: fixed; top: 0; left: 0; max-width: 310px; padding: 8px 12px;',
      '  background: #0f172a; color: #ffffff; border: 2px solid #facc15;',
      '  border-radius: 10px; font-size: 13.5px; font-weight: 700; line-height: 1.4;',
      '  box-shadow: 0 12px 28px rgba(0,0,0,0.32); pointer-events: none;',
      '  z-index: 2147483645;',
      '}',
      '#a11y-tooltip-bubble[hidden] { display: none; }',

      /* Floating Trigger Button */
      '#a11y-trigger {',
      '  position: fixed; ' + triggerPosCss,
      '  z-index: 2147483646;',
      '  height: ' + sz.btn + ';',
      (config.shape === 'pill'
        ? '  padding: ' + sz.pad + '; border-radius: 9999px; gap: 8px;'
        : '  width: ' + sz.btn + '; padding: 0; border-radius: 50%;'),
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  background: var(--a11y-primary); color: var(--a11y-on-primary);',
      '  border: 2px solid rgba(255,255,255,0.92);',
      '  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.24), 0 2px 6px rgba(15, 23, 42, 0.16);',
      '  cursor: pointer; user-select: none;',
      '  transition: transform 160ms var(--ease-out), box-shadow 180ms var(--ease-out);',
      '}',
      '#a11y-trigger[hidden] { display: none; }',
      '#a11y-trigger svg { width: ' + sz.icon + '; height: ' + sz.icon + '; flex-shrink: 0; }',
      '#a11y-trigger .a11y-pill-label { font-size: ' + sz.font + '; font-weight: 700; white-space: nowrap; }',
      '#a11y-trigger:focus-visible { outline: 3px solid #f97316; outline-offset: 3px; }',
      '#a11y-trigger:active { transform: ' + triggerActiveTransform + '; }',
      '@media (hover: hover) and (pointer: fine) {',
      '  #a11y-trigger:hover { transform: ' + triggerHoverTransform + '; box-shadow: 0 12px 28px rgba(15, 23, 42, 0.28); }',
      '}',
      '#a11y-badge {',
      '  position: absolute; top: -5px; right: -5px; min-width: 21px; height: 21px;',
      '  padding: 0 5px; border-radius: 9999px;',
      '  background: #ef4444; color: #ffffff; font-size: 11px; font-weight: 700;',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);',
      '}',
      '#a11y-badge[hidden] { display: none; }',

      /* Widget Panel */
      '#a11y-panel {',
      '  position: fixed; ' + panelPosCss,
      '  z-index: 2147483647;',
      '  width: 396px; max-width: calc(100vw - 24px);',
      '  display: flex; flex-direction: column;',
      '  background: #ffffff; color: #0f172a;',
      '  border: 1px solid #cbd5e1; border-radius: 18px;',
      '  box-shadow: 0 24px 56px rgba(15, 23, 42, 0.24), 0 4px 16px rgba(15, 23, 42, 0.1);',
      '  overflow: hidden;',
      '  transform-origin: ' + panelOrigin + ';',
      '  opacity: 0; pointer-events: none; visibility: hidden;',
      (isMiddle
        ? '  transform: translateY(-50%) scale(0.95);'
        : '  transform: scale(0.95) translateY(6px);'),
      '  transition: opacity 200ms var(--ease-out), transform 220ms var(--ease-drawer), visibility 0s linear 220ms, width 200ms var(--ease-out);',
      '}',
      '#a11y-panel.is-xl { width: 484px; }',
      '#a11y-panel.is-open {',
      '  opacity: 1; pointer-events: auto; visibility: visible;',
      (isMiddle ? '  transform: translateY(-50%) scale(1);' : '  transform: scale(1) translateY(0);'),
      '  transition: opacity 200ms var(--ease-out), transform 220ms var(--ease-drawer), visibility 0s, width 200ms var(--ease-out);',
      '}',
      '#a11y-panel[data-no-anim="true"] { transition: none !important; }',
      '@media (prefers-reduced-motion: reduce) {',
      '  #a11y-panel, #a11y-trigger, .a11y-card, .a11y-profile-btn { transition: none !important; }',
      '}',

      /* Header */
      '.a11y-header {',
      '  background: var(--a11y-primary); color: var(--a11y-on-primary);',
      '  padding: 14px 16px 12px; flex-shrink: 0;',
      '}',
      '.a11y-header-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }',
      '.a11y-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }',
      '.a11y-brand-icon {',
      '  width: 34px; height: 34px; border-radius: 10px;',
      '  background: rgba(255,255,255,0.18); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;',
      '}',
      '.a11y-brand-icon svg { width: 20px; height: 20px; }',
      '.a11y-brand-title { font-size: 15px; font-weight: 700; line-height: 1.2; margin: 0; }',
      '.a11y-brand-sub { font-size: 11px; opacity: 0.85; margin: 2px 0 0; }',
      '.a11y-header-actions { display: flex; align-items: center; gap: 5px; }',
      '.a11y-icon-btn {',
      '  height: 30px; min-width: 30px; padding: 0 8px; border-radius: 8px;',
      '  border: 1px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.14);',
      '  color: var(--a11y-on-primary); font-size: 11.5px; font-weight: 700;',
      '  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;',
      '  transition: transform 140ms var(--ease-out), background 140ms ease;',
      '}',
      '.a11y-icon-btn.is-active { background: #ffffff; color: #0f172a; border-color: #ffffff; }',
      '.a11y-icon-btn:active { transform: scale(0.94); }',
      '.a11y-icon-btn:focus-visible { outline: 2px solid #ffffff; outline-offset: 2px; }',
      '.a11y-icon-btn svg { width: 16px; height: 16px; }',

      /* Top Segmented Tabs */
      '.a11y-tabs {',
      '  display: flex; gap: 6px; margin-top: 12px; padding: 3px;',
      '  background: rgba(15, 23, 42, 0.22); border-radius: 10px;',
      '}',
      '.a11y-tab-btn {',
      '  flex: 1; padding: 7px 10px; border: none; border-radius: 8px;',
      '  background: transparent; color: var(--a11y-on-primary); opacity: 0.85;',
      '  font-size: 12.5px; font-weight: 600; cursor: pointer;',
      '  transition: background 150ms ease, opacity 150ms ease, transform 140ms var(--ease-out);',
      '}',
      '.a11y-tab-btn.is-active { background: #ffffff; color: #0f172a; opacity: 1; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }',
      '.a11y-tab-btn:active { transform: scale(0.97); }',

      /* Body & Sections */
      '.a11y-body { flex: 1; overflow-y: auto; padding: 14px 14px 16px; background: #f8fafc; }',
      '.a11y-body::-webkit-scrollbar { width: 6px; }',
      '.a11y-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }',
      '.a11y-section { margin-bottom: 16px; }',
      '.a11y-section:last-child { margin-bottom: 0; }',
      '.a11y-sec-title {',
      '  font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;',
      '  color: #475569; margin: 0 0 8px 2px;',
      '}',

      /* Profiles List */
      '.a11y-profiles { display: grid; grid-template-columns: 1fr; gap: 7px; }',
      '.a11y-profile-btn {',
      '  display: flex; align-items: center; gap: 11px; width: 100%; text-align: left;',
      '  padding: 9px 12px; border-radius: 12px;',
      '  background: #ffffff; border: 1.5px solid #e2e8f0; color: #0f172a;',
      '  cursor: pointer; transition: transform 140ms var(--ease-out), border-color 150ms ease, background 150ms ease;',
      '}',
      '.a11y-profile-btn:active { transform: scale(0.98); }',
      '.a11y-profile-btn:focus-visible { outline: 2px solid var(--a11y-primary); outline-offset: 2px; }',
      '@media (hover: hover) and (pointer: fine) {',
      '  .a11y-profile-btn:hover { border-color: var(--a11y-soft-border); background: #ffffff; }',
      '}',
      '.a11y-profile-btn.is-active { background: var(--a11y-soft); border-color: var(--a11y-primary); }',
      '.a11y-profile-ico {',
      '  width: 34px; height: 34px; border-radius: 10px; background: #f1f5f9; color: #334155;',
      '  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;',
      '}',
      '.a11y-profile-btn.is-active .a11y-profile-ico { background: var(--a11y-primary); color: var(--a11y-on-primary); }',
      '.a11y-profile-ico svg { width: 18px; height: 18px; }',
      '.a11y-profile-text { flex: 1; min-width: 0; }',
      '.a11y-profile-name { font-size: 13px; font-weight: 700; line-height: 1.25; }',
      '.a11y-profile-desc { font-size: 11.5px; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.a11y-pill-state {',
      '  font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px;',
      '  background: #e2e8f0; color: #475569; flex-shrink: 0;',
      '}',
      '.a11y-profile-btn.is-active .a11y-pill-state { background: var(--a11y-primary); color: var(--a11y-on-primary); }',

      /* Feature Cards Grid & XL Scaling */
      '.a11y-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }',
      '#a11y-panel.is-xl .a11y-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }',
      '.a11y-card {',
      '  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: space-between;',
      '  min-height: 92px; padding: 11px 6px 9px; border-radius: 12px;',
      '  background: #ffffff; border: 1.5px solid #e2e8f0; color: #0f172a;',
      '  text-align: center; cursor: pointer;',
      '  transition: transform 150ms var(--ease-out), border-color 150ms ease, background 150ms ease;',
      '}',
      '#a11y-panel.is-xl .a11y-card { min-height: 112px; padding: 14px 10px; }',
      '#a11y-panel.is-xl .a11y-card-title { font-size: 14px; }',
      '#a11y-panel.is-xl .a11y-card-sub { font-size: 12px; }',
      '#a11y-panel.is-xl .a11y-profile-name { font-size: 14.5px; }',
      '#a11y-panel.is-xl .a11y-profile-desc { font-size: 12.5px; }',
      '.a11y-card:active { transform: scale(0.96); }',
      '.a11y-card:focus-visible { outline: 2px solid var(--a11y-primary); outline-offset: 2px; }',
      '@media (hover: hover) and (pointer: fine) {',
      '  .a11y-card:hover { border-color: var(--a11y-soft-border); }',
      '}',
      '.a11y-card.is-active { background: var(--a11y-soft); border-color: var(--a11y-primary); }',
      '.a11y-card-ico {',
      '  width: 30px; height: 30px; border-radius: 9px; background: #f1f5f9; color: #1e293b;',
      '  display: inline-flex; align-items: center; justify-content: center; margin-bottom: 6px;',
      '}',
      '.a11y-card.is-active .a11y-card-ico { background: var(--a11y-primary); color: var(--a11y-on-primary); }',
      '.a11y-card-ico svg { width: 17px; height: 17px; }',
      '.a11y-card-title { font-size: 12px; font-weight: 700; line-height: 1.25; }',
      '.a11y-card-sub { font-size: 10.5px; font-weight: 600; color: #64748b; margin-top: 2px; min-height: 14px; }',
      '.a11y-card.is-active .a11y-card-sub { color: var(--a11y-primary); }',
      '.a11y-pips { display: flex; gap: 4px; margin-top: 5px; height: 5px; align-items: center; }',
      '.a11y-pip { width: 12px; height: 4px; border-radius: 999px; background: #cbd5e1; }',
      '.a11y-pip.is-filled { background: var(--a11y-primary); }',

      /* TTS Control Bar */
      '.a11y-tts-bar {',
      '  margin-top: 9px; padding: 10px 12px; border-radius: 12px;',
      '  background: #ffffff; border: 1.5px solid var(--a11y-primary);',
      '}',
      '.a11y-tts-head { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 4px; }',
      '.a11y-tts-hint { font-size: 11.5px; color: #475569; margin: 0 0 8px; }',
      '.a11y-tts-controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }',
      '.a11y-tts-btn {',
      '  display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px;',
      '  border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc;',
      '  color: #0f172a; font-size: 11.5px; font-weight: 600; cursor: pointer;',
      '}',
      '.a11y-tts-btn:active { transform: scale(0.96); }',
      '.a11y-tts-btn.is-primary { background: var(--a11y-primary); color: var(--a11y-on-primary); border-color: var(--a11y-primary); }',
      '.a11y-tts-btn svg { width: 12px; height: 12px; }',
      '.a11y-tts-warn { font-size: 11.5px; color: #b91c1c; background: #fef2f2; padding: 6px 8px; border-radius: 8px; margin-top: 6px; }',

      /* Structure Explorer & Statement */
      '.a11y-struct-subtabs { display: flex; gap: 6px; margin-bottom: 10px; }',
      '.a11y-struct-tab {',
      '  flex: 1; padding: 6px 8px; border-radius: 8px; border: 1px solid #cbd5e1;',
      '  background: #ffffff; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer;',
      '}',
      '.a11y-struct-tab.is-active { background: var(--a11y-primary); color: var(--a11y-on-primary); border-color: var(--a11y-primary); }',
      '.a11y-struct-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748b; margin-bottom: 8px; }',
      '.a11y-refresh-btn { border: none; background: transparent; color: var(--a11y-primary); font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 2px 4px; }',
      '.a11y-struct-list { display: flex; flex-direction: column; gap: 6px; }',
      '.a11y-struct-item {',
      '  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;',
      '  padding: 8px 10px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;',
      '  color: #0f172a; font-size: 12.5px; cursor: pointer;',
      '  transition: transform 140ms var(--ease-out), border-color 140ms ease;',
      '}',
      '.a11y-struct-item:active { transform: scale(0.98); }',
      '@media (hover: hover) and (pointer: fine) {',
      '  .a11y-struct-item:hover { border-color: var(--a11y-primary); background: var(--a11y-soft); }',
      '}',
      '.a11y-level-badge {',
      '  font-size: 10.5px; font-weight: 800; padding: 2px 6px; border-radius: 6px;',
      '  background: var(--a11y-soft); color: var(--a11y-primary); flex-shrink: 0; text-transform: uppercase;',
      '}',
      '.a11y-struct-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }',
      '.a11y-empty { text-align: center; padding: 28px 12px; color: #64748b; font-size: 12.5px; }',

      /* Statement View */
      '.a11y-statement-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }',
      '.a11y-statement-card h3 { margin: 0 0 8px; font-size: 14.5px; }',
      '.a11y-statement-card h4 { margin: 14px 0 6px; font-size: 12.5px; color: #475569; }',
      '.a11y-statement-card p { margin: 0 0 8px; font-size: 12.5px; line-height: 1.55; color: #334155; }',
      '.a11y-stat-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }',
      '.a11y-stat-list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; padding: 6px 9px; background: #f8fafc; border-radius: 8px; }',
      '.a11y-stat-num { font-weight: 800; color: var(--a11y-primary); }',
      '.a11y-back-btn { margin-top: 12px; width: 100%; padding: 8px 12px; border-radius: 9px; border: none; background: var(--a11y-primary); color: var(--a11y-on-primary); font-size: 12.5px; font-weight: 700; cursor: pointer; }',

      /* Move/Hide Drawer & Footer */
      '.a11y-move-drawer {',
      '  display: flex; gap: 6px; padding: 8px 14px; background: #f1f5f9;',
      '  border-top: 1px solid #e2e8f0; flex-shrink: 0;',
      '}',
      '.a11y-move-drawer[hidden] { display: none; }',
      '.a11y-move-opt {',
      '  flex: 1; padding: 6px 8px; border-radius: 8px; border: 1px solid #cbd5e1;',
      '  background: #ffffff; color: #0f172a; font-size: 11.5px; font-weight: 700; cursor: pointer;',
      '}',
      '.a11y-move-opt:hover { border-color: var(--a11y-primary); }',
      '.a11y-move-opt.is-danger { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }',

      '.a11y-footer {',
      '  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px;',
      '  padding: 10px 12px; background: #ffffff; border-top: 1px solid #e2e8f0; flex-shrink: 0;',
      '}',
      '.a11y-footer-btn {',
      '  display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 7px 6px;',
      '  border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc;',
      '  color: #0f172a; font-size: 11.5px; font-weight: 700; cursor: pointer;',
      '  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      '  transition: transform 140ms var(--ease-out), background 140ms ease;',
      '}',
      '.a11y-footer-btn:active { transform: scale(0.96); }',
      '.a11y-footer-btn:hover { background: #f1f5f9; }',
      '.a11y-footer-btn.is-active { border-color: var(--a11y-primary); background: var(--a11y-soft); color: var(--a11y-primary); }',
      '.a11y-footer-btn svg { width: 13px; height: 13px; flex-shrink: 0; }',

      /* Toast */
      '#a11y-toast {',
      '  position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%) translateY(8px);',
      '  background: #0f172a; color: #ffffff; font-size: 12px; font-weight: 600;',
      '  padding: 6px 12px; border-radius: 999px; opacity: 0; pointer-events: none;',
      '  transition: opacity 180ms ease, transform 180ms var(--ease-out); white-space: nowrap;',
      '}',
      '#a11y-toast.is-visible { opacity: 1; transform: translateX(-50%) translateY(0); }',

      '@media (max-width: 480px) {',
      '  #a11y-panel, #a11y-panel.is-xl { width: calc(100vw - 16px); left: 8px !important; right: 8px !important; }',
      '  .a11y-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }',
      '}'
    ].join('\n');
  }

  function createShadowShell() {
    if (hostEl && document.body.contains(hostEl)) return;
    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    document.body.appendChild(hostEl);
    shadow = hostEl.attachShadow({ mode: 'open' });

    shadow.innerHTML =
      '<style id="a11y-shadow-style"></style>' +
      '<div id="a11y-sr-announcer" class="a11y-sr-only" aria-live="polite" aria-atomic="true"></div>' +
      '<div id="a11y-backdrop-filter" hidden aria-hidden="true"></div>' +
      '<div id="a11y-alt-overlays" aria-hidden="true"></div>' +
      '<div id="a11y-reading-mask" hidden aria-hidden="true">' +
      '  <div id="a11y-mask-top" class="a11y-mask-shade"></div>' +
      '  <div id="a11y-mask-bottom" class="a11y-mask-shade"></div>' +
      '</div>' +
      '<div id="a11y-reading-guide" hidden aria-hidden="true"></div>' +
      '<div id="a11y-tooltip-bubble" role="tooltip" hidden></div>' +
      '<button id="a11y-trigger" type="button" aria-haspopup="dialog" aria-expanded="false">' +
      '  <span id="a11y-trigger-icon"></span>' +
      '  <span id="a11y-trigger-label" class="a11y-pill-label" hidden></span>' +
      '  <span id="a11y-badge" hidden>0</span>' +
      '</button>' +
      '<section id="a11y-panel" role="dialog" aria-modal="false" aria-hidden="true" inert>' +
      '  <header class="a11y-header">' +
      '    <div class="a11y-header-top">' +
      '      <div class="a11y-brand">' +
      '        <span class="a11y-brand-icon">' + ICONS.universal + '</span>' +
      '        <div>' +
      '          <h2 id="a11y-brand-title" class="a11y-brand-title"></h2>' +
      '          <p id="a11y-brand-sub" class="a11y-brand-sub"></p>' +
      '        </div>' +
      '      </div>' +
      '      <div class="a11y-header-actions">' +
      '        <button id="a11y-xl-btn" class="a11y-icon-btn" type="button" aria-pressed="false">XL</button>' +
      '        <button id="a11y-lang-btn" class="a11y-icon-btn" type="button"></button>' +
      '        <button id="a11y-close-btn" class="a11y-icon-btn" type="button">' + ICONS.close + '</button>' +
      '      </div>' +
      '    </div>' +
      '    <div id="a11y-main-tabs" class="a11y-tabs" role="tablist"></div>' +
      '  </header>' +
      '  <div id="a11y-body" class="a11y-body"></div>' +
      '  <div id="a11y-move-drawer" class="a11y-move-drawer" hidden>' +
      '    <button type="button" class="a11y-move-opt" data-move-cmd="left" id="a11y-move-left-btn"></button>' +
      '    <button type="button" class="a11y-move-opt" data-move-cmd="right" id="a11y-move-right-btn"></button>' +
      '    <button type="button" class="a11y-move-opt is-danger" data-move-cmd="hide" id="a11y-hide-widget-btn"></button>' +
      '  </div>' +
      '  <footer class="a11y-footer">' +
      '    <button id="a11y-reset-btn" class="a11y-footer-btn" type="button">' +
             ICONS.reset + '<span id="a11y-reset-label"></span>' +
      '    </button>' +
      '    <button id="a11y-move-hide-btn" class="a11y-footer-btn" type="button" aria-expanded="false"></button>' +
      '    <button id="a11y-statement-btn" class="a11y-footer-btn" type="button" aria-pressed="false"></button>' +
      '  </footer>' +
      '  <div id="a11y-toast" role="status" aria-live="polite"></div>' +
      '</section>';

    bindShadowEvents();
    applyShadowTheme();
    updateTriggerAppearance();
    renderPanelContent();
  }

  function applyShadowTheme() {
    if (!shadow) return;
    var styleNode = shadow.getElementById('a11y-shadow-style');
    if (styleNode) {
      styleNode.textContent = buildShadowStyles();
    }
  }

  function updateTriggerAppearance() {
    if (!shadow) return;
    var trigger = shadow.getElementById('a11y-trigger');
    var iconEl = shadow.getElementById('a11y-trigger-icon');
    var labelEl = shadow.getElementById('a11y-trigger-label');
    var badgeEl = shadow.getElementById('a11y-badge');
    if (!trigger) return;

    trigger.hidden = !!state.widgetHidden;
    trigger.setAttribute('aria-label', t('triggerLabel') + ' (' + config.shortcut + ')');
    trigger.setAttribute('title', t('triggerLabel') + ' (' + config.shortcut + ')');
    iconEl.innerHTML = ICONS[config.icon] || ICONS.universal;

    if (config.shape === 'pill') {
      labelEl.hidden = false;
      labelEl.textContent = t('triggerPillText');
    } else {
      labelEl.hidden = true;
    }

    var activeCount = countActiveAdjustments();
    if (activeCount > 0) {
      badgeEl.hidden = false;
      badgeEl.textContent = String(activeCount);
    } else {
      badgeEl.hidden = true;
    }
  }

  function renderMainTabs() {
    if (!shadow) return;
    var tabsContainer = shadow.getElementById('a11y-main-tabs');
    if (!tabsContainer) return;

    var hasStructure = config.modules.indexOf('structure') !== -1;
    if (!hasStructure || showStatement) {
      if (!hasStructure) activeMainTab = 'adjust';
      tabsContainer.style.display = 'none';
      return;
    }

    tabsContainer.style.display = 'flex';
    tabsContainer.innerHTML =
      '<button class="a11y-tab-btn ' + (activeMainTab === 'adjust' ? 'is-active' : '') + '" data-main-tab="adjust" role="tab" aria-selected="' + (activeMainTab === 'adjust') + '">' + escapeHtml(t('tabAdjust')) + '</button>' +
      '<button class="a11y-tab-btn ' + (activeMainTab === 'structure' ? 'is-active' : '') + '" data-main-tab="structure" role="tab" aria-selected="' + (activeMainTab === 'structure') + '">' + escapeHtml(t('tabStructure')) + '</button>';
  }

  function renderPips(total, currentIdx) {
    var html = '<div class="a11y-pips" aria-hidden="true">';
    for (var i = 1; i <= total; i++) {
      html += '<span class="a11y-pip ' + (currentIdx >= i ? 'is-filled' : '') + '"></span>';
    }
    html += '</div>';
    return html;
  }

  function renderStepCard(id, iconHtml, title, subText, active, stepCount, stepIdx) {
    return (
      '<button class="a11y-card ' + (active ? 'is-active' : '') + '" type="button" data-action="' + id + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
      '  <span class="a11y-card-ico">' + iconHtml + '</span>' +
      '  <span class="a11y-card-title">' + escapeHtml(title) + '</span>' +
      '  <span class="a11y-card-sub">' + escapeHtml(subText) + '</span>' +
      (stepCount > 0 ? renderPips(stepCount, stepIdx) : '<div class="a11y-pips"></div>') +
      '</button>'
    );
  }

  function renderStatementView() {
    return (
      '<div class="a11y-statement-card">' +
      '  <h3>' + escapeHtml(t('statementTitle')) + '</h3>' +
      '  <p>' + escapeHtml(t('statementBody')) + '</p>' +
      '  <h4>' + escapeHtml(t('statementShortcuts')) + '</h4>' +
      '  <ul class="a11y-stat-list">' +
      '    <li><span><code>' + escapeHtml(config.shortcut) + '</code></span><span>' + escapeHtml(t('statementShortcutToggle')) + '</span></li>' +
      '    <li><span><code>Tab</code></span><span>' + escapeHtml(t('statementShortcutTab')) + '</span></li>' +
      '    <li><span><code>Esc</code></span><span>' + escapeHtml(t('statementShortcutEsc')) + '</span></li>' +
      '  </ul>' +
      '  <h4>' + escapeHtml(t('statementRemediation')) + '</h4>' +
      '  <ul class="a11y-stat-list">' +
      '    <li><span>' + escapeHtml(t('statImgAlt')) + '</span><span class="a11y-stat-num">' + remediationStats.imgAltFixed + '</span></li>' +
      '    <li><span>' + escapeHtml(t('statInputLabel')) + '</span><span class="a11y-stat-num">' + remediationStats.inputLabelFixed + '</span></li>' +
      '    <li><span>' + escapeHtml(t('statBlankLinks')) + '</span><span class="a11y-stat-num">' + remediationStats.blankLinksSecured + '</span></li>' +
      '  </ul>' +
      '  <button type="button" class="a11y-back-btn" data-close-statement="1">' + escapeHtml(t('statementClose')) + '</button>' +
      '</div>'
    );
  }

  function renderPanelContent() {
    if (!shadow) return;

    var brandTitle = shadow.getElementById('a11y-brand-title');
    var brandSub = shadow.getElementById('a11y-brand-sub');
    var xlBtn = shadow.getElementById('a11y-xl-btn');
    var langBtn = shadow.getElementById('a11y-lang-btn');
    var closeBtn = shadow.getElementById('a11y-close-btn');
    var resetLabel = shadow.getElementById('a11y-reset-label');
    var moveHideBtn = shadow.getElementById('a11y-move-hide-btn');
    var statementBtn = shadow.getElementById('a11y-statement-btn');
    var moveDrawer = shadow.getElementById('a11y-move-drawer');
    var moveLeftBtn = shadow.getElementById('a11y-move-left-btn');
    var moveRightBtn = shadow.getElementById('a11y-move-right-btn');
    var hideWidgetBtn = shadow.getElementById('a11y-hide-widget-btn');
    var panel = shadow.getElementById('a11y-panel');
    var bodyEl = shadow.getElementById('a11y-body');

    var activeCount = countActiveAdjustments();
    if (brandTitle) brandTitle.textContent = t('brandTitle');
    if (brandSub) {
      brandSub.textContent = (activeCount > 0 ? activeCount + ' ' + t('footerActiveCount') : t('brandSubtitle')) + ' · ' + config.shortcut;
    }
    if (xlBtn) {
      xlBtn.setAttribute('aria-label', t('xlLabel'));
      xlBtn.setAttribute('title', t('xlLabel'));
      xlBtn.setAttribute('aria-pressed', state.oversizedWidget ? 'true' : 'false');
      xlBtn.classList.toggle('is-active', !!state.oversizedWidget);
    }
    if (panel) panel.classList.toggle('is-xl', !!state.oversizedWidget);
    if (langBtn) langBtn.textContent = t('langSwitch');
    if (closeBtn) closeBtn.setAttribute('aria-label', t('closeLabel'));
    if (resetLabel) resetLabel.textContent = t('resetAll');
    if (moveHideBtn) {
      moveHideBtn.textContent = t('moveHideBtn');
      moveHideBtn.setAttribute('aria-expanded', showMoveDrawer ? 'true' : 'false');
      moveHideBtn.classList.toggle('is-active', showMoveDrawer);
    }
    if (statementBtn) {
      statementBtn.textContent = t('statementBtn');
      statementBtn.setAttribute('aria-pressed', showStatement ? 'true' : 'false');
      statementBtn.classList.toggle('is-active', showStatement);
    }
    if (moveDrawer) moveDrawer.hidden = !showMoveDrawer;
    if (moveLeftBtn) moveLeftBtn.textContent = t('moveLeft');
    if (moveRightBtn) moveRightBtn.textContent = t('moveRight');
    if (hideWidgetBtn) hideWidgetBtn.textContent = t('hideWidget');
    if (panel) panel.setAttribute('aria-label', t('brandTitle'));

    renderMainTabs();

    if (!bodyEl) return;

    if (showStatement) {
      runAutoRemediation();
      bodyEl.innerHTML = renderStatementView();
      return;
    }

    if (activeMainTab === 'structure' && config.modules.indexOf('structure') !== -1) {
      bodyEl.innerHTML = renderStructureTab();
      return;
    }

    var sections = [];
    var mods = config.modules;

    // Section A: 8 Profiles
    if (mods.indexOf('profiles') !== -1) {
      var profileItems = [
        { id: 'visually-impaired', icon: ICONS.profileVision, name: t('profVisuallyImpaired'), desc: t('profVisuallyImpairedDesc') },
        { id: 'colorblind-friendly', icon: ICONS.colorblind, name: t('profColorblind'), desc: t('profColorblindDesc') },
        { id: 'dyslexia-friendly', icon: ICONS.profileDyslexia, name: t('profDyslexia'), desc: t('profDyslexiaDesc') },
        { id: 'adhd-focus', icon: ICONS.profileAdhd, name: t('profAdhd'), desc: t('profAdhdDesc') },
        { id: 'senior-friendly', icon: ICONS.profileSenior, name: t('profSenior'), desc: t('profSeniorDesc') },
        { id: 'motor-impaired', icon: ICONS.profileMotor, name: t('profMotor'), desc: t('profMotorDesc') },
        { id: 'cognitive-learning', icon: ICONS.profileCognitive, name: t('profCognitive'), desc: t('profCognitiveDesc') },
        { id: 'seizure-safe', icon: ICONS.profileSeizure, name: t('profSeizure'), desc: t('profSeizureDesc') }
      ];
      var profHtml = '<div class="a11y-section"><h3 class="a11y-sec-title">' + escapeHtml(t('secProfiles')) + '</h3><div class="a11y-profiles">';
      profileItems.forEach(function (p) {
        var active = state.activeProfile === p.id;
        profHtml +=
          '<button class="a11y-profile-btn ' + (active ? 'is-active' : '') + '" type="button" data-profile="' + p.id + '" aria-pressed="' + active + '">' +
          '  <span class="a11y-profile-ico">' + p.icon + '</span>' +
          '  <span class="a11y-profile-text">' +
          '    <div class="a11y-profile-name">' + escapeHtml(p.name) + '</div>' +
          '    <div class="a11y-profile-desc">' + escapeHtml(p.desc) + '</div>' +
          '  </span>' +
          '  <span class="a11y-pill-state">' + escapeHtml(active ? t('on') : t('off')) + '</span>' +
          '</button>';
      });
      profHtml += '</div></div>';
      sections.push(profHtml);
    }

    // Section B: Visual & Color
    if (mods.indexOf('visual') !== -1) {
      var contrastSteps = ['normal', 'dark', 'light', 'invert'];
      var satSteps = ['normal', 'high', 'low', 'grayscale'];
      var cbSteps = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];

      sections.push(
        '<div class="a11y-section"><h3 class="a11y-sec-title">' + escapeHtml(t('secVisual')) + '</h3><div class="a11y-grid">' +
        renderStepCard('contrast', ICONS.contrast, t('featContrast'), t('contrast_' + state.contrast), state.contrast !== 'normal', 3, contrastSteps.indexOf(state.contrast)) +
        renderStepCard('saturation', ICONS.saturation, t('featSaturation'), t('saturation_' + state.saturation), state.saturation !== 'normal', 3, satSteps.indexOf(state.saturation)) +
        renderStepCard('colorblind', ICONS.colorblind, t('featColorblind'), t('colorblind_' + state.colorblind), state.colorblind !== 'none', 3, cbSteps.indexOf(state.colorblind)) +
        '</div></div>'
      );
    }

    // Section C: Typography & Layout (6 symmetric cards)
    if (mods.indexOf('typography') !== -1) {
      var alignSteps = ['normal', 'left', 'center', 'justify'];
      sections.push(
        '<div class="a11y-section"><h3 class="a11y-sec-title">' + escapeHtml(t('secTypography')) + '</h3><div class="a11y-grid">' +
        renderStepCard('fontSize', ICONS.fontSize, t('featFontSize'), t('fontSize_' + state.fontSize), state.fontSize > 0, 3, state.fontSize) +
        renderStepCard('lineHeight', ICONS.lineHeight, t('featLineHeight'), t('lineHeight_' + state.lineHeight), state.lineHeight > 0, 3, state.lineHeight) +
        renderStepCard('letterSpacing', ICONS.letterSpacing, t('featLetterSpacing'), t('letterSpacing_' + state.letterSpacing), state.letterSpacing > 0, 3, state.letterSpacing) +
        renderStepCard('readableFont', ICONS.readableFont, t('featReadableFont'), t('readableFont_' + state.readableFont), state.readableFont > 0, 2, state.readableFont) +
        renderStepCard('textAlign', ICONS.textAlign, t('featTextAlign'), t('textAlign_' + state.textAlign), state.textAlign !== 'normal', 3, alignSteps.indexOf(state.textAlign)) +
        renderStepCard('highlightHeadings', ICONS.heading, t('featHighlightHeadings'), state.highlightHeadings ? t('on') : t('off'), state.highlightHeadings, 0, 0) +
        '</div></div>'
      );
    }

    // Section D: Navigation & Reading Aids (6 symmetric cards)
    if (mods.indexOf('navigation') !== -1) {
      var cursorSteps = ['none', 'white', 'black'];
      sections.push(
        '<div class="a11y-section"><h3 class="a11y-sec-title">' + escapeHtml(t('secNavigation')) + '</h3><div class="a11y-grid">' +
        renderStepCard('bigCursor', ICONS.cursor, t('featBigCursor'), t('bigCursor_' + state.bigCursor), state.bigCursor !== 'none', 2, cursorSteps.indexOf(state.bigCursor)) +
        renderStepCard('readingGuide', ICONS.guide, t('featReadingGuide'), state.readingGuide ? t('on') : t('off'), state.readingGuide, 0, 0) +
        renderStepCard('readingMask', ICONS.mask, t('featReadingMask'), state.readingMask ? t('on') : t('off'), state.readingMask, 0, 0) +
        renderStepCard('highlightLinks', ICONS.link, t('featHighlightLinks'), state.highlightLinks ? t('on') : t('off'), state.highlightLinks, 0, 0) +
        renderStepCard('focusOutline', ICONS.focus, t('featFocusOutline'), state.focusOutline ? t('on') : t('off'), state.focusOutline, 0, 0) +
        renderStepCard('tooltips', ICONS.tooltip, t('featTooltips'), state.tooltips ? t('on') : t('off'), state.tooltips, 0, 0) +
        '</div></div>'
      );
    }

    // Section E: Motion & Speech
    if (mods.indexOf('motion') !== -1) {
      var motionHtml =
        '<div class="a11y-section"><h3 class="a11y-sec-title">' + escapeHtml(t('secMotion')) + '</h3><div class="a11y-grid">' +
        renderStepCard('stopAnimations', ICONS.motion, t('featStopAnimations'), state.stopAnimations ? t('on') : t('off'), state.stopAnimations, 0, 0) +
        renderStepCard('hideImages', ICONS.hideImg, t('featHideImages'), state.hideImages ? t('on') : t('off'), state.hideImages, 0, 0) +
        renderStepCard('ttsClick', ICONS.speech, t('featTtsClick'), state.ttsClick ? t('on') : t('off'), state.ttsClick, 0, 0) +
        '</div>';

      if (state.ttsClick) {
        motionHtml += renderTtsControlBar();
      }
      motionHtml += '</div>';
      sections.push(motionHtml);
    }

    bodyEl.innerHTML = sections.join('');
  }

  function renderTtsControlBar() {
    var supported = isTtsSupported();
    var statusTxt = !supported
      ? t('ttsUnsupported')
      : ttsState.speaking
        ? (ttsState.paused ? t('ttsPaused') : t('ttsSpeaking'))
        : t('ttsReady');

    var rate = state.ttsRate || 1.0;
    return (
      '<div id="a11y-tts-bar" class="a11y-tts-bar">' +
      '  <div class="a11y-tts-head"><span>' + escapeHtml(t('ttsBarTitle')) + '</span><span id="a11y-tts-status">' + escapeHtml(statusTxt) + '</span></div>' +
      (supported
        ? '<p class="a11y-tts-hint">' + escapeHtml(t('ttsBarHint')) + '</p>' +
          '<div class="a11y-tts-controls">' +
          '  <button class="a11y-tts-btn is-primary" type="button" data-tts-cmd="playpause">' + ICONS.play + ' ' + escapeHtml(t('ttsPlayPause')) + '</button>' +
          '  <button class="a11y-tts-btn" type="button" data-tts-cmd="stop">' + ICONS.stop + ' ' + escapeHtml(t('ttsStop')) + '</button>' +
          '  <button class="a11y-tts-btn" type="button" data-tts-cmd="rate">' + escapeHtml(t('ttsRateLabel')) + ': ' + rate + 'x</button>' +
          '</div>'
        : '<div class="a11y-tts-warn">' + escapeHtml(t('ttsUnsupported')) + '</div>') +
      '</div>'
    );
  }

  function updateTtsBarUi() {
    if (!shadow || !state.ttsClick) return;
    var statusEl = shadow.getElementById('a11y-tts-status');
    if (statusEl && isTtsSupported()) {
      statusEl.textContent = ttsState.speaking
        ? (ttsState.paused ? t('ttsPaused') : t('ttsSpeaking'))
        : t('ttsReady');
    }
  }

  var cachedStructure = { headings: [], landmarks: [], links: [] };

  function renderStructureTab() {
    cachedStructure = scanPageStructure();
    var items = cachedStructure[activeStructTab] || [];

    var html =
      '<div class="a11y-struct-subtabs">' +
      '  <button class="a11y-struct-tab ' + (activeStructTab === 'headings' ? 'is-active' : '') + '" type="button" data-struct-tab="headings">' + escapeHtml(t('structHeadings')) + ' (' + cachedStructure.headings.length + ')</button>' +
      '  <button class="a11y-struct-tab ' + (activeStructTab === 'landmarks' ? 'is-active' : '') + '" type="button" data-struct-tab="landmarks">' + escapeHtml(t('structLandmarks')) + ' (' + cachedStructure.landmarks.length + ')</button>' +
      '  <button class="a11y-struct-tab ' + (activeStructTab === 'links' ? 'is-active' : '') + '" type="button" data-struct-tab="links">' + escapeHtml(t('structLinks')) + ' (' + cachedStructure.links.length + ')</button>' +
      '</div>' +
      '<div class="a11y-struct-meta">' +
      '  <span>' + escapeHtml(t('structJumpHint')) + '</span>' +
      '  <button class="a11y-refresh-btn" type="button" data-struct-refresh="1">' + escapeHtml(t('structRefresh')) + '</button>' +
      '</div>';

    if (!items.length) {
      return html + '<div class="a11y-empty">' + escapeHtml(t('structEmpty')) + '</div>';
    }

    html += '<div class="a11y-struct-list">';
    items.forEach(function (item, idx) {
      if (activeStructTab === 'headings') {
        var indent = Math.max(0, (item.level - 1) * 12);
        html +=
          '<button class="a11y-struct-item" type="button" data-struct-jump="' + idx + '" style="padding-left:' + (10 + indent) + 'px">' +
          '  <span class="a11y-level-badge">' + escapeHtml(item.tag) + '</span>' +
          '  <span class="a11y-struct-label">' + escapeHtml(item.text) + '</span>' +
          '</button>';
      } else if (activeStructTab === 'landmarks') {
        html +=
          '<button class="a11y-struct-item" type="button" data-struct-jump="' + idx + '">' +
          '  <span class="a11y-level-badge">' + escapeHtml(item.role) + '</span>' +
          '  <span class="a11y-struct-label">' + escapeHtml(item.label) + '</span>' +
          '</button>';
      } else {
        html +=
          '<button class="a11y-struct-item" type="button" data-struct-jump="' + idx + '">' +
          '  <span class="a11y-level-badge">LINK</span>' +
          '  <span class="a11y-struct-label" title="' + escapeHtml(item.href) + '">' + escapeHtml(item.text) + '</span>' +
          '</button>';
      }
    });
    html += '</div>';
    return html;
  }

  function bindShadowEvents() {
    var trigger = shadow.getElementById('a11y-trigger');
    var panel = shadow.getElementById('a11y-panel');
    var xlBtn = shadow.getElementById('a11y-xl-btn');
    var closeBtn = shadow.getElementById('a11y-close-btn');
    var langBtn = shadow.getElementById('a11y-lang-btn');
    var resetBtn = shadow.getElementById('a11y-reset-btn');
    var moveHideBtn = shadow.getElementById('a11y-move-hide-btn');
    var statementBtn = shadow.getElementById('a11y-statement-btn');
    var moveDrawer = shadow.getElementById('a11y-move-drawer');
    var mainTabs = shadow.getElementById('a11y-main-tabs');
    var bodyEl = shadow.getElementById('a11y-body');

    panel.addEventListener('keydown', onPanelKeyDown);

    trigger.addEventListener('click', function () {
      suppressAnimationOnce = false;
      toggle();
    });

    closeBtn.addEventListener('click', function () {
      suppressAnimationOnce = false;
      close();
    });

    xlBtn.addEventListener('click', function () {
      state.oversizedWidget = !state.oversizedWidget;
      saveState();
      applyShadowTheme();
      updateTriggerAppearance();
      renderPanelContent();
      announce(t('xlLabel') + ': ' + (state.oversizedWidget ? t('on') : t('off')));
    });

    langBtn.addEventListener('click', function () {
      var curr = getActiveLang();
      state.langOverride = curr === 'zh-TW' ? 'en' : 'zh-TW';
      saveState();
      updateTriggerAppearance();
      renderPanelContent();
      renderSkipBar();
      scheduleAltOverlayRender();
    });

    resetBtn.addEventListener('click', function () {
      reset(true);
    });

    moveHideBtn.addEventListener('click', function () {
      showMoveDrawer = !showMoveDrawer;
      renderPanelContent();
    });

    statementBtn.addEventListener('click', function () {
      showStatement = !showStatement;
      renderPanelContent();
    });

    moveDrawer.addEventListener('click', function (e) {
      var cmdBtn = e.target.closest('[data-move-cmd]');
      if (!cmdBtn) return;
      var cmd = cmdBtn.getAttribute('data-move-cmd');
      if (cmd === 'left' || cmd === 'right') {
        state.sideOverride = cmd;
        saveState();
        applyShadowTheme();
        showMoveDrawer = false;
        renderPanelContent();
      } else if (cmd === 'hide') {
        state.widgetHidden = true;
        showMoveDrawer = false;
        saveState();
        updateTriggerAppearance();
        close();
        announce(t('hiddenToast'));
      }
    });

    mainTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-main-tab]');
      if (!btn) return;
      activeMainTab = btn.getAttribute('data-main-tab');
      renderPanelContent();
    });

    bodyEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-statement]')) {
        showStatement = false;
        renderPanelContent();
        return;
      }

      var profBtn = e.target.closest('[data-profile]');
      if (profBtn) {
        toggleProfile(profBtn.getAttribute('data-profile'));
        return;
      }

      var actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        handleFeatureAction(actionBtn.getAttribute('data-action'));
        return;
      }

      var ttsCmdBtn = e.target.closest('[data-tts-cmd]');
      if (ttsCmdBtn) {
        var cmd = ttsCmdBtn.getAttribute('data-tts-cmd');
        if (cmd === 'playpause') togglePauseSpeech();
        else if (cmd === 'stop') stopSpeech();
        else if (cmd === 'rate') {
          var rates = [1.0, 1.25, 0.8];
          state.ttsRate = rates[(rates.indexOf(state.ttsRate) + 1) % rates.length];
          saveState();
          renderPanelContent();
        }
        return;
      }

      var structTabBtn = e.target.closest('[data-struct-tab]');
      if (structTabBtn) {
        activeStructTab = structTabBtn.getAttribute('data-struct-tab');
        renderPanelContent();
        return;
      }

      if (e.target.closest('[data-struct-refresh]')) {
        renderPanelContent();
        return;
      }

      var jumpBtn = e.target.closest('[data-struct-jump]');
      if (jumpBtn) {
        var idx = Number(jumpBtn.getAttribute('data-struct-jump'));
        var list = cachedStructure[activeStructTab] || [];
        if (list[idx] && list[idx].el) {
          jumpToElement(list[idx].el);
        }
      }
    });
  }

  function handleFeatureAction(action) {
    switch (action) {
      case 'contrast':
        cycleOption('contrast', ['normal', 'dark', 'light', 'invert'], 'featContrast', 'contrast_');
        break;
      case 'saturation':
        cycleOption('saturation', ['normal', 'high', 'low', 'grayscale'], 'featSaturation', 'saturation_');
        break;
      case 'colorblind':
        cycleOption('colorblind', ['none', 'deuteranopia', 'protanopia', 'tritanopia'], 'featColorblind', 'colorblind_');
        break;
      case 'fontSize':
        cycleOption('fontSize', [0, 1, 2, 3], 'featFontSize', 'fontSize_');
        break;
      case 'lineHeight':
        cycleOption('lineHeight', [0, 1, 2, 3], 'featLineHeight', 'lineHeight_');
        break;
      case 'letterSpacing':
        cycleOption('letterSpacing', [0, 1, 2, 3], 'featLetterSpacing', 'letterSpacing_');
        break;
      case 'readableFont':
        cycleOption('readableFont', [0, 1, 2], 'featReadableFont', 'readableFont_');
        break;
      case 'textAlign':
        cycleOption('textAlign', ['normal', 'left', 'center', 'justify'], 'featTextAlign', 'textAlign_');
        break;
      case 'bigCursor':
        cycleOption('bigCursor', ['none', 'white', 'black'], 'featBigCursor', 'bigCursor_');
        break;
      case 'readingGuide':
        toggleBooleanOption('readingGuide', 'featReadingGuide');
        break;
      case 'readingMask':
        toggleBooleanOption('readingMask', 'featReadingMask');
        break;
      case 'highlightLinks':
        toggleBooleanOption('highlightLinks', 'featHighlightLinks');
        break;
      case 'highlightHeadings':
        toggleBooleanOption('highlightHeadings', 'featHighlightHeadings');
        break;
      case 'focusOutline':
        toggleBooleanOption('focusOutline', 'featFocusOutline');
        break;
      case 'tooltips':
        toggleBooleanOption('tooltips', 'featTooltips');
        break;
      case 'stopAnimations':
        toggleBooleanOption('stopAnimations', 'featStopAnimations');
        break;
      case 'hideImages':
        toggleBooleanOption('hideImages', 'featHideImages');
        break;
      case 'ttsClick':
        toggleBooleanOption('ttsClick', 'featTtsClick');
        break;
    }
  }

  function open() {
    if (!shadow) return;
    var panel = shadow.getElementById('a11y-panel');
    var trigger = shadow.getElementById('a11y-trigger');
    isOpen = true;

    if (suppressAnimationOnce || state.stopAnimations) {
      panel.setAttribute('data-no-anim', 'true');
    } else {
      panel.removeAttribute('data-no-anim');
    }
    suppressAnimationOnce = false;

    if ('inert' in panel) panel.inert = false;
    panel.removeAttribute('inert');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');

    if (activeMainTab === 'structure' && !showStatement) {
      renderPanelContent();
    }

    var closeBtn = shadow.getElementById('a11y-close-btn');
    if (closeBtn) {
      global.setTimeout(function () { closeBtn.focus(); }, 20);
    }
  }

  function close() {
    if (!shadow) return;
    var panel = shadow.getElementById('a11y-panel');
    var trigger = shadow.getElementById('a11y-trigger');
    isOpen = false;
    showMoveDrawer = false;

    if (suppressAnimationOnce || state.stopAnimations) {
      panel.setAttribute('data-no-anim', 'true');
    } else {
      panel.removeAttribute('data-no-anim');
    }
    suppressAnimationOnce = false;

    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if ('inert' in panel) panel.inert = true;
    panel.setAttribute('inert', '');
    trigger.setAttribute('aria-expanded', 'false');
    if (!trigger.hidden) {
      trigger.focus();
    }
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function setupMutationObserver() {
    if (mutationObserver || typeof global.MutationObserver !== 'function' || !document.body) return;
    mutationObserver = new global.MutationObserver(function (mutations) {
      var hasRelevant = false;
      for (var i = 0; i < mutations.length; i++) {
        if (!isOwnNode(mutations[i].target)) {
          hasRelevant = true;
          break;
        }
      }
      if (!hasRelevant) return;
      clearTimeout(mutationTimer);
      mutationTimer = global.setTimeout(function () {
        runAutoRemediation();
        if (state.fontSize > 0) applyFontScaling(state.fontSize);
        if (state.stopAnimations) pausePageVideos();
        if (state.hideImages) scheduleAltOverlayRender();
      }, 150);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  function init(customConfig) {
    var scriptCfg = readScriptDataset(findScriptElement());
    var globalCfg = (global.A11yWidgetConfig && typeof global.A11yWidgetConfig === 'object') ? global.A11yWidgetConfig : {};
    config = mergeConfig(DEFAULT_CONFIG, globalCfg);
    config = mergeConfig(config, scriptCfg);
    if (customConfig && typeof customConfig === 'object') {
      config = mergeConfig(config, customConfig);
    }

    loadState();

    var mount = function () {
      runAutoRemediation();
      createSkipBar();
      createShadowShell();
      applyHostEffects();
      setupMutationObserver();

      if (!initialized) {
        initialized = true;
        document.addEventListener('mousemove', onPointerMove, { passive: true });
        document.addEventListener('touchmove', onPointerMove, { passive: true });
        document.addEventListener('mouseover', onHostHoverOrFocus, { passive: true });
        document.addEventListener('focusin', onHostHoverOrFocus, { passive: true });
        document.addEventListener('mouseout', function () { if (state.tooltips) hideTooltipBubble(); }, { passive: true });
        document.addEventListener('keydown', onGlobalKeyDown);
        document.addEventListener('click', handleDocumentClickForTts, true);
        global.addEventListener('scroll', function () {
          scheduleAltOverlayRender();
          if (state.tooltips) hideTooltipBubble();
        }, { passive: true });
        global.addEventListener('resize', function () {
          updateReadingAidPositions();
          scheduleAltOverlayRender();
        }, { passive: true });
      }
    };

    if (document.body && document.head) {
      mount();
    } else {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    }
  }

  function updateConfig(partialConfig) {
    if (!partialConfig || typeof partialConfig !== 'object') return cloneObj(config);
    config = mergeConfig(config, partialConfig);
    if (partialConfig.position !== undefined) {
      state.sideOverride = null;
      saveState();
    }
    if (partialConfig.lang && I18N[partialConfig.lang]) {
      state.langOverride = null;
      saveState();
    }
    applyShadowTheme();
    updateTriggerAppearance();
    renderPanelContent();
    renderSkipBar();
    applyHostEffects();
    return cloneObj(config);
  }

  function getConfig() {
    return cloneObj(config);
  }

  function getState() {
    return cloneObj(state);
  }

  function setState(partialState) {
    if (!partialState || typeof partialState !== 'object') return cloneObj(state);
    Object.keys(DEFAULT_STATE).forEach(function (k) {
      if (partialState[k] !== undefined) {
        state[k] = partialState[k];
      }
    });
    if (!state.ttsClick) stopSpeech();
    saveState();
    applyShadowTheme();
    applyHostEffects();
    renderPanelContent();
    updateTriggerAppearance();
    return cloneObj(state);
  }

  function applyProfile(profileId) {
    if (!PROFILES[profileId]) return;
    if (state.activeProfile !== profileId) {
      toggleProfile(profileId);
    }
  }

  function getRemediationStats() {
    return cloneObj(remediationStats);
  }

  global.A11yWidget = {
    init: init,
    updateConfig: updateConfig,
    getConfig: getConfig,
    open: open,
    close: close,
    toggle: toggle,
    getState: getState,
    setState: setState,
    reset: function () { reset(true); },
    applyProfile: applyProfile,
    getRemediationStats: getRemediationStats
  };

  init();
})(window);
