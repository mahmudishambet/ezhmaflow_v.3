const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('db/ezhma.db');

db.all(
  "SELECT username, user_role, status FROM users WHERE username = ?",
  ['tes123'],
  function (err, rows) {
    console.log(err || rows);
    db.close();
  }
);
