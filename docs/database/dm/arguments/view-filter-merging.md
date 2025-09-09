指定是否对视图条件进行优化以及如何优化。

## 参数解析

**属性**：会话级（支持 HINT 指定）
**缺省值**：138

`VIEW_FILTER_MERGING` 取不同值的效果如下：
* 0：不进行视图合并；
* 1：尽可能地进行视图合并；
* 2：自动判断是否进行视图合并，以下两种条件则不进行视图合并：
  * 视图在查询中出现次数多次且不是简单视图；
  * 视图中包含过多的集合运算（>= 10），或待合并的过滤条件为复杂布尔表达式；
* 4：视图包含分析函数时，如果分析函数的 `partition by` 具有唯一性，则外层过滤条件会下推到视图内部；
* 8：如果派生表存在集函数，则不进行条件下推优化；
* 16：收集公用表达式相关的所有过滤条件，改写合并所有条件，并下放到公用表达式的内部；
* 32：`TOP` 信息下推到派生表；
* 64：外层布尔表达式隐式声明 `IS NOT NULL` 属性，对派生表/视图对应的列显示添加 `COL IS NOT NULL` 布尔表达式；
* 128：外层 `ROWNUM` 过滤表达式尝试下放至视图/派生表生成 `TOP` 子句；
* 256：当满足以下条件时，对相关派生表过滤条件进行下推优化：
  * 过滤条件对应派生表的查询项，并且是查询表达式；
  * 过滤条件列映射为查询表达式的引用列，并且引用列来自派生表的 `FROM` 项；
* 512：视图已经有过滤条件的，不重复下放，为了后续能使用 `htab`；
* 1024：包含该值时，取消下述限制：
  * 视图是集合运算时的分支数应小于 10；
  * 若视图是集合运算且超过 2 个分支时，过滤条件不能含有复杂函数/表达式；

其实这个效果的表述问题有点多，有以下问题，这些问题都需要测试：
1. 当取值为 2 的时候，视图在查询中出现多少次才不会合并；
2. 当取值为 2 的时候，简单视图需要多简单才不会合并；
3. 当取值为 16 的时候，公用表达式是什么；
4. 当取值为 64 的时候，如何隐式声明 `IS NOT NULL` 属性；
5. 当取值为 256 的时候，查询项可以为标量子查询/case when 这种查询项吗；
6. 和 [[complex-view-merging]] 有什么区别；

## 原理解析

构造以下 SQL
```sql
CREATE TABLE TEST_LG1 ( A1 INT, B1 VARCHAR(255) );
CREATE TABLE TEST_LG2 ( A2 INT, B2 VARCHAR(255) );
CREATE TABLE TEST_LG3 ( A3 INT, B3 VARCHAR(255) );
CREATE TABLE TEST_LG4 ( A4 INT, B4 VARCHAR(255) );

INSERT INTO TEST_LG1 SELECT LEVEL,LEVEL FROM DUAL CONNECT BY LEVEL <= 100000;
INSERT INTO TEST_LG2 SELECT LEVEL,LEVEL FROM DUAL CONNECT BY LEVEL <= 100000;
INSERT INTO TEST_LG3 SELECT LEVEL,LEVEL FROM DUAL CONNECT BY LEVEL <= 100000;
INSERT INTO TEST_LG4 SELECT LEVEL,LEVEL FROM DUAL CONNECT BY LEVEL <= 100000;


CREATE OR REPLACE VIEW V_TEST_LG(A,B) AS
SELECT A1,B1 FROM TEST_LG1 WHERE A1 = 1
UNION
SELECT A2,B2 FROM TEST_LG2 WHERE A2 = 1 AND B2 = 2
UNION
SELECT A3,B3 FROM TEST_LG3 WHERE A3 > 5
UNION
SELECT A4,B4 FROM TEST_LG4 WHERE B4 < 5;
```

### 值为 0

不进行视图合并。

此时查看以下 SQL 的执行计划
```sql
EXPLAIN SELECT /*+VIEW_FILTER_MERGING(0) COMPLEX_VIEW_MERGING(0)*/ * FROM V_TEST_LG WHERE A = 1;
```

```txt
1   #NSET2: [56, 3, 52]
2     #PRJT2: [56, 3, 52]; exp_num(2), is_atom(FALSE)
3       #SLCT2: [56, 3, 52]; V_TEST_LG.A = 1
4         #PRJT2: [56, 126, 52]; exp_num(2), is_atom(FALSE)
5           #DISTINCT: [56, 126, 52]
6             #UNION ALL: [55, 12625, 52]
7               #PRJT2: [40, 7625, 52]; exp_num(2), is_atom(FALSE)
8                 #UNION ALL: [40, 7625, 52]
9                   #PRJT2: [26, 2625, 52]; exp_num(2), is_atom(FALSE)
10                    #UNION ALL: [26, 2625, 52]
11                      #PRJT2: [12, 2500, 52]; exp_num(2), is_atom(FALSE)
12                        #SLCT2: [12, 2500, 52]; TEST_LG1.A1 = 1
13                          #CSCN2: [12, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
14                      #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
15                        #SLCT2: [12, 125, 52]; (TEST_LG2.A2 = 1 AND exp_cast(TEST_LG2.B2) = 2)
16                          #CSCN2: [12, 100000, 52]; INDEX33555468(TEST_LG2); btr_scan(1)
17                  #PRJT2: [12, 5000, 52]; exp_num(2), is_atom(FALSE)
18                    #SLCT2: [12, 5000, 52]; TEST_LG3.A3 > 5
19                      #CSCN2: [12, 100000, 52]; INDEX33555469(TEST_LG3); btr_scan(1)
20              #PRJT2: [12, 5000, 52]; exp_num(2), is_atom(FALSE)
21                #SLCT2: [12, 5000, 52]; exp_cast(TEST_LG4.B4) < 5
22                  #CSCN2: [12, 100000, 52]; INDEX33555470(TEST_LG4); btr_scan(1)
```

此时 `SLCT2` 并没有下放到视图内，执行计划也就是正常的情况，先把 `select * from v_test_lg` 查询出来，然后再进行过滤。

### 值为 1

尽可能地进行视图合并。

此时继续查看以下 SQL 的执行计划
```sql
EXPLAIN SELECT /*+VIEW_FILTER_MERGING(1) COMPLEX_VIEW_MERGING(0)*/ * FROM V_TEST_LG WHERE A = 1;
```

```txt
1   #NSET2: [41, 27, 52]
2     #PRJT2: [41, 27, 52]; exp_num(2), is_atom(FALSE)
3       #PRJT2: [41, 27, 52]; exp_num(2), is_atom(FALSE)
4         #DISTINCT: [41, 27, 52]
5           #UNION ALL: [40, 2750, 52]
6             #PRJT2: [26, 2625, 52]; exp_num(2), is_atom(FALSE)
7               #PRJT2: [26, 2625, 52]; exp_num(2), is_atom(FALSE)
8                 #UNION ALL: [26, 2625, 52]
9                   #PRJT2: [12, 2500, 52]; exp_num(2), is_atom(FALSE)
10                    #SLCT2: [12, 2500, 52]; TEST_LG1.A1 = 1
11                      #CSCN2: [12, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
12                  #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
13                    #SLCT2: [12, 125, 52]; (TEST_LG2.A2 = 1 AND exp_cast(TEST_LG2.B2) = 2)
14                      #CSCN2: [12, 100000, 52]; INDEX33555468(TEST_LG2); btr_scan(1)
15            #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
16              #SLCT2: [12, 125, 52]; (TEST_LG4.A4 = 1 AND exp_cast(TEST_LG4.B4) < 5)
17                #CSCN2: [12, 100000, 52]; INDEX33555470(TEST_LG4); btr_scan(1)
```
这个时候会把 `where a = 1` 下推到视图中每一个查询里。
可以看到少了对 `TEST_LG3` 表的查询，这是因为 `TEST_LG3` 的查询项 `A3 > 5 AND A3 = 1` 必定为 false，所以直接把 `TEST_LG3` 裁剪了。

### 值为 2

自动判断是否进行视图合并，以下两种条件则不进行视图合并：
* 视图在查询中出现次数多次且不是简单视图；
* 视图中包含过多的集合运算（>= 10），或待合并的过滤条件为复杂布尔表达式；

以下是不进行视图合并的情况
* 视图被查询多次的时候，无法进行视图合并
```sql
select
  /*+view_filter_merging(2) complex_view_merging(0)*/
  *
from
  (
    select * from v_test_lg
    union all
    select * from v_test_lg
  ) t
where
  t.a = 1;
```
此时的执行计划为
```txt
1   #NSET2: [111, 55, 52]
2     #PRJT2: [111, 55, 52]; exp_num(2), is_atom(FALSE)
3       #PRJT2: [111, 55, 52]; exp_num(2), is_atom(FALSE)
4         #UNION ALL: [111, 55, 52]
5           #PRJT2: [55, 27, 52]; exp_num(2), is_atom(FALSE)
6             #PRJT2: [55, 27, 52]; exp_num(2), is_atom(FALSE)
7               #DISTINCT: [55, 27, 52]
8                 #UNION ALL: [54, 2751, 52]
9                   #PRJT2: [40, 2626, 52]; exp_num(2), is_atom(FALSE)
10                    #UNION ALL: [40, 2626, 52]
11                      #PRJT2: [26, 2625, 52]; exp_num(2), is_atom(FALSE)
12                        #UNION ALL: [26, 2625, 52]
13                          #PRJT2: [12, 2500, 52]; exp_num(2), is_atom(FALSE)
14                            #SLCT2: [12, 2500, 52]; TEST_LG1.A1 = 1
15                              #CSCN2: [12, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
16                          #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
17                            #SLCT2: [12, 125, 52]; (TEST_LG2.A2 = 1 AND exp_cast(TEST_LG2.B2) = 2)
18                              #CSCN2: [12, 100000, 52]; INDEX33555468(TEST_LG2); btr_scan(1)
19                      #PRJT2: [12, 1, 52]; exp_num(2), is_atom(FALSE)
20                        #SLCT2: [12, 1, 52]; 1 > 5
21                          #CSCN2: [12, 100000, 52]; INDEX33555469(TEST_LG3); btr_scan(1)
22                  #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
23                    #SLCT2: [12, 125, 52]; (exp_cast(TEST_LG4.B4) < 5 AND TEST_LG4.A4 = 1)
24                      #CSCN2: [12, 100000, 52]; INDEX33555470(TEST_LG4); btr_scan(1)
25          #PRJT2: [55, 27, 52]; exp_num(2), is_atom(FALSE)
26            #PRJT2: [55, 27, 52]; exp_num(2), is_atom(FALSE)
27              #DISTINCT: [55, 27, 52]
28                #UNION ALL: [54, 2751, 52]
29                  #PRJT2: [40, 2626, 52]; exp_num(2), is_atom(FALSE)
30                    #UNION ALL: [40, 2626, 52]
31                      #PRJT2: [26, 2625, 52]; exp_num(2), is_atom(FALSE)
32                        #UNION ALL: [26, 2625, 52]
33                          #PRJT2: [12, 2500, 52]; exp_num(2), is_atom(FALSE)
34                            #SLCT2: [12, 2500, 52]; TEST_LG1.A1 = 1
35                              #CSCN2: [12, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
36                          #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
37                            #SLCT2: [12, 125, 52]; (TEST_LG2.A2 = 1 AND exp_cast(TEST_LG2.B2) = 2)
38                              #CSCN2: [12, 100000, 52]; INDEX33555468(TEST_LG2); btr_scan(1)
39                      #PRJT2: [12, 1, 52]; exp_num(2), is_atom(FALSE)
40                        #SLCT2: [12, 1, 52]; 1 > 5
41                          #CSCN2: [12, 100000, 52]; INDEX33555469(TEST_LG3); btr_scan(1)
42                  #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
43                    #SLCT2: [12, 125, 52]; (exp_cast(TEST_LG4.B4) < 5 AND TEST_LG4.A4 = 1)
44                      #CSCN2: [12, 100000, 52]; INDEX33555470(TEST_LG4); btr_scan(1)
```

 可以看到 `TEST_LG3` 是没有被裁剪的，再看此 SQL 的执行计划
```sql
select
  /*+view_filter_merging(2) complex_view_merging(0)*/
  *
from
  ( select * from v_test_lg ) t
where
  t.a = 1;
```
```txt
1   #NSET2: [41, 27, 52]
2     #PRJT2: [41, 27, 52]; exp_num(2), is_atom(FALSE)
3       #PRJT2: [41, 27, 52]; exp_num(2), is_atom(FALSE)
4         #DISTINCT: [41, 27, 52]
5           #UNION ALL: [40, 2750, 52]
6             #PRJT2: [26, 2625, 52]; exp_num(2), is_atom(FALSE)
7               #PRJT2: [26, 2625, 52]; exp_num(2), is_atom(FALSE)
8                 #UNION ALL: [26, 2625, 52]
9                   #PRJT2: [12, 2500, 52]; exp_num(2), is_atom(FALSE)
10                    #SLCT2: [12, 2500, 52]; TEST_LG1.A1 = 1
11                      #CSCN2: [12, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
12                  #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
13                    #SLCT2: [12, 125, 52]; (TEST_LG2.A2 = 1 AND exp_cast(TEST_LG2.B2) = 2)
14                      #CSCN2: [12, 100000, 52]; INDEX33555468(TEST_LG2); btr_scan(1)
15            #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
16              #SLCT2: [12, 125, 52]; (TEST_LG4.A4 = 1 AND exp_cast(TEST_LG4.B4) < 5)
17                #CSCN2: [12, 100000, 52]; INDEX33555470(TEST_LG4); btr_scan(1)
```
此时 `TEST_LG3` 是被裁剪的。
可以说明，**如果 `V_TEST_LG` 被查询多次之后，没有办法进行视图合并。**

* 过滤条件为复杂表达式时，无法合并视图

查看以下 SQL 的执行计划
```sql
select
  /*+view_filter_merging(2) complex_view_merging(0)*/
  *
from
  (
    select
      *
    from
      v_test_lg
  ) t
where
  t.a || '1' || t.b = '111';
```
```txt
1   #NSET2: [54, 3, 52]
2     #PRJT2: [54, 3, 52]; exp_num(2), is_atom(FALSE)
3       #PRJT2: [54, 3, 52]; exp_num(2), is_atom(FALSE)
4         #DISTINCT: [54, 3, 52]
5           #UNION ALL: [53, 315, 52]
6             #PRJT2: [39, 190, 52]; exp_num(2), is_atom(FALSE)
7               #UNION ALL: [39, 190, 52]
8                 #PRJT2: [26, 65, 52]; exp_num(2), is_atom(FALSE)
9                   #UNION ALL: [26, 65, 52]
10                    #PRJT2: [12, 62, 52]; exp_num(2), is_atom(FALSE)
11                      #SLCT2: [12, 62, 52]; (TEST_LG1.A1 = 1 AND var3 || TEST_LG1.B1 = '111')
12                        #CSCN2: [12, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
13                    #PRJT2: [12, 3, 52]; exp_num(2), is_atom(FALSE)
14                      #SLCT2: [12, 3, 52]; (TEST_LG2.A2 = 1 AND var6 || TEST_LG2.B2 = '111' AND exp_cast(TEST_LG2.B2) = 2)
15                        #CSCN2: [12, 100000, 52]; INDEX33555468(TEST_LG2); btr_scan(1)
16                #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
17                  #SLCT2: [12, 125, 52]; (TEST_LG3.A3 > 5 AND exp_cast(exp_cast(TEST_LG3.A3) || '1') || TEST_LG3.B3 = '111')
18                    #CSCN2: [12, 100000, 52]; INDEX33555469(TEST_LG3); btr_scan(1)
19            #PRJT2: [12, 125, 52]; exp_num(2), is_atom(FALSE)
20              #SLCT2: [12, 125, 52]; (exp_cast(TEST_LG4.B4) < 5 AND exp_cast(exp_cast(TEST_LG4.A4) || '1') || TEST_LG4.B4 = '111')
21                #CSCN2: [12, 100000, 52]; INDEX33555470(TEST_LG4); btr_scan(1)
```
此时 `TEST_LG3` 也没有进行裁剪。

### 值为 4

视图包含分析函数时，如果分析函数的 `partition by` 具有唯一性，则外层过滤条件会下推到视图内部。

为了确保分析函数的 `partition by` 具有唯一性，给 `test_lg1` 建立一条唯一索引
```sql
create unique index idx_test_lg1_a1 on test_lg1(a1);
```
再看一下这条 SQL 的执行计划
```sql
select
  *
from
  (
    select
      b1,
      row_number() over (
        partition by a1
        order by
          b1
      ) aa
    from
      test_lg1
    where
      b1 < '10'
  )
where
  b1 > '1';
```

`view_filter_merging = 4` 的执行计划为
```txt
1   #NSET2: [12, 3750, 64]
2     #PRJT2: [12, 3750, 64]; exp_num(3), is_atom(FALSE)
3       #PRJT2: [12, 3750, 64]; exp_num(3), is_atom(FALSE)
4         #AFUN: [12, 3750, 64]; afun_num(1); partition_num(1)[TEST_LG1.A1]; order_num(1)[TEST_LG1.B1]
5           #SORT3: [12, 3750, 64]; key_num(2), partition_key_num(0), is_distinct(FALSE), top_flag(0), is_adaptive(0)
6             #SLCT2: [12, 3750, 64]; (TEST_LG1.B1 < '10' AND TEST_LG1.B1 > '1')
7               #CSCN2: [12, 100000, 64]; INDEX33555467(TEST_LG1); btr_scan(1)
```

`view_filter_merging = 0` 的执行计划为
```txt
1   #NSET2: [13, 250, 64]
2     #PRJT2: [13, 250, 64]; exp_num(3), is_atom(FALSE)
3       #SLCT2: [13, 250, 64]; DMTEMPVIEW_889193519.B1 > '1'
4         #PRJT2: [12, 5000, 64]; exp_num(3), is_atom(FALSE)
5           #AFUN: [12, 5000, 64]; afun_num(1); partition_num(1)[TEST_LG1.A1]; order_num(1)[TEST_LG1.B1]
6             #SORT3: [12, 5000, 64]; key_num(2), partition_key_num(0), is_distinct(FALSE), top_flag(0), is_adaptive(0)
7               #SLCT2: [12, 5000, 64]; TEST_LG1.B1 < '10'
8                 #CSCN2: [12, 100000, 64]; INDEX33555467(TEST_LG1); btr_scan(1)
```

其实可以看到，`view_filter_merging = 0` 的执行计划多了一个 `SLCT2` 操作符，所以说，当 `view_filter_merging = 4` 的时候，条件是可以下推的，以此来减少数据页扫描的数量。

### 值为 8

如果派生表存在集函数，则不进行条件下推优化。

查看以下 SQL 的执行计划
```sql
select * from ( select max(c1),1 x from t1 ) t where x > 5;
```

`view_filter_merging(0)` 的执行计划为
```txt
1   #NSET2: [1, 1, 4]
2     #PRJT2: [1, 1, 4]; exp_num(2), is_atom(FALSE)
3       #PRJT2: [1, 1, 4]; exp_num(2), is_atom(FALSE)
4         #AAGR2: [1, 1, 4]; grp_num(0), sfun_num(1), distinct_flag[0]; slave_empty(0)
5           #SLCT2: [1, 1, 4];  FALSE
6             #CSCN2: [1, 1, 4]; INDEX33555472(T1); btr_scan(1)
```
此时的 `SLCT2` 操作符很明显下推到了派生表中，他在 `PRJT2` 操作符下面。

`view_filter_merging(8)` 的执行计划为
```txt
1   #NSET2: [1, 1, 4]
2     #PRJT2: [1, 1, 4]; exp_num(2), is_atom(FALSE)
3       #SLCT2: [1, 1, 4]; T.X > 5
4         #PRJT2: [1, 1, 4]; exp_num(2), is_atom(FALSE)
5           #AAGR2: [1, 1, 4]; grp_num(0), sfun_num(1), distinct_flag[0]; slave_empty(0)
6             #CSCN2: [1, 1, 4]; INDEX33555472(T1); btr_scan(1)
```
此时的 `SLCT2` 操作符在 `PRJT2` 操作符上面，所以是没有下推行为的。

### 值为 16

- [ ] 文档例子有问题

收集公用表达式相关的所有过滤条件，改写合并所有条件，并下放到公用表达式的内部。

### 值为 32

`TOP` 信息下推到派生表。

### 值为 64

- [ ] 文档例子有问题

外层布尔表达式隐式声明 `IS NOT NULL` 属性，对派生表/视图对应的列显示添加 `COL IS NOT NULL` 布尔表达式。

### 值为 128

外层 `ROWNUM` 过滤表达式尝试下放至视图/派生表生成 `TOP` 子句。
查看以下 SQL 的执行计划
```sql
select
  *
from
  (
    select
      *,
      rownum rn
    from
      test_lg1
    order by
      a1
  )
where
  rn < 10;
```

`VIEW_FILTER_MERGING = 0` 时的计划
```txt
1   #NSET2: [15, 5000, 64]
2     #PRJT2: [15, 5000, 64]; exp_num(4), is_atom(FALSE)
3       #SLCT2: [15, 5000, 64]; DMTEMPVIEW_889193477.RN < var1
4         #PRJT2: [11, 100000, 64]; exp_num(4), is_atom(FALSE)
5           #RN: [11, 100000, 64]
6             #BLKUP2: [11, 100000, 64]; IDX_TEST_LG1_A1(TEST_LG1)
7               #SSCN: [11, 100000, 64]; IDX_TEST_LG1_A1(TEST_LG1); btr_scan(1); is_global(0)
```

`VIEW_FILTER_MERGING = 128` 时的计划
```txt
1   #NSET2: [12, 9, 64]
2     #PRJT2: [12, 9, 64]; exp_num(4), is_atom(FALSE)
3       #PRJT2: [12, 9, 64]; exp_num(4), is_atom(FALSE)
4         #TOPN2: [11, 9, 64]; top_num(9)
5           #RN: [11, 100000, 64]
6             #BLKUP2: [11, 100000, 64]; IDX_TEST_LG1_A1(TEST_LG1)
7               #SSCN: [11, 100000, 64]; IDX_TEST_LG1_A1(TEST_LG1); btr_scan(1); is_global(0)
```

对比计划可以发现，将 `SLCT2` 操作符改为了 `TOPN2`，并且下放到了 `PRJT2` 里面。

### 值为 256

- [ ] 文档例子有问题

当满足以下条件时，对相关派生表过滤条件进行下推优化：
* 过滤条件对应派生表的查询项，并且是查询表达式；
* 过滤条件列映射为查询表达式的引用列，并且引用列来自派生表的 `FROM` 项；

### 值为 512

视图已经有过滤条件的，不重复下放，为了后续能使用 `htab`。

### 值为 1024

包含该值时，取消下述限制：
* 视图是集合运算时的分支数应小于 10；
* 若视图是集合运算且超过 2 个分支时，过滤条件不能含有复杂函数/表达式；

查看以下 SQL 执行计划
```sql
select
  /*+view_filter_merging(0)*/
  *
from
  (
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
    union all
    select * from test_lg1
  )
where
  a1 > 1;
```

`VIEW_FILTER_MERGING = 0` 的执行计划为
```txt
1   #NSET2: [850, 50000, 52]
2     #PRJT2: [850, 50000, 52]; exp_num(2), is_atom(FALSE)
3       #SLCT2: [850, 50000, 52]; DMTEMPVIEW_889193563.A1 > 1
4         #PRJT2: [817, 1000000, 52]; exp_num(2), is_atom(FALSE)
5           #UNION ALL: [817, 1000000, 52]
6             #PRJT2: [671, 900000, 52]; exp_num(2), is_atom(FALSE)
7               #UNION ALL: [671, 900000, 52]
8                 #PRJT2: [539, 800000, 52]; exp_num(2), is_atom(FALSE)
9                   #UNION ALL: [539, 800000, 52]
10                    #PRJT2: [422, 700000, 52]; exp_num(2), is_atom(FALSE)
11                      #UNION ALL: [422, 700000, 52]
12                        #PRJT2: [318, 600000, 52]; exp_num(2), is_atom(FALSE)
13                          #UNION ALL: [318, 600000, 52]
14                            #PRJT2: [229, 500000, 52]; exp_num(2), is_atom(FALSE)
15                              #UNION ALL: [229, 500000, 52]
16                                #PRJT2: [154, 400000, 52]; exp_num(2), is_atom(FALSE)
17                                  #UNION ALL: [154, 400000, 52]
18                                    #PRJT2: [92, 300000, 52]; exp_num(2), is_atom(FALSE)
19                                      #UNION ALL: [92, 300000, 52]
20                                        #PRJT2: [45, 200000, 52]; exp_num(2), is_atom(FALSE)
21                                          #UNION ALL: [45, 200000, 52]
22                                            #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
23                                              #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
24                                            #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
25                                              #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
26                                        #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
27                                          #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
28                                    #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
29                                      #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
30                                #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
31                                  #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
32                            #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
33                              #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
34                        #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
35                          #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
36                    #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
37                      #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
38                #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
39                  #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
40            #PRJT2: [11, 100000, 52]; exp_num(2), is_atom(FALSE)
41              #CSCN2: [11, 100000, 52]; INDEX33555467(TEST_LG1); btr_scan(1)
```
可以看出来，`SLCT2` 在 `PRJT2` 外层，也就是条件并没有下放。

`VIEW_FILTER_MERGING = 1024` 的执行计划为
```txt
1   #NSET2: [93, 50000, 52]
2     #PRJT2: [93, 50000, 52]; exp_num(2), is_atom(FALSE)
3       #PRJT2: [93, 50000, 52]; exp_num(2), is_atom(FALSE)
4         #UNION ALL: [93, 50000, 52]
5           #PRJT2: [80, 45000, 52]; exp_num(2), is_atom(FALSE)
6             #UNION ALL: [80, 45000, 52]
7               #PRJT2: [68, 40000, 52]; exp_num(2), is_atom(FALSE)
8                 #UNION ALL: [68, 40000, 52]
9                   #PRJT2: [57, 35000, 52]; exp_num(2), is_atom(FALSE)
10                    #UNION ALL: [57, 35000, 52]
11                      #PRJT2: [47, 30000, 52]; exp_num(2), is_atom(FALSE)
12                        #UNION ALL: [47, 30000, 52]
13                          #PRJT2: [37, 25000, 52]; exp_num(2), is_atom(FALSE)
14                            #UNION ALL: [37, 25000, 52]
15                              #PRJT2: [28, 20000, 52]; exp_num(2), is_atom(FALSE)
16                                #UNION ALL: [28, 20000, 52]
17                                  #PRJT2: [19, 15000, 52]; exp_num(2), is_atom(FALSE)
18                                    #UNION ALL: [19, 15000, 52]
19                                      #PRJT2: [12, 10000, 52]; exp_num(2), is_atom(FALSE)
20                                        #UNION ALL: [12, 10000, 52]
21                                          #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
22                                            #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
23                                              #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
24                                          #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
25                                            #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
26                                              #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
27                                      #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
28                                        #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
29                                          #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
30                                  #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
31                                    #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
32                                      #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
33                              #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
34                                #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
35                                  #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
36                          #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
37                            #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
38                              #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
39                      #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
40                        #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
41                          #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
42                  #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
43                    #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
44                      #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
45              #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
46                #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
47                  #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
48          #PRJT2: [5, 5000, 52]; exp_num(2), is_atom(FALSE)
49            #BLKUP2: [5, 5000, 52]; IDX_TEST_LG1_A1(TEST_LG1)
50              #SSEK2: [5, 5000, 52]; scan_type(ASC), IDX_TEST_LG1_A1(TEST_LG1), scan_range(1,max], is_global(0)
```
这就可以看到 `SLCT2` 被下放到每一个查询里面，变成了索引范围查询了。
