---
aliases: [tmp 空间不足]
create_time: 2024-03-03 18:04:40
linter-yaml-title-alias: tmp 空间不足
title: tmp 空间不足
update_time: 2025-02-04 11:25:41
---

添加环境变量，将解压后的 dmdbms 换个位置存储，输入以下命令：

```bash
su - dmdba
mkdir iso
export DM_INSTALL_TMPDIR=/home/dmdba/iso
```

> [!NOTE]  
> 需确保新的位置有空间存储 dmdbms
