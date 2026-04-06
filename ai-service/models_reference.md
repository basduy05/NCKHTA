# AI Models Reference (Gemini & Cohere)

This document records the available models and their quotas as of April 6, 2026. These models are to be used in the `llm_service.py` to optimize performance and quota utilization.

## 1. Google Gemini Models

| Model Category | Model Name | RPM | TPM | RPD |
| :--- | :--- | :--- | :--- | :--- |
| Text-out | **Gemini 3.1 Flash Lite** | 15 | 250K | 500 |
| Text-out | **Gemini 3.1 Pro** | 0 | 0 | 0 |
| Text-out | **Gemini 3 Flash** | 5 | 250K | 20 |
| Text-out | **Gemini 2.5 Flash** | 5 | 250K | 20 |
| Text-out | **Gemini 2.5 Flash Lite** | 10 | 250K | 20 |
| Text-out | **Gemini 2.5 Pro** | 0 | 0 | 0 |
| Text-out | **Gemini 2 Flash** | 0 | 0 | 0 |
| Text-out | **Gemini 2 Flash Lite** | 0 | 0 | 0 |
| Other | **Gemma 3 27B** | 30 | 15K | 14.4K |
| Other | **Gemma 3 12B** | 30 | 15K | 14.4K |
| Other | **Gemma 3 4B** | 30 | 15K | 14.4K |
| Other | **Gemma 3 1B** | 30 | 15K | 14.4K |
| Other | **Gemma 4 31B** | 15 | Unlimited | 1.5K |
| Other | **Gemma 4 26B** | 15 | Unlimited | 1.5K |
| Live API | **Gemini 3 Flash Live** | Unlimited | 65K | Unlimited |
| Live API | **Gemini 2.5 Flash Native Audio Dialog** | Unlimited | 1M | Unlimited |
| Multimodal | **Nano Banana 2 (Gemini 3.1 Flash Image)** | 0 | 0 | 0 |

## 2. Cohere Models

| Model Tier | Model Name | Status |
| :--- | :--- | :--- |
| Advanced | **command-r-08-2024** | Verified |
| Advanced | **command-r-plus-08-2024** | Verified |
| Specialized | **command-a-reasoning-08-2025** | NEW |
| Specialized | **command-a-03-2025** | NEW |
| Specialized | **command-a-translate-08-2025** | NEW |
| Specialized | **command-a-vision-07-2025** | NEW |
| Lightweight | **tiny-aya-fire** | Verified |
| Lightweight | **tiny-aya-earth** | Verified |

## Optimization Strategy

### High Latency/Complexity (HARD)
1. `gemini-3.1-pro` (if quota exists)
2. `gemini-2.5-pro` (if quota exists)
3. `command-r-plus-08-2024`

### Standard Tasks (MEDIUM)
1. `gemini-3.1-flash-lite` (High RPM: 15)
2. `gemini-3-flash` (High Quota: 250K TPM)
3. `command-r-08-2024`

### High Velocity/Fast Response (EASY)
1. `gemini-3.1-flash-lite` 
2. `gemma-3-27b` (High RPM: 30)
3. `command-a-03-2025` (Fastest NEW)
4. `tiny-aya-fire` (Minimal latency)
