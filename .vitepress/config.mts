import { defineConfig, type DefaultTheme } from "vitepress";

function getNavigation(): DefaultTheme.NavItem[] {
  return [
    { text: "主页", link: "/" },
    { text: "数据库", link: "/database", activeMatch: "/database/" },
    { text: "驱动", link: "/drivers", activeMatch: "/drivers/" },
    { text: "参数", link: "/parameters", activeMatch: "/parameters/" },
  ];
}

function getSidebarDrivers(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: "Java",
      base: "/drivers/java/",
      collapsed: true,
      items: [
        {
          text: "Java",
          link: "java",
        },
        {
          text: "Hibernate",
          link: "hibernate",
        },
        {
          text: "MyBatis",
          link: "mybatis",
        },
        {
          text: "Spring Data JPA",
          link: "spring_data_jpa",
        },
      ],
    },
    {
      text: "Node.js",
      base: "/drivers/node/",
      collapsed: true,
      items: [
        {
          text: "Node.js",
          link: "node",
        },
        {
          text: "TypeORM",
          link: "typeorm",
        },
      ],
    },
  ];
}

function getSidebarParameters(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: "查询相关",
      base: "/parameters/query/",
      collapsed: true,
      items: [{ text: "BATCH_PARAM_OPT", link: "batch_param_opt" }],
    },
  ];
}

function getSidebarDatabase(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: "网络相关",
      base: "/database/",
      collapsed: true,
      items: [
        {
          text: "数据库连接",
          link: "connection",
        },
      ],
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
  title: "达梦数据库问题合集",
  description: "The question of dameng database",
  base: "/dm-question/",

  srcDir: "./docs",
  outDir: "./dist",
  assetsDir: "./assets",

  appearance: true,

  themeConfig: {
    i18nRouting: true,

    nav: getNavigation(),

    sidebar: {
      "/drivers/": getSidebarDrivers(),
      "/parameters/": getSidebarParameters(),
      "/database/": getSidebarDatabase(),
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
      pattern: "https://github.com/guangl/dm-question/edit/main/src/:path",
      text: "在 GitHub 上编辑此页面",
    },

    search: {
      provider: "local",
      options: {
        translations: getSearchTranslate(),
      },
    },
  },
});
