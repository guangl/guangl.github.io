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

## 在线添加 `dmmal`

需要将单机实例与备份实例连接起来，就需要在线添加 `dmmal` 通讯。

```sql
CALL SF_MAL_INST_ADD_APPLY('MAL_INST','DM01','10.76.11.205',65437,'10.76.11.205',65237,65137,0,65337);
CALL SF_MAL_INST_ADD_APPLY('MAL_INST1','DM02','10.76.11.205',65438,'10.76.11.205',65238,65138,0,65338);
CALL SP_SET_PARA_VALUE(1,'MAL_INI',1);
```

出现以下截图则代表操作成功：

![add dmmal setting successfully](/database/single-machine-online-to-master-slave-03.png)


## 添加 `REALTIME` 归档

将 `DM01` 的归档发送到 `DM02` 去，需要在 `DM01` 上配置 `DM02` 的 `REALTIME` 归档。
命令可以在 normal/open 状态下执行。

```sql
ALTER DATABASE ADD ARCHIVELOG 'TYPE=REALTIME,DEST=DM02';
```

## 修改新实例的配置文件

需要修改四个文件。

### dm.ini

修改原来的文件即可。

```ini
MAL_INI = 1
ARCH_INI = 1
```

### dmmal.ini

需要在实例目录新建文件，文件内容如下：

```ini
#DaMeng Database Mail Configuration file
#this is comments
MAL_CHECK_INTERVAL     = 30
MAL_COMBIN_BUF_SIZE    = 0
MAL_SEND_THRESHOLD = 2048
MAL_CONN_FAIL_INTERVAL = 10
MAL_LOGIN_TIMEOUT      = 15
MAL_BUF_SIZE           = 100
MAL_SYS_BUF_SIZE       = 0
MAL_VPOOL_SIZE         = 128
MAL_COMPRESS_LEVEL     = 0
MAL_TEMP_PATH          =

[MAL_INST]
    MAL_INST_NAME    = DM01
    MAL_HOST         = 10.76.11.205
    MAL_PORT         = 65437
    MAL_INST_HOST    = 10.76.11.205
    MAL_INST_PORT    = 65237
    MAL_DW_PORT      = 65137
    MAL_LINK_MAGIC   = 0
    MAL_INST_DW_PORT = 65337

[MAL_INST1]
    MAL_INST_NAME    = DM02
    MAL_HOST         = 10.76.11.205
    MAL_PORT         = 65438
    MAL_INST_HOST    = 10.76.11.205
    MAL_INST_PORT    = 65238
    MAL_DW_PORT      = 65138
    MAL_LINK_MAGIC   = 0
    MAL_INST_DW_PORT = 65338
```

### dmarch.ini

需要在实例目录新建文件，文件内容如下：

```ini
#DaMeng Database Archive Configuration file
#this is comments

        ARCH_WAIT_APPLY      = 0

[ARCHIVE_LOCAL1]
        ARCH_TYPE            = LOCAL
        ARCH_DEST            = /data/hbtest/lg/bin_4_80/data/DM02/arch
        ARCH_FILE_SIZE       = 2048
        ARCH_SPACE_LIMIT     = 102400
        ARCH_FLUSH_BUF_SIZE  = 2
        ARCH_HANG_FLAG       = 1
```

### dmwatcher.ini

需要在实例目录新建文件，文件内容如下：

```ini
[DM01]
DW_TYPE = GLOBAL
DW_MODE = AUTO
DW_ERROR_TIME = 10
INST_RECOVER_TIME = 60
INST_ERROR_TIME = 10
INST_OGUID = 20250708
INST_INI = /data/hbtest/lg/bin_4_80/data/DM02/dm.ini
INST_AUTO_RESTART = 1
INST_STARTUP_CMD = /data/hbtest/lg/bin_4_80/dmserver
RLOG_SEND_THRESHOLD = 0
RLOG_APPLY_THRESHOLD = 0
```

## 使用 `mount` 状态启动新实例

命令如下：

```bash
./dmserver /data/hbtest/lg/bin_4_80/data/DM02/dm.ini mount
```

## 修改新实例 `oguid` 以及数据库状态

命令如下：

```bash
## 登录实例
./disql SYSDBA/DMDBA_hust4400@127.0.0.1:65238

## 修改 oguid, 数据库状态
alter database standby;
sp_set_oguid(20250708);
```
## 旧实例新增 `dmwatcher`

在旧实例的实例目录中创建 `dmwatcher.ini` 文件，文件内容如下：

```ini
[DM01]
DW_TYPE = GLOBAL
DW_MODE = AUTO
DW_ERROR_TIME = 10
INST_RECOVER_TIME = 60
INST_ERROR_TIME = 10
INST_OGUID = 20250708
INST_INI = /data/hbtest/lg/bin_4_80/data/DM02/dm.ini
INST_AUTO_RESTART = 1
INST_STARTUP_CMD = /data/hbtest/lg/bin_4_80/dmserver
RLOG_SEND_THRESHOLD = 0
RLOG_APPLY_THRESHOLD = 0
```

## 修改旧实例的 `oguid` 以及数据库状态

命令如下：

```sql
alter database primary force;
sp_set_oguid(20250708);
```

## 启动新旧实例的 `dmwatcher`

命令如下：

```bash
./dmwatcher /data/hbtest/lg/bin_4_80/data/DM01/dmwatcher.ini
./dmwatcher /data/hbtest/lg/bin_4_80/data/DM02/dmwatcher.ini
```

## 查看 `dmmonitor`

见到如下截图，则代表搭建成功。

![dmmonitor](/database/single-machine-online-to-master-slave-04.png)