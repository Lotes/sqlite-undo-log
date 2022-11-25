import { ColumnValue } from "./types";
import { Parameters } from '../sqlite3'

export interface DatabaseUtilitiesServices {
  normalize(arg: any): any;
  equals(left: any, right: any): boolean;
  unquote(values: Record<string, ColumnValue>): Record<string, any>;
  toParameterList<T extends Record<string, any>>(data: Partial<T>): [Parameters, string[]];
}
