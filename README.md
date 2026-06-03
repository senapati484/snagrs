# 🎬 Snagr

<p align="center">
  <strong>Modern multi-platform video & audio downloader built with Next.js.</strong>
</p>

<p align="center">
  Download videos and audio from YouTube, Instagram, TikTok, Twitter/X, and Reddit with a fast, clean, mobile-friendly interface.
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-v5-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel" alt="Vercel"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"></a>
</p>

---

## ✨ Features

- 🎥 Download MP4 videos from multiple platforms
- 🎵 Extract MP3 audio quickly
- ⚡ Fast Next.js API route architecture
- 📱 Mobile responsive UI
- 🌙 Clean modern interface
- 🔗 Paste-and-download workflow
- 🚫 No external binaries required
- ☁️ Easy Vercel deployment

---

## 🌍 Supported Platforms

| Platform | Support |
| :-- | :-- |
| YouTube | Video + Audio |
| Instagram Reels | Video |
| TikTok | Video |
| Twitter/X | Video |
| Reddit | Video |

> YouTube downloads currently support resolutions up to 720p.

---

## 🏗️ Tech Stack

- Next.js 14
- TypeScript
- Zustand
- Tailwind CSS
- Vercel

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/senapati484/snagrs.git
cd snagrs
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start development server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

---

## ⚙️ Deployment

### Deploy on Vercel

1. Push repository to GitHub
2. Import project into Vercel
3. Deploy instantly

No environment variables are required for the default setup.

---

## 🧠 Architecture

Snagr keeps the architecture intentionally lightweight:

```txt
Client UI
   ↓
Next.js API Routes
   ↓
Platform media extraction
   ↓
Browser downloads directly from CDN/media source
```

### Core Principles

- No heavyweight backend infrastructure
- No FFmpeg dependency
- No external worker servers
- Minimal latency between extraction and download
- Simple deployment pipeline

---

## 📂 Project Structure

```txt
snagrs/
├── app/                # Next.js App Router
├── components/         # Reusable UI components
├── lib/                # Shared utilities
├── store/              # Zustand state management
├── api/                # API route handlers
├── public/             # Static assets
└── styles/             # Tailwind/global styles
```

---

## 🛣️ Roadmap

- [ ] Better download progress feedback
- [ ] Unified URL parser system
- [ ] Improved metadata previews
- [ ] Docker support
- [ ] Playwright E2E tests
- [ ] Better mobile optimizations
- [ ] Download history
- [ ] More platform support

---

## 🤝 Contributing

Contributions are welcome.

If you'd like to improve Snagr:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

Check the open issues section for beginner-friendly tasks.

---

## ⚠️ Legal Disclaimer

Snagr is intended for personal and educational use only.

Users are responsible for complying with:

- platform Terms of Service
- copyright laws
- local regulations

The maintainers of this project do not encourage copyright infringement or unauthorized distribution of media.

---

## 📄 License

MIT License © senapati484
