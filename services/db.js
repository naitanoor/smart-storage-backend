const mysql = require("mysql2/promise");
// const config = require("../configuration/local.db.config");
const config = require("../configuration/db.config");

let connection = null;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection(config.db);
  }
  return connection;
}

async function query(sql, params) {
  const conn = await getConnection();
  const [results] = await conn.execute(sql, params);
  return results;
}

async function beginTransaction() {
  const conn = await getConnection();
  await conn.beginTransaction();
}

async function commit() {
  const conn = await getConnection();
  await conn.commit();
}

async function rollback() {
  const conn = await getConnection();
  await conn.rollback();
}

// async function releaseConnection() {
//   if (connection) {
//     connection.release();
//     connection = null;
//   }
// }

module.exports = {
  query,
  beginTransaction,
  commit,
  rollback,
};
