---
aliases: [收集统计信息]
create_time: 2024-12-23 20:53:01
title: 收集统计信息
update_time: 2025-01-11 04:15:48
---

## 系统统计信息

```sql
-- 收集统计信息
execute dbms_stats.gather_system_stats('start');
execute dbms_stats.gather_system_stats('stop');

-- 删除统计信息
execute dbms_stats.delete_system_stats;

-- 设置统计信息
execute dbms_stats.set_system_stats('CPUSPEED',500);
execute dbms_stats.set_system_stats('SREADTIM',5.0);
execute dbms_stats.set_system_stats('MREADTIM',30.0);
execute dbms_stats.set_system_stats('MBRC',12);

-- 刷新共享池
alter system flush shared_pool;
```
