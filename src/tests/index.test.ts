import { Assertions } from "../assertions";
import { Connection } from "../sqlite3";
import { Utils } from "../utils";
import { setupBeforeEach } from "./fixtures";

describe("Public API", () => {
    let connection: Connection;
    let utils: Utils;
    let assertions: Assertions;
  
    beforeEach(async () => {
      ({ assertions, utils, connection } = await setupBeforeEach());
      
    });
  
    afterEach(async () => {
      await connection.close();
    });
  
    describe("lol", () => {

    });
});