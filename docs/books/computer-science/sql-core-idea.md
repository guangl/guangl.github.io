## 概念

### 基数

某个列唯一键（Distinct_Keys）的数量叫作基数。可以通过以下 SQL 查询：

```sql
SELECT COUNT(DISTINCT <COLUMN_NAME>) FROM <TABLE_NAME>;
```

### 数据分布

数据分布是统计列在表中所有数据的行数，数据分布可以通过以下 SQL 查询：

```sql
SELECT COUNT(*),<COLUMN_NAME> FROM <TABLE_NAME> GROUP BY <COLUMN_NAME> ORDER BY 1 DESC;
```

基本大概 5% 就可以走索引，如果大于 5% 回表的代价可能会大于全表扫。
> 5% 是经验值

### 选择性

基数与总行数的比值再乘以 100% 就是某个列的选择性。

基本上，列的选择性越高代表数据分布越均匀，这个列的过滤性越好。一般来说选择率高于 **20%** 就说明该列的数据分布比较均衡。

可以使用以下 `SQL` 查询选择率：

```sql
SELECT ROUND(CAST(COUNT(DISTINCT <COLUMN_NAME>) AS NUMBER)/COUNT(*),2) FROM <TABLE_NAME>;
```

### 直方图

在统计学中，直方图（英语：histogram）是一种对数据分布情况的图形表示，是一种二维统计图表，它的两个坐标分别是统计样本和该样本对应的某个属性的度量

针对于达梦数据库来说，如果一个列的 **基数** 小于 10000，使用频率直方图，否则使用等高直方图。
* 频率直方图；
* 等高直方图；

### 回表

当对一个列创建索引之后，索引会包含该列的键值以及键值对应行所在的 `rowid`。通过索引中记录的 `rowid` 访问表中的数据就叫回表。

回表一般是单块读，回表次数太多会严重影响 `SQL` 性能，如果回表次数太多，就不应该走索引扫描了，应该直接走全表扫描。

### 集群因子

集群因子用于判断索引回表需要消耗的物理 `I/O` 次数。

> 达梦数据库无法查询出来。

### 表与表之间关系

表与表之间存在三种关系：
* `1:1`
* `1:N`
* `N:N`

1. 两表在进行关联的时候，如果两表属于 `1:1` 关系，关联之后返回的结果也是属于 `1` 的关系，数据不会重复；
2. 如果两表属于 `1∶N` 关系，关联之后返回的结果集属于 `N` 的关系；
3. 如果两表属于 `N∶N` 关系，关联之后返回的结果集会产生局部范围的笛卡儿积，`N∶N` 关系一般不存在内/外连接中，只能存在于半连接或者反连接中；

如何判断表与表之间的关系呢？以如下 SQL 为例子：

```sql
SELECT * FROM TEST1 A,TEST2 B WHERE A.ID = B.ID;
```

使用以下 `SQL` 来判断

```sql
SELECT COUNT(*),ID FROM TEST1 GROUP BY ID ORDER BY 1 DESC;
SELECT COUNT(*),ID FROM TEST2 GROUP BY ID ORDER BY 1 DESC;
```

1. 这两个 `SQL` 的结果集如果都是 `1` 的话，那就是 `1:1` 之间的关系；
2. 如果 `TEST1` 的结果集是 `N`，`TEST2` 的结果集是 `1`，那就是 `N:1` 之间的关系；
3. 如果 `TEST1` 的结果集是 `1`，`TEST2` 的结果集是 `N`，那就是 `1:N` 之间的关系；
4. 如果 `TEST1` 的结果集是 `N`，`TEST2` 的结果集是 `N`，那就是 `N:N` 之间的关系；

## 表连接方式

### 笛卡尔连接

当两张表没有连接条件的时候会产生笛卡尔积，这种连接方式叫做笛卡尔连接。

一般来说，`SQL` 中不太可能有笛卡尔连接，如果有的话，应该询问开发和业务是否存在关联条件，是否满足业务的需求。

除非，关联表其中之一的表行数为 1。`1*N=N` 所以优化器会放心的选择笛卡尔连接。此时，统计信息就尤为重要了。

### 标量子查询

在 `SELECT` 和 `FROM` 之间的子查询叫做 **标量子查询**。

标量子查询类似于 `nested loops join`，驱动表为主分支的主表。与嵌套循环连接一样，标量子查询与主表的连接列需要索引。主表会将连接列传给子查询的连接列。

目前来说，最好只有在主分支结果集较少的情况下使用标量子查询，结果集越多，标量子查询次数越多，`SQL` 性能越慢。

那么，如果主分支结果集较大的情况如何优化呢？可以改写成 `hash` 外连接，外连接是因为就算子查询没有匹配到，也会显示 `NULL`。
for example:

```sql
select d.name,d.loc,(select max(e.sal) from emp e where e.deptno = d.deptno) as max_sal
from dept d;
```

这个 SQL 转换为外连接：

```sql
select d.name,d.loc,e.mal_sal
from dept d
left join (
) e
on d.deptno = e.deptno;
```

### 半连接

两表关联只返回一张表的数据就叫做内连接。 一般是 `in` 和 `exists`。

`一般来说，in` 和 `exists` 可以进行等价改写。

for example：

```sql
select * from dept d where deptno in (select deptno from emp);
```

改写为 `exists`：

```sql
select * from dept where exists (select null from emp where dept.deptno=emp.deptno);
```

### 反连接
两表关联只返回主表的数据，而且只返回主表与子表没关联上的数据，这就叫做反连接。 一般指的是 `not in` 和 `not exists`。

正常来说，`not in` 和 `not exists` 也可以等价改写。

for example：

```sql
select * from dept where deptno not in (select deptno from emp);
```

改写为 `not exists`：

```sql
select * from dept where not exists (select deptno from emp where deptno is not null);
```

半连接/反连接中的 `in` 和 `exists` 谁快谁慢是需要视情况而论，需要知道两表直接的数据量、连接关系才行。
