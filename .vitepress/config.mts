import { defineConfig, type DefaultTheme } from "vitepress";
import {
  dmSidebar,
  oracleSidebar,
  mysqlSidebar,
  postgresqlSidebar,
  sqliteSidebar,
} from "./sidebar/database";

function getNavigation(): DefaultTheme.NavItem[] {
  return [
    { text: "主页", link: "/" },
    {
      text: "数据库",
      link: "/database/dm/dm-thread",
      activeMatch: "/database/",
    },
  ];
}

function getSearchTranslate(): DefaultTheme.LocalSearchOptions["translations"] {
  return {
    button: {
      buttonText: "搜索文档",
      buttonAriaLabel: "搜索文档",
    },
    modal: {
      displayDetails: "显示详情",
      resetButtonTitle: "清除查询条件",
      backButtonTitle: "返回",
      noResultsText: "无法找到相关结果",
      footer: {
        selectText: "选择",
        selectKeyAriaLabel: "选择",
        navigateText: "切换",
        navigateUpKeyAriaLabel: "向上",
        navigateDownKeyAriaLabel: "向下",
        closeText: "关闭",
        closeKeyAriaLabel: "关闭",
      },
    },
  };
}

export default defineConfig({
  lang: "zh-Hans",
  title: "学习过程",
  description: "",
  base: "/dm-question/",

  srcDir: ".",
  outDir: "./dist",
  assetsDir: "./assets",

  appearance: true,

  themeConfig: {
    i18nRouting: true,

    nav: getNavigation(),

    sidebar: {
      "/database/": [
        ...dmSidebar,
        ...oracleSidebar,
        ...postgresqlSidebar,
        ...sqliteSidebar,
        ...mysqlSidebar,
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/guangl" }],

    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
    skipToContentLabel: "跳转到内容",

    footer: {
      message: "基于 Apache 2.0 许可发布",
      copyright: `版权所有 © 2025-${new Date().getFullYear()}`,
    },

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    outline: {
      label: "页面导航",
    },

    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "full",
        timeStyle: "medium",
      },
    },

    editLink: {
      pattern: "https://github.com/guangl/dm-question/edit/main/:path",
      text: "在 GitHub 上编辑此页面",
    },

    search: {
      provider: "local",
      options: {
        translations: getSearchTranslate(),
      },
    },
  },

  markdown: {
    lineNumbers: true,
  },
});
