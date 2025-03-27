import { frontendSidebar } from "./web-develope";
import { operatingSystemSidebar } from "./operating-system";
import { computerScienceSidebar } from "./books";
import {
  dmSidebar,
  sqliteSidebar,
  oracleSidebar,
  postgresSidebar,
  mysqlSidebar,
} from "./database";

export default {
  "/database/dm": dmSidebar,
  "/database/oracle": oracleSidebar,
  "/database/postgres": postgresSidebar,
  "/database/mysql": mysqlSidebar,
  "/database/sqlite": sqliteSidebar,
  "/web-develope/": frontendSidebar,
  "/operating-system/": operatingSystemSidebar,
  "/books/computer-science": computerScienceSidebar
};
