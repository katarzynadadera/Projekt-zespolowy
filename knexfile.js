const path = require("node:path");
require("dotenv").config({ quiet: true });
const { PG_HOST, PG_PORT, PG_USER, PG_PASSWD, PG_DBASE } = process.env;
 
const dbConfig = {
  client: "postgresql",
  connection: {
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWD,
    database: PG_DBASE,
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: path.join(__dirname, "db", "migrations")
  },
  seeds: {
    directory: path.join(__dirname, "db", "seeds")
  }
};

module.exports = {
  development: dbConfig,
  test: dbConfig
};