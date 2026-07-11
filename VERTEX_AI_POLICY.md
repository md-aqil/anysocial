# Vertex AI & LLM Policy

This document defines the strict architecture for LLM and AI services in SEO-Genie-AI. All developers and AI agents MUST adhere to these rules to maintain system stability and GCP compliance.

## 1. Strict Vertex AI Enforcement
*   **Provider Lock**: All LLM (Text), RAG (Embeddings), and Image (Imagen) services MUST use **Google Cloud Vertex AI**.
*   **No Fallbacks**: Do NOT implement or revert to the Public Gemini API (Generative Language API) or any other providers (OpenAI, Anthropic) unless explicitly requested by the project owner.
*   **Authentication**: All requests must use the Service Account JSON credentials via the `google-auth-library` or `gcloud` token system.

## 2. Model Configuration
The following models are confirmed working and enabled for project `project-bcd01169-8285-4613-a17`. Do NOT change these without verifying access in the GCP Model Garden.

| Service | Model ID | Region |
| :--- | :--- | :--- |
| **Primary Writing** | `gemini-2.5-flash` | `us-central1` |
| **Document Parsing** | `gemini-2.5-flash` | `us-central1` |
| **Embeddings (RAG)** | `text-embedding-004` | `us-central1` |
| **Image Generation** | `imagen-3.0-generate-001` | `us-central1` |

## 3. Environment & Security
*   **Config Location**: On production (VPS), the `.env` and Service Account JSON MUST live in `/etc/seo-genie/`.
*   **Symlinking**: The app MUST use symlinks to access these secrets. Do NOT copy secrets into the `/var/www/` directory.
*   **Initialization**: `dotenv.config()` MUST be called at the very first line of the entry point (`server/src/index.ts`) to prevent stale Project ID errors during ESM module loading.

## 4. Forward Compatibility
*   If an older campaign requests `gemini-1.5` or `gemini-2.0`, the system is configured to **auto-upgrade** these requests to `gemini-2.5-flash` to prevent 404 errors. Do NOT remove this mapping from `GeminiProvider.ts`.

## 5. Deployment
*   Any change to the AI models MUST be tested using the diagnostic script (`diagnose_models.js`) before being pushed to production.
