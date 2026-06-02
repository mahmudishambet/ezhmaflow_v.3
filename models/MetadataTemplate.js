const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

class MetadataTemplate {
  static create(templateData) {
    const id = uuidv4();
    const {
      user_id,
      name,
      description = '',
      tags = ''
    } = templateData;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO metadata_templates (id, user_id, name, description, tags)
         VALUES (?, ?, ?, ?, ?)`,
        [id, user_id, name, description, tags],
        function (err) {
          if (err) {
            console.error('[MetadataTemplate] Error creating template:', err.message);
            return reject(err);
          }
          console.log('[MetadataTemplate] created name=', name);
          resolve({ id, ...templateData });
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM metadata_templates WHERE id = ?', [id], (err, row) => {
        if (err) {
          console.error('[MetadataTemplate] Error finding template:', err.message);
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  static findAll(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM metadata_templates WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) {
            console.error('[MetadataTemplate] Error finding templates:', err.message);
            return reject(err);
          }
          resolve(rows || []);
        }
      );
    });
  }

  static update(id, templateData) {
    const fields = [];
    const values = [];

    Object.entries(templateData).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE metadata_templates SET ${fields.join(', ')} WHERE id = ?`;

    return new Promise((resolve, reject) => {
      db.run(query, values, function (err) {
        if (err) {
          console.error('[MetadataTemplate] Error updating template:', err.message);
          return reject(err);
        }
        console.log('[MetadataTemplate] updated id=', id);
        resolve({ id, ...templateData });
      });
    });
  }

  static delete(id, userId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM metadata_templates WHERE id = ? AND user_id = ?',
        [id, userId],
        function (err) {
          if (err) {
            console.error('[MetadataTemplate] Error deleting template:', err.message);
            return reject(err);
          }
          console.log('[MetadataTemplate] deleted id=', id);
          resolve({ success: true, deleted: this.changes > 0 });
        }
      );
    });
  }
}

module.exports = MetadataTemplate;
