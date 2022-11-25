import { Connection } from "../sqlite3";


export interface PrivateServices {
  connection: Connection;
  prefix: string;
}
