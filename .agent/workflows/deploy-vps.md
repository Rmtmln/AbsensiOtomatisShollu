---
description: Cara deploy Shollu Auto-Bot ke VPS dengan Docker
---

# 🚀 Deploy Shollu Auto-Bot ke VPS

## Prasyarat VPS
- Ubuntu 20.04+ / Debian 11+ (rekomendasi)
- Minimal RAM 1GB
- Docker & Docker Compose sudah terinstall

---

## Step 1: Install Docker di VPS (jika belum)

SSH ke VPS dulu:
```bash
ssh root@IP_VPS_KAMU
```

Install Docker:
```bash
curl -fsSL https://get.docker.com | sh
```

Verifikasi:
```bash
docker --version
docker compose version
```

---

## Step 2: Upload Project ke VPS

Jalankan di **komputer lokal** (bukan di VPS):

```bash
# Dari folder parent TheBotAbsen
rsync -avz --exclude='node_modules' --exclude='.git' ~/TheBotAbsen/ root@IP_VPS_KAMU:~/TheBotAbsen/
```

> **Alternatif pakai scp:**
> ```bash
> cd ~ && tar czf bot.tar.gz --exclude='node_modules' --exclude='.git' TheBotAbsen/
> scp bot.tar.gz root@IP_VPS_KAMU:~/
> ```
> Lalu di VPS: `cd ~ && tar xzf bot.tar.gz`

---

## Step 3: Jalankan di VPS

SSH ke VPS:
```bash
ssh root@IP_VPS_KAMU
```

Jalankan Docker:
```bash
cd ~/TheBotAbsen
docker compose up -d --build
```

Tunggu ~1-2 menit (MySQL perlu start + init tabel), lalu cek:
```bash
docker compose ps
```

Output yang benar:
```
NAME         STATUS
bot_absen    Up (running)
bot_mysql    Up (healthy)
```

Cek log bot:
```bash
docker compose logs -f bot_absen
```

---

## Step 4: Buka Dashboard

Buka di browser:
```
http://IP_VPS_KAMU:8355
```

---

## Step 5: Buat User Pertama

1. Klik **"Daftar"** di halaman login
2. Isi username & password
3. Approve user via MySQL:

```bash
docker exec -it bot_mysql mysql -u rahmets -pakaza shollu_db -e "UPDATE users SET is_approved = 1 WHERE username = 'USERNAME_KAMU';"
```

4. Login ke dashboard ✅

---

## Perintah Berguna

```bash
# Lihat status
docker compose ps

# Lihat log real-time
docker compose logs -f bot_absen

# Restart bot
docker compose restart bot_absen

# Stop semua
docker compose down

# Stop + hapus data MySQL (reset total)
docker compose down -v

# Update setelah upload kode baru
docker compose up -d --build
```

---

## (Opsional) Akses via Domain + HTTPS

Jika ingin akses pakai domain (misal `bot.domain.com`):

1. Arahkan DNS domain ke IP VPS
2. Install Nginx:
```bash
apt install nginx -y
```

3. Buat config `/etc/nginx/sites-available/shollu-bot`:
```nginx
server {
    listen 80;
    server_name bot.domain.com;

    location / {
        proxy_pass http://localhost:8355;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

4. Aktifkan:
```bash
ln -s /etc/nginx/sites-available/shollu-bot /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

5. Pasang SSL gratis:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d bot.domain.com
```
