# 单机在线转主备集群

目前版本（2025 年第一季度版本 - 8.1.4.80）已经支持单机在线转变为主备集群。

## 端口规划

主库的实例名为 `DM01`，备库的实例名为 `DM02`。

|实例名|MAL_HOST    |PORT_NUM|MAL_INST_DW_PORT|MAL_PORT|MAL_DW_PORT|
|-----|------------|--------|----------------|--------|-----------|
|DM01 |10.76.11.205|65237   |65337           |65437   |65537      |
|DM02 |10.76.11.205|65238   |65338           |65438   |65538      |

## 安装单机

初始化单机实例：

```bash
./dminit path=data instance_name=DM01 db_name=DM01 port_num=65237 page_size=32 extent_size=32 log_size=2048 SYSDBA_PWD=DMDBA_hust4400 SYSAUDITOR_PWD=DMDBA_hust4400
```

使用 `normal/open` 状态启动单机实例：

```bash
./dmserver data/DM01/dm.ini
```

如出现以下截图即代表启动成功：

![单机实例启动成功](/database/single-machine-online-to-master-slave-01.png)

## 开启归档

正常安装的时候都会开启归档，所以在这里，我们模拟正常运行过一段时间的单机实例，将归档也打开。

执行如下命令：

```sql
--开启归档：
alter database mount;
alter database archivelog;
alter database add archivelog 'TYPE=LOCAL,DEST=/data/DM01/arch,FILE_SIZE=2048,SPACE_LIMIT=102400';
alter database open;
```

## 启动 jmeter

使一个 insert 语句循环执行，用来判断搭建主备的时候，单机数据库是否正常对外服务，可以正常连接、正常执行 SQL。

先创建表结构：

```sql
CREATE TABLE TEST_LG ( A1 INT, A2 VARCHAR(255), A3 CLOB );
```

建立 jmeter 的 workflow，如图下所示：

![jmeter workflow](/database/single-machine-online-to-master-slave-02.png)

## 联机备份

与离线操作相同，在线操作也需要备份还原一个备库。

联机备份的操作如下：

```sql
BACKUP DATABASE FULL BACKUPSET 'FULL_BAK_20250706' COMPRESSED LEVEL 1 PARALLEL 4;
```

## 新建实例并还原

我们需要还原一个实例作为备库。

操作如下：

```bash
## 先初始化实例
./dminit path=data instance_name=DM02 db_name=DM02 port_num=65238 page_size=32 extent_size=32 log_size=2048 SYSDBA_PWD=DMDBA_hust4400 SYSAUDITOR_PWD=DMDBA_hust4400

## 备份还原
./dmrman CTLSTMT="RESTORE DATABASE '/data/DM02/dm.ini' FROM BACKUPSET '/data/DM02/bak/FULL_BAK_20250706'"
./dmrman CTLSTMT="RECOVER DATABASE '/data/DM02/dm.ini' FROM BACKUPSET '/data/DM02/bak/FULL_BAK_20250706'"
./dmrman CTLSTMT="RECOVER DATABASE '/data/DM02/dm.ini' UPDATE DB_MAGIC"
```

## 在线添加 dmmal

需要将单机实例与备份实例连接起来，就需要在线添加 dmmal 通讯。

```sql
SP_SET_PARA_VALUE(1,'MAL_INI',1);
SF_MAL_CONFIG(1,0);
SF_MAL_INST_ADD('MAL_INST1','DM01','10.76.11.205',65437,'10.76.11.205',65237,65537,0,65337);
SF_MAL_INST_ADD('MAL_INST2','DM02','10.76.11.205',65438,'10.76.11.205',65238,65538,0,65338);
SF_MAL_CONFIG_APPLY();
SF_MAL_CONFIG(0,0);
```
