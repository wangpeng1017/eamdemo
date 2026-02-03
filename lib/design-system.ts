/**
 * 慧新全智 UI 设计规范
 * 基于《慧新全智线上UI设计规范（简约版）》v2.0
 */

// ============================================
// 颜色系统
// ============================================

export const colors = {
  // 主色
  primary: {
    main: '#00405C',      // 深蓝色 - 主色调
    light: '#005578',
    dark: '#002D40',
  },

  // 辅助色
  secondary: {
    green: '#A5D867',    // 绿色
    cyan: '#0097BA',      // 青色
  },

  // 功能色
  functional: {
    success: '#2BA471',   // 成功
    error: '#D54941',     // 错误
    warning: '#E37318',   // 警告
    info: '#0097BA',      // 点击/信息
  },

  // 中性色
  neutral: {
    // 基础
    white: '#FFFFFF',
    black: '#000000',

    // 文本
    text: {
      primary: '#333333',   // 主标题
      secondary: '#404044', // 主标题
      tertiary: '#0555C5',  // 主标题
      body: '#666666',      // 主要文本
      body2: '#707074',     // 主要文本
      body3: '#0858C8',     // 主要文本
      light: '#999999',     // 辅助文本
      lighter: '#A0A0A0A',  // 辅助文本
      light2: '#4B0B5CB',   // 辅助文本
    },

    // 边框
    border: {
      default: '#DBDFE7',   // 边界a
      light: '#E3E7EE',     // 边界b
    },

    // 背景
    background: {
      default: '#F0F2F5',   // 背景a
      light: '#F5F7FA',     // 背景b
      white: '#FFFFFF',
    },
  },

  // 状态颜色映射
  status: {
    running: '#2BA471',    // 运行中 - 成功色
    fault: '#D54941',      // 故障 - 错误色
    warning: '#E37318',    // 预警 - 警告色
    maintenance: '#0097BA', // 保养中 - 信息色
    repair: '#E37318',      // 维修中 - 警告色
    normal: '#666666',     // 正常
  },
} as const;

// ============================================
// 字体系统
// ============================================

export const typography = {
  // 字体家族
  fontFamily: {
    sans: [
      'HarmonyOS Sans',
      'D-DIN-PRO',
      'Source Han Sans CN',
      'PingFang SC',
      'Hiragino Sans GB',
      'Microsoft YaHei',
      'Arial',
      'sans-serif',
    ].join(', '),
  },

  // 字号层级
  fontSize: {
    h1: '36px',   // 首页广告位、Banner标题（超大标题）
    h2: '24px',   // 二级页面焦点区域、Banner标题（二级页面主标题）
    h3: '20px',   // 副标题或三级标题（页面内容模块标题）
    h4: '18px',   // 四级标题（新闻标题）
    h5: '16px',   // 主导航字体
    body: '14px', // 小篇幅段落、备注字体或底部导航字体
    small: '12px', // 辅助文本
  },

  // 字重
  fontWeight: {
    light: 300,      // Light - 对应代码 320
    regular: 400,    // Regular - 对应代码 400
    medium: 500,     // Medium
    semibold: 600,   // Semibold - 对应代码 600
    bold: 700,       // Bold
  },

  // 行高
  lineHeight: {
    tight: 1.2,      // 单行文字
    normal: 1.5,     // 多行段落
    relaxed: 1.8,     // 宽松行距
  },
} as const;

// ============================================
// 间距系统 (4px 基础单位)
// ============================================

export const spacing = {
  0: '0px',
  1: '4px',    // 基础单位
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '32px',    // 跳过28px
  8: '40px',
  9: '48px',
  10: '64px',   // 跳过56px
  11: '80px',
  12: '96px',
} as const;

// ============================================
// 圆角
// ============================================

export const borderRadius = {
  none: '0',
  sm: '4px',
  base: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

// ============================================
// 阴影
// ============================================

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

// ============================================
// 断点
// ============================================

export const breakpoints = {
  sm: '640px',   // 移动端
  md: '768px',   // 平板
  lg: '1024px',  // 桌面
  xl: '1280px',  // 大屏
  '2xl': '1536px',
} as const;

// ============================================
// 组件默认配置
// ============================================

export const components = {
  // 按钮
  button: {
    primary: {
      bg: colors.primary.main,
      color: colors.neutral.white,
      hover: { bg: colors.primary.light },
    },
    secondary: {
      bg: colors.secondary.cyan,
      color: colors.neutral.white,
    },
  },

  // 卡片
  card: {
    bg: colors.neutral.background.white,
    border: colors.neutral.border.default,
    shadow: shadows.base,
  },

  // 输入框
  input: {
    border: colors.neutral.border.default,
    focus: {
      border: colors.secondary.cyan,
      ring: colors.secondary.cyan,
    },
  },
} as const;

// ============================================
// Tailwind 主题扩展配置
// ============================================

export const tailwindTheme = {
  colors: {
    primary: {
      DEFAULT: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
    },
    secondary: {
      green: colors.secondary.green,
      cyan: colors.secondary.cyan,
    },
    success: colors.functional.success,
    error: colors.functional.error,
    warning: colors.functional.warning,
    info: colors.functional.info,
  },
  fontFamily: {
    sans: typography.fontFamily.sans,
  },
  spacing,
  borderRadius,
  boxShadow: shadows,
} as const;
