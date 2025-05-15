是否启用 DML 的参数优化。

**属性**：静态级

**缺省值**：0

`BATCH_PARAM_OPT` 取不同值的效果如下：

* 0：不开启参数优化；
* 1：模式 1，大幅度优化，但是限制较大；
* 2：模式 2，小幅度优化，但是没有限制；
* 3：尽量使用模式 1，如果无法触发模式 1 的优化，那就使用模式 2 的优化；

我们尽量做一个实验，插入 100w 条数据，来做开启优化和不开启优化的对比，以 `sqllog` 里面的时间为准。

表结构如下：

```sql
CREATE TABLE TEST_LG ( A1 NUMBER(10,0), A2 NUMBER(10,0), A3 NUMBER(10,0), A4 NUMBER(10,0), A5 NUMBER(10,0) );
```

Java 代码如下：
```java
String className = "dm.jdbc.driver.DmDriver";
String jdbcUrl = "jdbc:dm://10.76.11.205:65236";
String username = "SYSDBA";
String password = "******";

Class.forName(className);
Connection connection = DriverManager.getConnection(jdbcUrl, username, password);
PreparedStatement preparedStatement = connection.prepareStatement("INSERT INTO TEST_LG VALUES ( ?, ?, ?, ?, ? )");

for (int i = 1; i <= 100_0000; i++) {
    preparedStatement.setInt(1, i);
    preparedStatement.setInt(2, i);
    preparedStatement.setInt(3, i);
    preparedStatement.setInt(4, i);
    preparedStatement.setInt(5, i);

    preparedStatement.addBatch();
}
preparedStatement.executeBatch();
preparedStatement.close();
connection.close();
```

## 不开启参数优化

由 `sqllog` 可知，此次插入花费了 21s。

![不开启参数优化的耗时](/database/batch-param-opt-01.png)

## 模式一的参数优化

开启 `BATCH_PARAM_OPT = 1`，此次插入花费了 12s，快了 42% 左右。

![BATCH_PARAM_OPT=1 的耗时](/database/batch-param-opt-02.png)

但是快了 42% 是有代价的：

1. 不返回影响行数；

### 不返回影响行数

```java
String className = "dm.jdbc.driver.DmDriver";
String jdbcUrl = "jdbc:dm://10.76.11.205:65236?compatible_mode=oracle19";
String username = "SYSDBA";
String password = "DMDBA_hust4400";

Class.forName(className);
Connection connection = DriverManager.getConnection(jdbcUrl, username, password);
PreparedStatement preparedStatement = connection.prepareStatement("INSERT INTO TEST_LG VALUES ( ?, ?, ?, ?, ? )");

for (int i = 1; i <= 100_0000; i++) {
    preparedStatement.setInt(1, i);
    preparedStatement.setInt(2, i);
    preparedStatement.setInt(3, i);
    preparedStatement.setInt(4, i);
    preparedStatement.setInt(5, i);

    preparedStatement.addBatch();
}
int[] result = preparedStatement.executeBatch();
preparedStatement.close();
connection.close();
```

`BATCH_PARAM_OPT = 0` 时，`result` 的返回值为 100W 个 1 的数组 `(Array(100_0000).fill(1))`。
`BATCH_PARAM_OPT = 1` 时，`result` 的返回值为 `[]`。

所以，返回值完全不对，没有返回每一个 SQL 的影响行数。

## 模式二的参数优化

> 说实话，我真不知道模式二是怎么优化的，优化了什么。批量插入真没有测试出来快了什么。
