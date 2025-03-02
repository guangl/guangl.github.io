---
aliases: [collect-statistics]
create_time: 2024-03-03 18:04:49
linter-yaml-title-alias: collect-statistics
title: collect-statistics
update_time: 2025-03-02 13:47:16
---

## 收集统计信息

```sql
-- 收集整个模式的统计信息
DBMS_STATS.GATHER_SCHEMA_STATS('模式名', 100,FALSE,'FOR ALL COLUMNS SIZE AUTO');
-- 收集一张表的统计信息
DBMS_STATS.GATHER_TABLE_STATS('用户名','表名',NULL,100,TRUE,'FOR ALL COLUMNS SIZE AUTO');

-- 收集索引的统计信息
STAT 100 ON INDEX "模式名"."索引名"
DBMS_STATS.GATHER_INDEX_STATS(
    OWNNAME=>'SYSDBA',
    INDNAME=>'IDX_TEST_ID_DM_LG',
    PARTNAME=>NULL,
    ESTIMATE_PERCENT=>100,
    DEGREE=>16,
    GRANULARITY=>'AUTO',
    NO_INVALIDATE=>TRUE,
);
```

## 显示统计信息

```sql
-- 显示列的统计信息
DBMS_STATS.COLUMN_STATS_SHOW('模式名','表名','列名');
-- 显示表的统计信息
DBMS_STATS.TABLE_STATS_SHOW('模式名','表名');
-- 显示索引的统计信息
DBMS_STATS.INDEX_STATS_SHOW('SYSDBA','IDX_TEST_ID_DM_LG');
```
