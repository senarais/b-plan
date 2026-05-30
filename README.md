<div align="center">
<img width="1000" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# b-plan (UMKM Social Media Manager)

b-plan adalah tool manajemen konten media sosial berbasis AI yang mengotomasi proses pembuatan *content calendar* mingguan (termasuk ide visual, *caption*, dan *hashtag*) untuk UMKM.

## ✨ Fitur Utama (MVP)
* **Content Calendar Generator:** Menghasilkan draf kalender 7 hari lengkap dengan tipe konten, platform, ide gambar, *caption*, *hashtag*, dan jadwal *posting* terbaik.
* **Content Editor:** Kustomisasi teks *caption* dan manajemen *hashtag*.

## 🛠️ Tech Stack
* **Frontend:** Next.js 14, TypeScript, Tailwind CSS
* **Backend:** Google Cloud Functions / Cloud Run, Express.js
* **Database & Auth:** Firestore, Firebase Authentication
* **AI Integration:** Gemini API

## 🚀 Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

View your app in AI Studio: https://ai.studio/apps/b523851e-7de7-4555-977b-9109895eefe3
