import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "DM Question",
  description: "dm question",
  base: "/dm-question/",

  srcDir: "./src",
  outDir: "./dist",
  assetsDir: "./assets",

  appearance: true,

  themeConfig: {
    search: {
      provider: "local",
    },

    nav: [
      { text: "Home", link: "/" },
      {
        text: "API",
        link: "/api",
      },
    ],

    sidebar: [
      {
        text: "Examples",
        items: [
          {
            text: "Markdown Examples",
            link: "/markdown-examples",
            items: [{ text: "API", link: "/api" }],
          },
          { text: "Runtime API Examples", link: "/api-examples" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/guangl" }],
  },
});
