const { db } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

class Playlist {
  static findAll(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT p.*, 
         (SELECT COUNT(*) FROM playlist_videos pv 
          JOIN videos v ON pv.video_id = v.id 
          WHERE pv.playlist_id = p.id 
          AND NOT (v.filepath LIKE '%/audio/%' OR v.filepath LIKE '%.m4a' OR v.filepath LIKE '%.aac' OR v.filepath LIKE '%.mp3')) as video_count,
         (SELECT COUNT(*) FROM playlist_audios pa WHERE pa.playlist_id = p.id) as audio_count,
         (SELECT GROUP_CONCAT(v2.thumbnail_path)
          FROM playlist_videos pv2
          JOIN videos v2 ON pv2.video_id = v2.id
          WHERE pv2.playlist_id = p.id
          AND NOT (v2.filepath LIKE '%/audio/%' OR v2.filepath LIKE '%.m4a' OR v2.filepath LIKE '%.aac' OR v2.filepath LIKE '%.mp3')
          ORDER BY pv2.position ASC) as thumbnails
         FROM playlists p 
         WHERE p.user_id = ? 
         GROUP BY p.id
         ORDER BY p.updated_at DESC`,
        [userId],
        (err, rows) => {
          if (err) {
            return reject(err);
          }
          resolve(rows);
        }
      );
    });
  }

  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM playlists WHERE id = ?', [id], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  static async findByIdWithVideos(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM playlists WHERE id = ?', [id], (err, playlist) => {
        if (err) {
          return reject(err);
        }
        if (!playlist) {
          return resolve(null);
        }

        db.all(
          `SELECT v.*, pv.position
           FROM playlist_videos pv
           JOIN videos v ON pv.video_id = v.id
           WHERE pv.playlist_id = ?
           ORDER BY pv.position ASC`,
          [id],
          (err, videos) => {
            if (err) {
              return reject(err);
            }

            let bgAudios = [];
            let audioLayer2 = [];
            
            // Load background music from playlist_audios table
            db.all(
              `SELECT v.* FROM videos v
               INNER JOIN playlist_audios pa ON v.id = pa.audio_id
               WHERE pa.playlist_id = ?
               ORDER BY pa.position ASC`,
              [id],
              (err, audios) => {
                if (err) {
                  console.error('[Playlist] error loading background music from playlist_audios:', err);
                  return reject(err);
                }
                bgAudios = audios || [];
                console.log(`[Playlist] loaded ${bgAudios.length} background music tracks from playlist_audios table`);

                // Load audio layer 2 from audioLayer2Ids column
                if (playlist.audioLayer2Ids) {
                  const audioLayer2Ids = playlist.audioLayer2Ids.split(',').filter(id => id);
                  if (audioLayer2Ids.length > 0) {
                    const placeholders = audioLayer2Ids.map(() => '?').join(',');
                    db.all(
                      `SELECT * FROM videos WHERE id IN (${placeholders})`,
                      audioLayer2Ids,
                      (err, audioLayer2Rows) => {
                        if (err) {
                          return reject(err);
                        }
                        audioLayer2 = audioLayer2Rows || [];
                        resolve({
                          ...playlist,
                          videos: videos || [],
                          audios: bgAudios,
                          bg_audios: audioLayer2,
                          audioLayer2: audioLayer2,
                          shuffle: playlist.is_shuffle
                        });
                      }
                    );
                  } else {
                    resolve({
                      ...playlist,
                      videos: videos || [],
                      audios: bgAudios,
                      bg_audios: [],
                      audioLayer2: [],
                      shuffle: playlist.is_shuffle
                    });
                  }
                } else {
                  resolve({
                    ...playlist,
                    videos: videos || [],
                    audios: bgAudios,
                    bg_audios: [],
                    audioLayer2: [],
                    shuffle: playlist.is_shuffle
                  });
                }
              }
            );
          }
        );
      });
    });
  }

  static create(playlistData) {
    const playlistId = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO playlists (id, name, description, is_shuffle, backgroundMusicShuffle, user_id, bg_volume, audioLayer2Ids, audioLayer2Volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          playlistId,
          playlistData.name,
          playlistData.description || null,
          playlistData.is_shuffle || 0,
          playlistData.backgroundMusicShuffle ? 1 : 0,
          playlistData.user_id,
          playlistData.bg_volume || 35,
          playlistData.audioLayer2Ids || null,
          playlistData.audioLayer2Volume || 35
        ],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ id: playlistId, ...playlistData });
        }
      );
    });
  }

  static update(id, updateData) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (updateData.name !== undefined) {
        fields.push('name = ?');
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        fields.push('description = ?');
        values.push(updateData.description);
      }
      if (updateData.is_shuffle !== undefined) {
        fields.push('is_shuffle = ?');
        values.push(updateData.is_shuffle);
      }
      if (updateData.backgroundMusicShuffle !== undefined) {
        fields.push('backgroundMusicShuffle = ?');
        values.push(updateData.backgroundMusicShuffle ? 1 : 0);
      }
      if (updateData.bg_volume !== undefined) {
        fields.push('bg_volume = ?');
        values.push(updateData.bg_volume);
      }
      if (updateData.audioLayer2Volume !== undefined) {
        fields.push('audioLayer2Volume = ?');
        values.push(updateData.audioLayer2Volume);
      }
      if (updateData.audioLayer2Ids !== undefined) {
        fields.push('audioLayer2Ids = ?');
        values.push(updateData.audioLayer2Ids);
      }

      if (fields.length === 0) {
        return resolve(null);
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const sql = `UPDATE playlists SET ${fields.join(', ')} WHERE id = ?`;
      db.run(sql, values, function (err) {
        if (err) {
          return reject(err);
        }
        resolve({ id, ...updateData });
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM playlists WHERE id = ?', [id], function (err) {
        if (err) {
          return reject(err);
        }
        resolve({ deleted: this.changes > 0 });
      });
    });
  }

  static addVideo(playlistId, videoId, position) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO playlist_videos (id, playlist_id, video_id, position) VALUES (?, ?, ?, ?)',
        [id, playlistId, videoId, position],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ id, playlist_id: playlistId, video_id: videoId, position });
        }
      );
    });
  }

  static removeVideo(playlistId, videoId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?',
        [playlistId, videoId],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ deleted: this.changes > 0 });
        }
      );
    });
  }

  static updateVideoPositions(playlistId, videoPositions) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let completed = 0;
        let hasError = false;

        videoPositions.forEach(({ videoId, position }) => {
          db.run(
            'UPDATE playlist_videos SET position = ? WHERE playlist_id = ? AND video_id = ?',
            [position, playlistId, videoId],
            function (err) {
              if (err && !hasError) {
                hasError = true;
                db.run('ROLLBACK');
                return reject(err);
              }
              
              completed++;
              if (completed === videoPositions.length && !hasError) {
                db.run('COMMIT', (err) => {
                  if (err) {
                    return reject(err);
                  }
                  resolve({ updated: true });
                });
              }
            }
          );
        });
      });
    });
  }

  static getNextPosition(playlistId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT MAX(position) as max_position FROM playlist_videos WHERE playlist_id = ?',
        [playlistId],
        (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve((row.max_position || 0) + 1);
        }
      );
    });
  }

  static addAudio(playlistId, audioId, position) {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO playlist_audios (id, playlist_id, audio_id, position) VALUES (?, ?, ?, ?)',
        [id, playlistId, audioId, position],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ id, playlist_id: playlistId, audio_id: audioId, position });
        }
      );
    });
  }

  static removeAudio(playlistId, audioId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM playlist_audios WHERE playlist_id = ? AND audio_id = ?',
        [playlistId, audioId],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ deleted: this.changes > 0 });
        }
      );
    });
  }

  static clearAudios(playlistId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM playlist_audios WHERE playlist_id = ?',
        [playlistId],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ deleted: this.changes });
        }
      );
    });
  }

  static updateBackgroundAudio(playlistId, bgAudioIds, bgVolume) {
    return new Promise((resolve, reject) => {
      const bgAudioIdsStr = bgAudioIds && bgAudioIds.length > 0 ? bgAudioIds.join(',') : null;
      db.run(
        'UPDATE playlists SET bg_audio_ids = ?, bg_volume = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [bgAudioIdsStr, bgVolume || 35, playlistId],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ updated: true, bg_audio_ids: bgAudioIdsStr, bg_volume: bgVolume || 35 });
        }
      );
    });
  }

  static updateAudioLayer2(playlistId, audioLayer2Ids, audioLayer2Volume) {
    return new Promise((resolve, reject) => {
      const audioLayer2IdsStr = audioLayer2Ids && audioLayer2Ids.length > 0 ? audioLayer2Ids.join(',') : null;
      db.run(
        'UPDATE playlists SET audioLayer2Ids = ?, audioLayer2Volume = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [audioLayer2IdsStr, audioLayer2Volume || 35, playlistId],
        function (err) {
          if (err) {
            return reject(err);
          }
          resolve({ updated: true, audioLayer2Ids: audioLayer2IdsStr, audioLayer2Volume: audioLayer2Volume || 35 });
        }
      );
    });
  }
}

module.exports = Playlist;
