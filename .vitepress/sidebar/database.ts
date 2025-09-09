export const dmSidebar = [
  {
    text: "原理合集",
    base: "/database/dm/",
    collapsed: true,
    items: [
      {
        text: "dm 单机线程",
        link: "dm-thread",
      },
    ],
  },
  {
    text: "功能合集",
    base: "/database/dm/",
    collapsed: true,
    items: [
      {
        text: "数据库缓存",
        link: "features/database-cache",
      },
      {
        text: "单机在线转主备",
        link: "features/single-machine-online-to-master-slave",
      }
    ]
  },
  {
    text: "问题合集",
    base: "/database/dm/",
    collapsed: true,
    items: [
      {
        text: "cannot get user lang",
        link: "question/cannot-get-user-lang",
      },
      {
        text: "tmp 空间不足",
        link: "question/tmp-space-limit",
      },
    ],
  },
  {
    text: "常用 SQL 合集",
    base: "/database/dm/",
    collapsed: true,
    items: [
      {
        text: "查询初始化参数",
        link: "common-sql/query-init-params",
      },
      {
        text: "收集统计信息",
        link: "common-sql/collect-statistics",
      },
      {
        text: "设置 oracle 兼容性",
        link: "common-sql/set-oracle-compatibility",
      },
      {
        text: "数据库对象大小",
        link: "common-sql/database-object-size",
      },
      {
        text: "dm - dm 的 dblink",
        link: "common-sql/dm-dblink",
      },
    ],
  },
  {
    text: "参数解析",
    base: "/database/dm/",
    collapsed: true,
    items: [
      {
        text: "COMPLEX_VIEW_MERGING",
        link: "arguments/complex-view-merging",
      },
      {
        text: "BATCH_PARAM_OPT",
        link: "arguments/batch-param-opt",
      },
      {
        text: "VIEW_FILTER_MERGING",
        link: "arguments/view-filter-merging",
      }
    ],
  }
];

export const sqliteSidebar = [
  {
    text: "常用 SQL 合集",
    base: "/database/sqlite/",
    collapsed: true,
    items: [
      {
        text: "查询所有对象",
        link: "sqlite-query-all-objects",
      },
    ],
  },
];

export const oracleSidebar = [
  {
    text: "常用 SQL 合集",
    base: "/database/oracle/",
    collapsed: true,
    items: [
      {
        text: "收集统计信息",
        link: "oracle-collect-statistics",
      },
    ],
  },
];

export const postgresSidebar = [
  {
    text: "Getting Started",
    base: "/database/postgres/",
    collapsed: true,
    items: [
      {
        text: "安装数据库",
        link: "postgres-installation",
      },
    ],
  },
];

export const mysqlSidebar = [
  {
    text: "Getting Started",
    base: "/database/mysql/",
    collapsed: true,
    items: [
      {
        text: "安装数据库",
        link: "mysql-installation",
      },
    ],
  },
];
