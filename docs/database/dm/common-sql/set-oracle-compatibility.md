---
aliases: [设置 oracle 兼容性]
create_time: 2024-03-03 18:04:38
linter-yaml-title-alias: 设置 oracle 兼容性
title: 设置 oracle 兼容性
update_time: 2025-02-04 11:25:19
---
## 设置 oracle 兼容性

```sql
-- 兼容oracle要设置的参数 ，执行后重启数据库生效
SP_SET_PARA_VALUE(2,'COMPATIBLE_MODE',2);
SP_SET_PARA_VALUE(1,'ORDER_BY_NULLS_FLAG',1);
SP_SET_PARA_VALUE(2,'CALC_AS_DECIMAL',1);
SP_SET_PARA_VALUE(1,'ENABLE_SEQ_REUSE',1);
SP_SET_PARA_VALUE(1,'ENABLE_PL_SYNONYM',1);
SP_SET_PARA_VALUE(1,'ENABLE_BLOB_CMP_FLAG',1);
SP_SET_PARA_VALUE(2,'NUMBER_MODE',1);
```

## 查询 oracle 兼容性

```sql
SELECT
  PARA_NAME,
  PARA_VALUE
FROM
  V$DM_INI
WHERE
  PARA_NAME IN (
    'COMPATIBLE_MODE',
    'ORDER_BY_NULLS_FLAG',
    'CALC_AS_DECIMAL',
    'ENABLE_SEQ_REUSE',
    'ENABLE_PL_SYNONYM',
    'ENABLE_BLOB_CMP_FLAG',
    'NUMBER_MODE'
  );
```
