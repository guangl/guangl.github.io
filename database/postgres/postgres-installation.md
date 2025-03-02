---
aliases: [postgres 安装]
create_time: 2024-03-03 18:04:38
linter-yaml-title-alias: postgres 安装
title: postgres 安装
update_time: 2025-01-26 21:12:01
---

## 安装

在 red hat family 中安装 postgres-16

```bash
dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

dnf -qy module disable postgresql

dnf install -y postgresql16-server

/usr/pgsql-16/bin/postgresql-16-setup initdb

systemctl enable postgresql-16
systemctl start postgresql-16
```

## 创建 Test 角色

```sql
-- 在 postgres 创建角色，角色无法登录
CREATE ROLE TEST;

-- 将 test 具有 login 权限
ALTER ROLE TEST LOGIN;
-- 将 superuser 的权限赋权给 test
ALTER ROLE TEST SUPERUSER;

-- 创建 TESTDB 数据库
CREATE DATABASE TESTDB OWNER TEST;

-- 修改 TEST 密码
ALTER USER TEST WITH PASSWORD 'TEST';
```

### 使 Test 用户可以远程登录

将 pg_hba.conf 中增加一行：

```txt
host testdb test 0.0.0.0/0 password
```

可使 test 以及 testdb 远程登录。

### 配置归档

```sql
-- 查询是否开启归档
SHOW ARCHIVE_MODE;

-- 开启归档
alter system set wal_level = replica;
alter system set archive_mode = on;
alter system set archive_command = 'cp %p /var/lib/pgsql/16/data/pg_arch/%f';
```

执行之后需要重启数据库。
