数据库缓存的作用就是减少 SQL 实际执行次数，只需要返回缓存的结果即可，这样可以减少数据库的压力，提高系统的性能。

达梦数据库缓存支持两种：
1. 服务端缓存；
2. 客户端缓存；

## 服务端缓存

服务端缓存是指应用会接触到数据库层，但是不会执行具体 SQL 语句，而是直接返回缓存的结果。

### 开启方法

我们使以下 SQL 走缓存

```sql
SELECT * FROM TEST WHERE A = 1;
```

准备表结构，插入数据

```sql
CREATE TABLE TEST ( A INT, B VARCHAR(255) );
INSERT INTO TEST VALUES ( 1, 'AA' );
INSERT INTO TEST VALUES ( 2, 'BB' );
COMMIT;
```

在 `dm.ini` 文件中修改以下参数，重启数据库

```ini
RS_CAN_CACHE      = 1
RS_CACHE_TABLES   = TEST
BUILD_FORWARD_RS  = 1
```

此时执行两次准备的 SQL，观察执行号，如果第二次执行号为 0，根据经验说明走了缓存。

第一次执行截图如下
![database-cache-01](/database/database-cache-01.png)

第二次执行截图如下，说明走了缓存
![database-cache-02](/database/database-cache-02.png)

### 原理解析

// TODO

### 注意事项

在以下情况下，服务端不支持结果集缓存：

1. 必须是单纯的查询语句；
2. 查询语句的计划也必须是缓存的；
3. 守护环境中的备库不支持结果集缓存；
4. 查询语句中包含以下任意一项，结果集都不能缓存：
  1. 临时表；
  2. 包含序列的 CURVAL 或者 NEXTVAL；
  3. 包含非确定的 SQL 函数；
  4. 包含RAND、SYSDATE 等返回值实时变化的系统函数；
  5. 其他一些实时要素；
