---
aliases: [dm 线程]
create_time: 2024-03-03 18:04:50
linter-yaml-title-alias: dm 线程
title: dm 线程
update_time: 2025-02-04 11:25:40
---

DM 在启动时会创建所有的线程。线程类型如下：

* dm_dpc_pthd
* dm_sqllog_thd
* dm_audit_thd
* dm_rsyswrk_thd
* dm_io_thd
* dm_hio_thd
* dm_wrkgrp_thd
* dm_purge_thd
* dm_sql_thd
* dm_sql_aux_thd
* dm_tskwrk_thd
* dm_trctsk_thd
* dm_redolog_thd
* dm_lsnr_thd
* dm_sched_thd
* dm_chkpnt_thd
* dm_quit_thd

此类型为单机所拥有，集群以后在下补充。

## dm_dpc_pthd

DPC 的工作线程，但是不知道为什么单机也会出现，应该是数据库架构问题。

创建此线程的堆栈如下：

```txt
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000703cbc in os_event2_wait ()
#2  0x0000000001c68fcd in uevent_wait ()
#3  0x00000000025c782e in pthd_worker_thread ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_sqllog_thd

flush sqllog 的线程，但是并没有打开 SVR_LOG，一样出现了此线程，说明数据库架构有问题。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b4898 in pthread_cond_timedwait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000703bcf in os_event2_wait_timeout ()
#2  0x0000000001e07c45 in slog_flush_thread ()
#3  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#4  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_audit_thd

flush audit log（审计）的线程，但是并没有打开审计功能，一样出现了此线程，说明数据库架构有问题。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000703cbc in os_event2_wait ()
#2  0x0000000001c68fcd in uevent_wait ()
#3  0x0000000001acfb03 in aud_tsk_check ()
#4  0x0000000001acf84b in aud_flush_thread ()
#5  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#6  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_rsyswrk_thd

异步归档线程，主要负责将任务队列中的任务，按照归档类型进行相应的归档处理，一般由日志 flush 线程触发。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000717a62 in os_semaphore_p ()
#2  0x0000000001b0690c in rtsk_queue_check ()
#3  0x0000000001b02e5b in rsys_work_thread ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_io_thd

* `IO_THR_GROUPS` 控制线程数量；
* 默认值：8；
* 取值范围：1~512；

通常情况下，DM 需要进行 IO 操作的时机主要有以下三种：

1. 需要处理的数据页不在缓冲区中，此时需要将相关数据页读入缓冲区；
2. 缓冲区满或系统关闭时，此时需要将部分脏数据页写入磁盘；
3. 检查点到来时，需要将所有脏数据页写入磁盘。

IO 线程在启动后，通常都处于睡眠状态，当系统需要进行 IO 时，只需要发出一个 IO 请求，此时 IO 线程被唤醒以处理该请求，在完成该 IO 操作后继续进入睡眠状态。

同时，IO 线程处理 IO 的策略根据操作系统平台的不同会有很大差别，一般情况下，IO 线程使用 异步 IO 将数据页写入磁盘，此时，系统将所有的 IO 请求直接递交给操作系统，操作系统在完成这些请求后才通知 IO 线程，这种异步 IO 的方式使得 IO 线程需要直接处理的任务很简单，即完成 IO 后的一些收尾处理并发出 IO 完成通知。

> [!NOTE]
> 如果操作系统不支持异步 IO，此时 IO 线程就需要完成同步 IO 操作。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000717a62 in os_semaphore_p ()
#2  0x000000000071280a in os_io_thread_sema ()
#3  0x0000000000712fb4 in os_io_thread ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_hio_thd

读取 HFS 相关的 IO 操作，比如 HUGE 表的读取。

* `HIO_THR_GROUPS` 控制线程数量；
* 默认值：2；
* 取值范围：1~512；

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000717a62 in os_semaphore_p ()
#2  0x0000000001cab30a in hio_thread_sema ()
#3  0x0000000001cab926 in hio_thread ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_wrkgrp_thd

用户工作线程。

* `WORKER_THREADS` 控制线程数量；
* 默认值：8；
* 取值范围：1~64；

工作线程是 DM 服务器的核心线程，它从任务队列中取出任务，并根据任务的类型进行相应的处理，负责所有实际的数据相关操作。

DM8 的初始工作线程个数由配置文件指定，随着会话连接的增加，工作线程也会同步增加，以保持每个会话都有专门的工作线程处理请求。为了保证用户所有请求及时响应，一个会话上的任务全部由同一个工作线程完成，这样减少了线程切换的代价，提高了系统效率。
当会话连接超过预设的阀值时，工作线程数目不再增加，转而由会话轮询线程接收所有用户请求，加入任务队列，等待工作线程一旦空闲，从任务队列（有歧义，应该是工作线程的任务队列）依次摘取请求任务处理。

创建此线程的堆栈如下：

```md
#0  0x00007ffff6dea3b1 in poll () from /lib64/libc.so
#1  0x0000000001c68ab2 in iocp_queue_check ()
#2  0x0000000001c6aeb6 in uthr_master_for_os ()
#3  0x0000000001c6af89 in uthr_worker_thread ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

通过堆栈可以看出应该是会创建一个 `iocp_queue` 的队列。

## dm_purge_thd

purge 线程。主要负责回滚段的清理

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b4898 in pthread_cond_timedwait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000703bcf in os_event2_wait_timeout ()
#2  0x0000000000bfec30 in purg2_thread ()
#3  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#4  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_sql_thd

用户会话线程。

创建此线程的堆栈如下：

```md
#0  0x00007ffff6dea3b1 in poll () from /lib64/libc.so
#1  0x0000000000915d86 in viosocket_poll ()
#2  0x0000000000cb657f in sess4_msg_recv ()
#3  0x0000000001c6c1f4 in uthr_db_main_for_sess ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_sql_aux_thd

用户会话辅助线程。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000703cbc in os_event2_wait ()
#2  0x0000000000cb923e in sess4_aux_tsk_check ()
#3  0x0000000000cb9509 in sess4_aux_tsk_thread ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_tskwrk_thd

任务工作线程用于 SQL 解析和执行 sevrer 本身。

* `TASK_THREADS` 控制线程数量；
* 默认值为 8；
* 取值范围：1~1000；

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000717a62 in os_semaphore_p ()
#2  0x0000000001dba790 in ntsk_queue_check ()
#3  0x0000000001df0d7d in ntsk_worker_thread ()
#4  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#5  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

通过堆栈可以看出应该是会创建一个 `ntsk_queue` 的队列。

## dm_trctsk_thd

写入 trace 信息的线程。主要负责数据库告警跟踪信息写入告警日志文件中。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000717a62 in os_semaphore_p ()
#2  0x0000000001cf9290 in trc_task_thread ()
#3  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#4  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_redolog_thd

redo log 的线程，用于 flush 日志。

任何对数据库的修改，都会产生重做 redo 日志，为了保证数据恢复的一致性，redo 日志的刷盘必须在数据也刷盘之前进行。事务运行时，会把生成的 redo 日志保留在日志缓冲区中，当事务提交或者执行检查点时，会通知 redo log 线程进行日志刷盘。由于日志具备顺序写入的特点，比数据页分散 IO 写入效率更高。redo log 线程和 IO 线程分开，能获得更快的响应速度，保证整体的性能。
在刷盘之前，对不同缓冲区内的日志进行合并，减少了 IO 次数，进一步提高了性能。

如果系统配置了实时归档，在 redo log 线程日志刷盘前，会直接将日志通过网络发送到实时备库。如果配置了本地归档，则生成归档任务，通过日志归档线程完成。

> [!NOTE]
> send redo_pkg 的动作是由 dm_redolog_thd 线程完成。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b4898 in pthread_cond_timedwait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000703bcf in os_event2_wait_timeout ()
#2  0x00000000007bcff6 in rlog4_flush_thread ()
#3  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#4  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_lsnr_thd

服务监听线程。

监听线程主要的任务是在服务器端口上进行循环监听，一旦有来自客户的连接请求，监听线程被唤醒并生成一个会话申请任务，加入工作线程的任务队列 `iocp_queue`，等待工作线程进行处理。
它在系统启动完成后才启动，并且在系统关闭时首先被关闭。为了保证在处理大量客户连接时系统具有较短的响应时间，监听线程比普通线程优先级更高。

DM 服务器所有配置端口的范围为 1024-65534。当客户端工具发起连接时，由操作系统为客户端工具自动分配一个端口用于与 DM 服务器进行通信。

创建此线程的堆栈如下：

```md
#0  0x00007ffff6decaef in select () from /lib64/libc.so
#1  0x0000000001d96a7a in nsvr_lsnr_thread ()
#2  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#3  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_sched_thd

服务器调度线程，用于触发后台检查点、与时间相关的触发器。

调度线程用于接管系统中所有需要定时调度的任务。调度线程每秒钟轮询一次，负责的任务有以下一些：

1. 检查系统级的时间触发器，如果满足触发条件则生成任务加到工作线程的任务队列由工作线程执行；
2. 清理 SQL 缓存、计划缓存中失效的项，或者超出缓存限制后淘汰不常用的缓存项；
3. 执行动态缓冲区检查。根据需要动态扩展或动态收缩系统缓冲池；
4. 自动执行检查点。为了保证日志的及时刷盘，减少系统故障时恢复时间，根据 INI 参数设置的自动检查点执行间隔定期执行检查点操作；
5. 会话超时检测。当客户连接设置了连接超时时，定期检测是否超时，如果超时则自动断开连接；
6. 必要时执行数据更新页刷盘；
7. 唤醒等待的工作线程；

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b81d0 in nanosleep () from /lib64/libpthread.so
#1  0x0000000000717cb9 in os_thread_sleep_low ()
#2  0x0000000001d8fb0a in nsvr_schedule_thread ()
#3  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#4  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_chkpnt_thd

flush checkpoint 的线程。主要负责 CKPT_LSN 的管理。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000703cbc in os_event2_wait ()
#2  0x0000000000d52ef8 in ckpt2_flush_thread ()
#3  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#4  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```

## dm_quit_thd

执行正常 shutdown 操作的线程。

创建此线程的堆栈如下：

```md
#0  0x00007ffff79b44ac in pthread_cond_wait@@GLIBC_2.3.2 () from /lib64/libpthread.so
#1  0x0000000000717a62 in os_semaphore_p ()
#2  0x0000000001d95bfe in nsvr_quit_thread ()
#3  0x00007ffff79ae1da in start_thread () from /lib64/libpthread.so
#4  0x00007ffff6cffe73 in clone () from /lib64/libc.so
```
