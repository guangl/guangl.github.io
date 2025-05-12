是否进行视图合并

**属性**：动态会话级，支持 `HINT` 指定

**缺省值**：2

满足以下条件时，可以进行视图合并优化：
`FROM` 列表中只有一个视图，且这个视图中含有 `GROUP BY` 的视图；
外层查询项中不含有查询表达式；
外层查询不能含有 `ROWNUM` 或 `TOP`；
合并视图可以含有外连接，但所在查询不可以含有外连接；

`COMPLEX_VIEW_MERGING` 取不同值的效果如下：

* 0：不进行视图合并；
* 1：对不包含别名和同名列的视图进行合并；
* 2：对包含别名和同名列的视图也进行合并；

```sql
CREATE TABLE t1 ( c1 INT, c2 INT );
CREATE TABLE t2 ( d1 INT, d2 INT );

SELECT /*+complex_view_merging(0)*/ * FROM t1, ( SELECT d1 FROM t2 GROUP BY d1 ) WHERE c2 = d1;
```

此 `select` 的执行计划如下：

```md
NSET2:[1, 1, 12]
  PRJT2:[1, 1, 12];exp_num(3), is_atom(FALSE)
    SLCT2:[1, 1, 12];T1.C2 = DMTEMPVIEW_889198491.D1
      NEST LOOP INNER JOIN2:[1, 1, 12];[with var]
        CSCN2:[1, 1, 8];INDEX33637199(T1); btr_scan(1)
        PRJT2:[1, 1, 4];exp_num(1), is_atom(FALSE)
          HAGR2:[1, 1, 4];grp_num(1), sfun_num(0); slave_empty(0) keys(T2.D1)
            SLCT2:[1, 1, 4];T2.D1 = var1
              CSCN2:[1, 1, 4];INDEX33637200(T2); btr_scan(1)
```

可以从 `prtj2` 看出来，还是先计算了 `t2` 这个子查询，然后聚合输出了派生表，最后与 `t1` 这个表关联。

```sql
CREATE TABLE t1 ( c1 INT, c2 INT );
CREATE TABLE t2 ( d1 INT, d2 INT );

SELECT /*+complex_view_merging(2)*/ * FROM t1, ( SELECT d1 FROM t2 GROUP BY d1 ) WHERE c2 = d1;
```

此 `select` 的执行计划如下：

```md
NSET2:[1, 1, 24]
  PRJT2:[1, 1, 24];exp_num(3), is_atom(FALSE)
    HAGR2:[1, 1, 24];grp_num(4), sfun_num(0); slave_empty(0) keys(T2.D1, T1.C2, T1.C1, T1.ROWID)
      HASH2 INNER JOIN:[1, 1, 24];KEY_NUM(1); KEY(T2.D1=T1.C2) KEY_NULL_EQU(0)
        CSCN2:[1, 1, 4];INDEX33637200(T2); btr_scan(1)
        CSCN2:[1, 1, 20];INDEX33637199(T1); btr_scan(1)
```

很明显， `t1` 和 `t2` 做了 `hash` 连接，然后再做聚合输出。
此时， `t1` 和 `t2` 就可以改变表的连接顺序以及连接方式了，比如：

```sql
SELECT /*+complex_view_merging(2) USE_NL(t1,t2)*/ * FROM t1, ( SELECT d1 FROM t2 GROUP BY d1 ) WHERE c2 = d1;
```

此 `select` 的执行计划如下：

```md
NSET2:[6, 1, 24]
  PRJT2:[6, 1, 24];exp_num(3), is_atom(FALSE)
    HAGR2:[6, 1, 24];grp_num(4), sfun_num(0); slave_empty(0) keys(T2.D1, T1.C2, T1.C1, T1.ROWID)
      SLCT2:[5, 1, 24];T1.C2 = T2.D1
        NEST LOOP INNER JOIN2:[5, 1, 24]
          CSCN2:[1, 1, 20];INDEX33637199(T1); btr_scan(1)
          CSCN2:[1, 1, 4];INDEX33637200(T2); btr_scan(1)
```

可以看到， `t1` 和 `t2` 就可以改成 `nested loop` 了。就可以按照自己的心思来做优化了。
