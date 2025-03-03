export const dmSidebar = [
  {
    text: "达梦数据库",
    base: "/database/dm/",
    collapsed: true,
    items: [
      {
        text: "问题合集",
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
        text: "dm 单机线程",
        link: "dm-thread",
      },
    ],
  },
];

export const oracleSidebar = [
  {
    text: "Oracle",
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

export const mysqlSidebar = [
  {
    text: "MySQL",
    base: "/database/mysql/",
    collapsed: true,
    items: [
      {
        text: "MySQL 安装",
        link: "mysql-installation",
      },
    ],
  },
];

export const postgresqlSidebar = [
  {
    text: "PostgreSQL",
    base: "/database/postgres/",
    collapsed: true,
    items: [
      {
        text: "PostgreSQL 安装",
        link: "postgres-installation",
      },
    ],
  },
];

export const sqliteSidebar = [
  {
    text: "SQLite",
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
