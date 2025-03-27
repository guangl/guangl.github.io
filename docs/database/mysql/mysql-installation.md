---
aliases: [mysql 安装]
create_time: 2024-03-03 18:04:40
linter-yaml-title-alias: mysql 安装
title: mysql 安装
update_time: 2024-11-03 10:35:37
---

安装 mysql 8.0.35

## 下载依赖

```bash
# 下载 yum 源
wget https://repo.mysql.com//mysql80-community-release-el8-9.noarch.rpm
yum module -y disable mysql
# 安装 rpm 源
rpm -ivh mysql80-community-release-el8-9.noarch.rpm

# 安装 mysql-community-server
dnf install mysql-community-server -y

# 启动 mysql
systemctl start mysqld
systemctl enable mysqld

# 第一次查询 mysql root 初始密码
grep 'temporary password' /var/log/mysqld.log
```

## 初始化设置

```sql
-- 修改密码（必须包含大写、小写、特殊符号）
alter user 'root'@'localhost' identified by 'DMDBA_hust4400';

-- 安装验证插件，可以不用包含大写、小写、特殊符号。
install plugin validate_password soname 'validate_password.so';
-- 验证是否启用验证插件
select plugin_name, plugin_status from information_schema.plugins where plugin_name = 'validate_password';

-- 查询 validate_password 策略
show variables like 'validate_password%';
-- 设置 validate_password 策略
set global validate_password.policy = 0;
set global validate_password.length = 0;
set global validate_password.check_user_name = 0;

-- 修改 root 密码
alter user 'root'@'localhost' identified by 'root';

-- 创建表空间
create tablespace ts_test add datafile 'test.ibd' engine=innodb;
-- 创建可在任何地方访问的用户
create user 'test'@'%' identified by 'test';
-- 创建数据库
create database testdb;
-- 授予 test 上所有权限给 test 用户
grant all privileges on testdb.* to 'test'@'%';
-- 刷新权限
flush privileges;
```
