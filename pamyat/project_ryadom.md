---
name: Project: Ryadom PWA
description: Приложение для локальных событий на карте — текущий статус, архитектура и известные проблемы
type: project
originSessionId: 7667dbb9-d794-4609-9470-f331b5cedd61
---
Ryadom — PWA на Vite + React + Supabase + Yandex Maps JS API 2.1. Деплой на GitHub Pages через GitHub Actions.

**Путь:** `C:\Users\1\Pictures\ryadom`
**URL:** `https://azatilfakovich1993.github.io/ryadom/`
**Repo:** `https://github.com/Azatilfakovich1993/ryadom`

## Ключевая архитектура
- Supabase заблокирован у российских провайдеров → все запросы идут через Cloudflare Worker прокси
- Прокси: `https://ryadom-proxy.azatilfakovich1993.workers.dev`
- VITE_SUPABASE_PROXY_URL задан как GitHub Secret и в .env
- WebSocket (Supabase Realtime) через прокси не работает — индикатор всегда зелёный (hardcoded)

## Текущий статус (2026-04-23)
- Вход/регистрация работает с и без VPN (через прокси)
- События, профиль кешируются в localStorage для работы без VPN
- Карта: Yandex Maps, кастомные пины с glow, без стандартных контролов
- Лента: TikTok-style свайп, city grid background, hologram icons
- Онбординг: 4 экрана, показывается при первом входе
- Навигация: кнопка Яндекс с выбором режима (авто/пешком/транспорт)
- Рейтинг инициаторов: таблица reviews в Supabase
- Достижения: хранятся в localStorage

## Известные проблемы
- Тёмное пятно за кнопкой "+" на карте — Яндекс контролы не скрываются через CSS/API
- Медленная работа без VPN из-за задержки прокси (~1-2 сек на запрос)
- 2GIS убран (плохо работал)
- Supabase Realtime (чат обновления) не работает через прокси

## Ключевые файлы
- `src/App.jsx` — главный компонент, кеш событий/профиля
- `src/lib/supabase.js` — клиент с proxy URL
- `src/components/MapComponent.jsx` — карта
- `src/components/FeedView.jsx` — лента
- `src/components/BottomSheet.jsx` — детали события
- `src/components/OnboardingScreen.jsx` — онбординг
- `.github/workflows/deploy.yml` — CI/CD
