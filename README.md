# TrackLab Web (frontend Next.js)

Aplikasi web untuk **TrackLab**: mengelola master tracker (langkah-langkah dalam alur analisis lab), request analisis lab, dan progres tracking setiap request. Dibangun berdasarkan desain yang diberikan, dengan beberapa peningkatan UX.

Repositori backend: lihat `tracklab-backend` (.NET). Backend menangani auth, berkomunikasi dengan API assessment, serta menyediakan logging dan audit trail.

## Fitur

| Halaman | Yang bisa dilakukan |
|---|---|
| **Login** | Login dengan akun assessment. Validasi, tampilkan/sembunyikan password, pesan yang jelas saat sesi habis, dan kembali ke halaman asal setelah login |
| **Dashboard** | Total request, tracker, dan tracking, ditambah aktivitas terbaru dari audit trail |
| **Master Tracker** | CRUD tracker (fitur 2): paging di server, sort di setiap kolom, pencarian, ukuran halaman, form tambah/edit dengan validasi, pemilih parent step, delete (nonaktifkan), riwayat perubahan per record |
| **Lab Analysis Request** | CRUD request (fitur 3): paging, sort, pencarian, **Filter By** (project code / last status / receiving status, semua atau salah satu kondisi), form tambah/edit, delete, riwayat |
| **Request → Tracking progress** | Timeline semua langkah tracker untuk satu request: catat, edit, atau hapus langkah (bonus FE, CRUD trackings). Input nilai menyesuaikan action type langkahnya (tanggal / teks / file / tanpa nilai), dan *Last Status* request bisa ter-update otomatis |
| **Tracking Progress** | Semua tracking dalam satu tabel ber-paging, dengan CRUD lengkap |
| **Audit Trail** | Siapa membuat, mengubah, atau menghapus apa, per field, dengan filter |
| **System Logs** | Penampil log backend (fitur 4): filter berdasarkan tanggal, level, dan teks, lalu klik request ID untuk melihat semua baris log dari request tersebut |

Di seluruh aplikasi: state loading, kosong, dan error (error menampilkan reference ID yang cocok dengan log backend), toast, konfirmasi sebelum menghapus, kontrol yang ramah keyboard dan screen reader, serta layout responsif dengan sidebar untuk mobile.

## Tech stack

- **Next.js 16** (App Router, Cache Components) · **React 19** · **TypeScript**
- **Tailwind CSS 4**, font Poppins (self-hosted lewat `@fontsource`), ikon `lucide-react`
- **TanStack Query** untuk server state (caching, refetch setelah operasi tulis, tetap menampilkan halaman sebelumnya selama halaman berikutnya dimuat)
- **React Hook Form + Zod** untuk form dan validasi
- **Vitest + Testing Library** untuk unit test dan component test

---

## Memulai

### Prasyarat

- Node.js **20.9+** dan npm
- Backend berjalan di `http://localhost:5080` (lihat README backend)

### 1. Instalasi

```bash
npm install
cp .env.example .env.local   # opsional: hanya jika backend tidak berjalan di localhost:5080
```

`BACKEND_URL` adalah satu-satunya pengaturan. Tidak ada rahasia yang disimpan di frontend.

### 2. Menjalankan (development)

```bash
npm run dev
```

Buka **http://localhost:3000** dan login dengan akun dari brief assessment (`assessment.it`).

### 3. Build dan menjalankan (production)

```bash
npm run build
npm start
```

`BACKEND_URL` dibaca saat build untuk rewrite `/api`, jadi atur nilainya sebelum menjalankan `npm run build`.

### 4. Testing dan pengecekan

```bash
npm test            # Vitest: unit test dan component test
npm run lint        # ESLint (aturan Next.js + React Hooks)
npm run typecheck   # TypeScript
```

Test mencakup API client (header CSRF, correlation ID, ProblemDetails menjadi pesan yang mudah dibaca, penanganan 401), normalisasi respons, format (rupiah, tanggal), schema form, filter request, timeline tracking, proteksi open redirect di halaman login, tabel data dan pagination, serta form login.

**Migrasi:** tidak ada. Frontend tidak memiliki database.

---

## Cara frontend berkomunikasi dengan backend

```
Browser ──► Next.js /api/* ──rewrite──► TrackLab.Api (.NET) ──► API assessment
```

- `next.config.ts` me-rewrite `/api/*` ke `BACKEND_URL`. Panggilan bersifat same-origin, sehingga **cookie sesi HttpOnly** dari backend bekerja tanpa CORS, dan browser tidak pernah melihat access token.
- `src/lib/api-client.ts` membungkus `fetch`. Modul ini menambahkan `X-Requested-With` pada `POST`/`PUT`/`DELETE` (pengecekan CSRF di backend) dan `X-Correlation-Id` pada setiap panggilan, mengubah error ProblemDetails menjadi pesan yang mudah dibaca, dan mengarahkan user ke `/login?expired=1` setiap kali mendapat `401`.
- `src/proxy.ts` (nama baru middleware di Next.js 16) mengarahkan ke `/login` jika tidak ada cookie sesi. Ini hanya untuk menghindari menampilkan halaman yang tidak bisa dipakai user; backend tetap memeriksa setiap request.
- `src/lib/client-logger.ts` melaporkan error yang tidak tertangani dan request data yang gagal ke log backend (`POST /api/logs/client`).
- `src/lib/normalize.ts` membaca envelope `{ data, success, message, code }` dari API dan menerima nama field `camelCase` maupun `snake_case`.

## Struktur project

```
src/
├── app/                    # Route (App Router)
│   ├── login/              # Halaman login publik
│   └── (app)/              # Halaman di balik login, berbagi layout sidebar
│       ├── dashboard/  trackers/  requests/  requests/[id]/  trackings/  audit-trail/  logs/
├── features/               # Kode per fitur: komponen halaman, form, hooks
│   ├── auth/  trackers/  requests/  trackings/  audit/  logs/  dashboard/
├── components/
│   ├── ui/                 # Button, kontrol form, modal, tabel data, pagination, menu baris…
│   └── layout/             # App shell (sidebar, top bar), header halaman
├── hooks/                  # Query resource (paged/all), mutation, state tabel
├── lib/                    # API client, resource, normalisasi, format, tipe, client logger
└── proxy.ts                # Proteksi route
```

## Catatan tentang data API

- **Nama perusahaan:** request hanya membawa `partnerId` dan tidak ada endpoint partner. `src/lib/partners.ts` memetakan id yang dikenal ke nama perusahaan. Semua request di data bersama memakai `93f25c4d…` (id pada contoh Postman), yang ditampilkan sebagai *PT KALBE FARMA TBK* sesuai desain. Id yang tidak dikenal ditampilkan sebagai "Partner XXXXXXXX".
- **Due date** dihitung oleh API (`requestDate` + `leadTime` hari), jadi ditampilkan read-only di halaman request.
- **Trackings** dikembalikan sudah di-join dengan field tracker-nya (`trackerDescription`, `trackerIcon`…), sehingga sebuah langkah tetap tampil dengan benar meski tracker-nya sudah dihapus.
- **Ikon** disimpan sebagai teks bebas dengan gaya penulisan yang beragam (`fa-check`, `CheckCircle2`, `dna`); nama ikon dinormalisasi dan dipetakan ke ikon yang sesuai, dengan ikon netral untuk nama yang tidak dikenal.
- **Daftar untuk dropdown** dibaca lewat endpoint paging, 100 baris per halaman.
- **Nilai yang disimpan langsung ditampilkan:** halaman request menerapkan nilai yang baru disimpan secara langsung, tanpa menunggu refetch. API meng-cache read, sehingga refetch tepat setelah operasi tulis bisa menampilkan nilai lama.
- **Delete** menonaktifkan record. API assessment membuang body request DELETE, jadi backend menonaktifkan record lewat endpoint update, dan delete permanen tidak disediakan (lihat README backend).

## Catatan desain

- Layout mengikuti desain TrackLab yang diberikan (header tabel hijau, menu aksi baris `…`, kolom boolean ✓/✗, "Show 10" dan "Showing 1 to 10 of N entries").
- Peningkatan: riwayat perubahan per record, timeline tracking visual dengan progress bar, input nilai langkah yang menyesuaikan action type tracker, update *Last Status* otomatis, panel filter yang mendukung banyak nilai (`A||B`), dan layout mobile.
- API tidak memiliki endpoint partner, jadi dropdown perusahaan menampilkan partner dari request yang sudah ada, dengan opsi mengetik partner ID secara manual.
