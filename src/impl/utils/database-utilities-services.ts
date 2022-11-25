import { unreachableCase } from "ts-assert-unreachable";
import { UndoLogServices } from "../..";
import { UndoLogError } from "../../undo-log";
import { DatabaseUtilitiesServices } from "../../utils/database-utilities-services";
import { ColumnValue } from "../../utils/types";
import { Parameters } from "../../sqlite3";

export class DatabaseUtilitiesServicesImpl implements DatabaseUtilitiesServices {
  constructor(_srv: UndoLogServices) {}
  
  normalize(arg: any): any {
    if (typeof arg === "string") {
      if (/^\d+(\.\d+)?$/.test(arg)) {
        return parseFloat(arg);
      }
      const asStringLiteral = /^'([^']*)'$/gi.exec(arg);
      if (asStringLiteral != null) {
        return asStringLiteral[1].substring(1, asStringLiteral[1].length - 1);
      }
      const asBufferLiteral = /^X'([0-9A-F]+)'$/gi.exec(arg);
      if (asBufferLiteral != null) {
        return Buffer.from(asBufferLiteral[1], "hex");
      }
    }
    return arg;
  }

  equals(left: any, right: any) {
    const lhs = this.normalize(left);
    const rhs = this.normalize(right);
    if (lhs instanceof Buffer && rhs instanceof Buffer) {
      return lhs.equals(rhs);
    }
    return lhs == rhs;
  }

  unquote(values: Record<string, ColumnValue>): Record<string, any> {
    let result: Record<string, any> = {};
    Object.entries(values).forEach((entry) => {
      const [name, { value, type }] = entry;
      switch (type) {
        case "TEXT":
          result = { ...result, [name]: this.unquoteText(value) };
          break;
        case "REAL":
          result = { ...result, [name]: parseFloat(value) };
          break;
        case "NUMERIC":
          result = { ...result, [name]: parseFloat(value) };
          break;
        case "INTEGER":
          result = { ...result, [name]: parseInt(value) };
          break;
        case "BLOB":
          result = { ...result, [name]: this.unquoteBlob(value) };
          break;
        default:
          unreachableCase(type, `Unknown type '${type}' for unquoting.`);
      }
    });
    return result;
  }

  private unquoteBlob(value: string): Buffer {
    const matchHex = /^X'([^']+)'$/.exec(value);
    if (matchHex != null) {
      return Buffer.from(matchHex[1], "hex");
    }
    if (/^('[.+]')$/.test(value)) {
      return Buffer.from(this.unquoteText(value));
    }
    throw new UndoLogError("Unable to unquote blob!");
  }

  private unquoteText(value: string): string {
    return value.substring(1, value.length - 1).replace(/''/g, "'");
  }

  toParameterList<T extends Record<string, any>>(
    data: Partial<T>
  ): [Parameters, string[]] {
    let tail: string[] = [];
    let parameters = {};
    Object.getOwnPropertyNames(data).forEach((c) => {
      tail.push(`${c}=$${c}`);
      parameters = { ...parameters, [`$${c}`]: data[c] };
    });
    return [parameters, tail];
  }
}
