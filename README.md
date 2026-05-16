<div align="center">
  <img src="public/images/logo-only.png" alt="Ezhma Studio Manager Logo" width="150"/>

  <h1>Ezhma Studio Manager</h1>
  <p><b>Web-Based YouTube Live Streaming & Rotation Manager</b></p>

  <p>Ezhma Studio Manager adalah platform manajemen live streaming berbasis web untuk otomatisasi YouTube, rotasi stream, galeri media, manajemen playlist, manajemen pengguna/member, notifikasi Telegram, dan deployment VPS yang mudah.</p>

  <div>
    <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-success" alt="Node.js" />
    <img src="https://img.shields.io/badge/database-SQLite-informational" alt="SQLite" />
    <img src="https://img.shields.io/badge/tool-FFmpeg-critical" alt="FFmpeg" />
    <img src="https://img.shields.io/badge/API-YouTube%20Data%20API%20v3-red" alt="YouTube API" />
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
  </div>
</div>

---

## 📸 Preview / Screenshot

*(Tambahkan screenshot aplikasi di folder `docs/screenshots/` untuk menampilkan preview di sini)*

<div align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="80%" />
  <br/><br/>
  <img src="docs/screenshots/rotation.png" alt="Rotation Manager" width="80%" />
</div>

---

## ✨ Fitur Utama

- 📊 **Dashboard Monitoring**: Pantau penggunaan CPU, RAM, disk, kecepatan internet, dan stream aktif secara real-time.
- 📡 **Manual RTMP Stream**: Melakukan live streaming manual menggunakan RTMP.
- 🔴 **YouTube API Stream**: Terintegrasi langsung dengan YouTube API untuk manajemen stream.
- 🔄 **Stream Rotation Scheduler**: Jadwalkan rotasi live stream secara otomatis.
- 🔁 **Auto Repeat**: Mendukung pengulangan harian, mingguan, atau bulanan sesuai kebutuhan.
- 📁 **Media Gallery**: Upload video dan kelola file media dengan mudah.
- 📑 **Playlist Management**: Buat dan atur playlist video untuk streaming.
- 👥 **User/Member Management**: Sistem multi-user dengan hak akses yang berbeda.
- 💾 **Disk Limit per Member**: Batasi penggunaan penyimpanan untuk setiap member.
- 📱 **Telegram Notifications**: Dapatkan notifikasi status stream dan error via Telegram.
- 📝 **Application Logs**: Pantau aktivitas sistem dan error melalui log aplikasi.
- 🌙 **Dark Premium Theme**: Antarmuka dashboard yang elegan dengan tema gelap premium.

---

## 💻 System Requirements

Untuk menjalankan Ezhma Studio Manager, server Anda memerlukan spesifikasi berikut:

- **OS**: Ubuntu 22.04 / 24.04
- **Node.js**: Versi 18+ atau 20+
- **NPM**: Tersedia bersama Node.js
- **FFmpeg**: Untuk pemrosesan media dan streaming
- **Git**: Untuk cloning repository
- **Database**: SQLite (built-in)
- **Rekomendasi VPS**: Minimal 2 Core CPU, 4 GB RAM, 50 GB Disk Space

---

## 🚀 Quick Installation

Gunakan script instalasi otomatis (jika tersedia) untuk proses yang lebih cepat:

```bash
curl -o install.sh https://raw.githubusercontent.com/mahmudishambet/ezhmaflow_v.3/main/install.sh && chmod +x install.sh && ./install.sh
```

> **Catatan**: Jika `install.sh` belum tersedia di repository, silakan gunakan metode **Manual Installation** di bawah ini.

---

## 🛠️ Manual Installation

Ikuti langkah-langkah berikut untuk menginstal Ezhma Studio Manager secara manual pada server Ubuntu.

### 1. Update Server
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Dependencies (Node.js, FFmpeg, Git, SQLite)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg git sqlite3
```

### 3. Clone Repository & Install
```bash
cd /www/wwwroot
git clone https://github.com/mahmudishambet/ezhmaflow_v.3.git ezhmaflow_v3
cd ezhmaflow_v3
npm install
```

### 4. Konfigurasi Environment
```bash
cp .env.example .env
node generate-secret.js
```

### 5. Jalankan Aplikasi
```bash
npm start
```

---

## 🛡️ Konfigurasi Port & Firewall

Secara default, aplikasi berjalan pada port `7575`. Pastikan port tersebut terbuka di firewall VPS Anda.

```bash
sudo ufw allow 7575
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

## ⚙️ Menjalankan dengan PM2

Agar aplikasi tetap berjalan di background dan otomatis restart saat server reboot, gunakan PM2.

```bash
sudo npm install -g pm2
pm2 start app.js --name ezhma-studio-manager
pm2 save
pm2 startup
```

**Perintah PM2 yang Berguna:**
- Cek status aplikasi: `pm2 status`
- Lihat log aplikasi: `pm2 logs ezhma-studio-manager`
- Restart aplikasi: `pm2 restart ezhma-studio-manager`
- Hentikan aplikasi: `pm2 stop ezhma-studio-manager`

---

## 🌐 aaPanel Deployment

Jika Anda menggunakan aaPanel, ikuti langkah berikut:

1. Masuk ke terminal atau file manager, clone/upload project ke `/www/wwwroot/ezhmaflow_v3`.
2. Buka menu **Website** -> **Node Project**.
3. Tambahkan Node project baru:
   - **Project directory**: `/www/wwwroot/ezhmaflow_v3`
   - **Startup file**: `app.js`
   - **Port**: `7575`
4. Klik Submit/Start untuk menjalankan aplikasi.
5. (Opsional) Tambahkan domain dan aktifkan Reverse Proxy jika ingin mengakses menggunakan nama domain.

---

## 🔑 Reset Password

Jika Anda lupa password admin, gunakan perintah berikut untuk meresetnya:

```bash
cd /www/wwwroot/ezhmaflow_v3
node reset-password.js
```

---

## 🕒 Timezone Server

Pastikan zona waktu server sudah diatur dengan benar agar penjadwalan (scheduler) berjalan akurat. Untuk zona waktu Indonesia (WIB):

```bash
sudo timedatectl set-timezone Asia/Jakarta
timedatectl
pm2 restart ezhma-studio-manager
```

---

## 🐳 Docker Deployment

Jika file `docker-compose.yml` tersedia, Anda bisa menjalankan aplikasi menggunakan Docker:

```bash
docker compose up -d --build
```

---

## 💾 Data Persistence

Beberapa direktori penting yang menyimpan data dan tidak boleh dihapus saat update:
- `db/` - Berisi file database SQLite.
- `logs/` - Menyimpan file log sistem dan error.
- `public/uploads/` - Tempat penyimpanan file video dan media dari galeri.

### 💽 Additional Storage Disk (Optional)
Jika VPS Anda memiliki disk penyimpanan tambahan yang dimount ke path tertentu, Anda dapat menampilkannya di Dashboard dengan menambahkan variable environment di `.env`:
```env
ADDITIONAL_STORAGE_PATH=/mnt/ezhma-data
```
Path ini akan otomatis dipantau dan status penyimpanannya akan muncul di widget "Additional Disk Usage".

---

## 🔧 Troubleshooting

Berikut solusi untuk beberapa masalah umum:

- **Permission error**: Jalankan `sudo chown -R $USER:$USER /www/wwwroot/ezhmaflow_v3`.
- **Port already in use**: Cek aplikasi yang menggunakan port 7575 dengan `lsof -i :7575` lalu kill prosesnya, atau ubah port di file `.env`.
- **Database error**: Pastikan folder `db` memiliki izin tulis (write permission).
- **Git dubious ownership**: Jalankan `git config --global --add safe.directory /www/wwwroot/ezhmaflow_v3`.
- **Logo/cache issue**: Clear cache browser Anda atau gunakan mode incognito.
- **YouTube API title invalid**: Pastikan judul stream tidak mengandung karakter yang dilarang oleh YouTube.
- **Timezone still UTC**: Jalankan ulang perintah pengaturan timezone dan pastikan restart PM2.
- **App not restarting in aaPanel**: Hapus Node project di aaPanel, lalu buat ulang dengan konfigurasi yang benar.

---

## 📂 Project Structure

```text
.
├── app.js
├── database.js
├── db/
├── logs/
├── public/
│   ├── images/
│   └── uploads/
├── services/
├── models/
├── views/
└── package.json
```

---

## 📄 License

Proyek ini dilisensikan di bawah [MIT License](LICENSE) atau lisensi terkait lainnya sesuai repository.