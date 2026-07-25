# ⚡ Forecastify

> **AI-Powered Demand Forecasting & Smart Inventory Telemetry for Kirana Stores & Retailers**

Forecastify is an enterprise-grade, AI-driven retail intelligence platform designed specifically for kirana stores and independent retailers. It transforms raw sales data into high-accuracy demand predictions, automates supplier reordering, flags expiry risks, and provides real-time AI shopkeeper assistance.

---

## 🌟 Key Features

* **⚡ J.A.R.V.I.S. AI Engine**: Voice-enabled conversational AI assistant powered by Groq & Gemini with local activity memory, speech synthesis, and instant PDF report generation.
* **📈 Dynamic Demand Spike Analysis**: Predictive analytics factoring in weather impact (OpenWeather API), local festivals, external market trends (Serper API), and seasonal surges.
* **📦 Expiry & Waste Risk Shield**: Automated batch-level tracking that flags stock nearing expiry and suggests automated clearance discount strategies.
* **🛒 Smart Purchase List & Cart Automation**: Reorder calculations considering safety stock buffers, lead times, and cash flow constraints.
* **🧩 Chrome Procurement Extension**: Includes a Chrome Extension (Manifest V3) for automated one-click order placement on distributor portals.
* **🌐 Multilingual Support**: Built-in localization support for English and Hindi (`en` / `hi`).
* **🎨 Aether Spatial Design System**: Ultra-sleek, accessible UI using OKLCH color tokens, monospaced tabular numerics (`tabular-nums font-mono`), and high-deference dark/light themes.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [Next.js](https://nextjs.org/) (App Router), React 19, TypeScript |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), Lucide Icons, Framer Motion |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Realtime) |
| **AI & LLM Engines** | [Groq Llama 3](https://groq.com/), Google Gemini API, HuggingFace |
| **External APIs** | OpenWeather API, Serper Web Search API, Web Speech API |
| **Procurement Extension**| Vite, TypeScript, Chrome Extension MV3 (`extension/`) |
| **Infrastructure** | Production Kubernetes (`k8s/`), Kustomize, Helm, ArgoCD GitOps |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher

### 1. Clone the Repository

```bash
git clone git@github.com:Harsh-Basatwar/forecastify.git
cd forecastify
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧩 Chrome Extension Setup (`extension/`)

Forecastify includes a browser extension located in the `extension/` directory.

1. Navigate to the extension directory and build:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select the `extension/dist` folder.

---

## ☸️ Kubernetes & Infrastructure (`k8s/`)

Forecastify features a production-grade Kubernetes architecture supporting **Pod Security Admission (Restricted Profile)**, NetworkPolicies, ServiceMonitors, and Kustomize overlays.

### Cluster Directory Structure

```
k8s/
├── base/           # Base Workloads, RBAC, SecurityContext, NetworkPolicies, Quotas
├── overlays/       # Kustomize Overlays (dev, staging, production)
├── gitops/         # ArgoCD Application Manifests
├── helm/           # Helm Chart Packaging
└── docs/           # Architecture Specifications
```

### Deploy to Kubernetes (Production Overlay)

```bash
kubectl apply -k k8s/overlays/production
```

For complete architecture details, see [k8s/docs/ARCHITECTURE.md](k8s/docs/ARCHITECTURE.md).

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
