import { frontendSidebar } from "./web-develope";
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
};
