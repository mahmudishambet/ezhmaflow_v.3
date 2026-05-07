const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('db/ezhma.db');

db.run(
  "UPDATE users SET status = ?, user_role = ? WHERE username = ?",
  ['active', 'admin', 'tes123'],
  function (err) {
    if (err) {
      console.error(err);
    } else {
      console.log('OK: tes123 sudah aktif admin. Rows changed:', this.changes);
    }
    db.close();
  }
);
