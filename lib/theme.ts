/**
 * @file theme.ts
 * @desc Ant Design 主题配置 - 基于慧新全智 UI 设计规范
 */
import type { ThemeConfig } from 'antd'

export const theme: ThemeConfig = {
  token: {
    // 主色调 - 深蓝色
    colorPrimary: '#00405C',
    colorLink: '#0097BA',
    colorSuccess: '#2BA471',
    colorWarning: '#E37318',
    colorError: '#D54941',

    // 字体
    fontFamily: '"HarmonyOS Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 14,

    // 圆角
    borderRadius: 4,

    // 间距
    padding: 16,
    margin: 16,
  },
  components: {
    Layout: {
      siderBg: '#00405C',
      headerBg: '#ffffff',
      bodyBg: '#F0F2F5',
    },
    Menu: {
      darkItemBg: '#00405C',
      darkItemSelectedBg: '#0097BA',
      darkItemHoverBg: '#015478',
    },
    Table: {
      headerBg: '#F5F7FA',
      rowHoverBg: '#CCF5FF',
    },
    Button: {
      primaryShadow: 'none',
    },
  },
}
