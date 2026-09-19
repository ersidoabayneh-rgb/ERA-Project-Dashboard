# Ethiopian Roads Administration ERP Dashboard

A comprehensive, responsive road construction project dashboard aligning with PMBOK 8th edition, EVM, and FIDIC standards for the Ethiopian Roads Administration.

---

## 🚀 GitHub Pages Deployment Guide

If you are hosting this repository on **GitHub Pages**, follow either of the methods below to ensure the application builds and loads smoothly:

### Method 1: Automated Deployment via GitHub Actions (Recommended)

This repository includes a pre-configured GitHub Actions workflow (`.github/workflows/deploy.yml`).

1. Open your repository on GitHub.
2. Go to **Settings** → **Pages** (in the left sidebar).
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. That's it! Any new push to `main` or `master` will automatically compile and deploy the production build.

---

### Method 2: Deploy from the `/docs` Folder

If you prefer branch-based static deployment without GitHub Actions:

1. Run the production build locally:
   ```bash
   npm run build
   ```
   *(This generates both `dist/` and `docs/` with `.nojekyll` and SPA fallback handlers).*
2. Commit and push your changes to GitHub:
   ```bash
   git add docs/
   git commit -m "Build production bundle for GitHub Pages"
   git push origin main
   ```
3. Go to **Settings** → **Pages**.
4. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
5. Select **Branch: `main`** and **Folder: `/docs`**, then click **Save**.

---

## 💻 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```
