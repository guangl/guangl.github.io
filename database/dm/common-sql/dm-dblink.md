---
aliases: [dm-dblink]
create_time: 2024-03-03 18:04:36
linter-yaml-title-alias: dm-dblink
title: dm-dblink
update_time: 2025-03-02 13:47:17
---

## DPI 方式创建 Dblink

```sql
CREATE PUBLIC LINK HJ_TO_GG CONNECT 'DPI' WITH SYSDBA IDENTIFIED BY SYSDBA USING '188.36.42.127';
```
