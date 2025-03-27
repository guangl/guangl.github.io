---
aliases: [cannot get user lang]
create_time: 2024-03-03 18:04:35
linter-yaml-title-alias: cannot get user lang
title: cannot get user lang
update_time: 2025-02-04 11:25:36
---

没有配置环境变量 `LANG`

```bash
export LANG=en_US.UTF-8
```

> [!NOTE]  
> 将 `LANG` 更改为 `en_US.UTF-8` 时，agent 与 veri 的 `char_code` 默认值自动变为 `PG_UTF-8`。
> 强烈推荐使用 `PG_UTF-8`，无论库是什么字符集。
