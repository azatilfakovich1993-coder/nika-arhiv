---
name: Project: Good_Вахта
description: Вахтовая биржа труда — два отдельных проекта. v1 — vanilla JS + TG/VK/Web. v2 — React + Vite + Supabase, новый дизайн.
type: project
originSessionId: 5b9dcccf-862e-4ec3-a03e-3fe8cbebbf74
---
## v2 — Новый проект (текущий)
Путь: `C:\Users\1\Pictures\good-vahta-v2`
Создан 2026-04-17 по новой спецификации.
Dev-сервер: `npm run dev` → http://localhost:5173

**Стек:** Vite + React 18 + React Router v6 + Supabase JS v2

**Дизайн-система:**
- Акцент: `#18181B` (почти чёрный), энергия: `#84CC16` (лайм)
- Фон `#FFFFFF`, карточки `#FAFAFA`, бордер `#E4E4E7`
- Основная кнопка: bg `#18181B`, text `#84CC16`, border-radius `20px`
- Шрифт: Inter, стиль минималистичный

**Структура:**
```
src/
  styles/global.css         — дизайн-токены, btn, badge, form, modal, toast
  contexts/AuthContext.jsx  — Supabase Auth + profile/company state
  hooks/useToast.js         — глобальные тосты
  components/
    layout/
      WorkerLayout.jsx      — левый сайдбар + мобильный nav для соискателя
      EmployerLayout.jsx    — левый сайдбар + мобильный nav для работодателя
      Layout.css            — стили лейаутов
    ui/Toast.jsx            — Toast container
    employer/CreateJobModal.jsx — модал создания/редактирования вакансии
  pages/
    AuthPage.jsx/css        — логин + регистрация с выбором роли
    worker/
      JobsPage.jsx          — поиск вакансий с фильтрами
      JobDetailPage.jsx     — карточка вакансии + отклик
      ResumesPage.jsx       — мои резюме, CRUD
      ResponsesPage.jsx     — мои отклики
      FavoritesPage.jsx     — избранные вакансии
      InvitationsPage.jsx   — приглашения от работодателей
      RecommendationsPage.jsx — рекомендации по специальности
      NotificationsPage.jsx — уведомления
      ProfilePage.jsx       — профиль соискателя
    employer/
      JobsPage.jsx          — мои вакансии + управление
      ResponsesPage.jsx     — все отклики + ответ соискателю
      ResumeDatabasePage.jsx — база резюме + приглашение
      AnalyticsPage.jsx     — аналитика + статистика
      CompanyProfilePage.jsx — профиль компании + верификация
      InvitationsPage.jsx   — отправленные приглашения
      ReviewsPage.jsx       — отзывы о компании
  App.jsx                   — роутинг, RequireAuth, RootRedirect
  main.jsx                  — точка входа
supabase_schema.sql         — SQL для создания таблиц в Supabase
.env                        — VITE_SUPABASE_URL, VITE_SUPABASE_KEY
```

**Supabase таблицы:** `profiles`, `companies`, `jobs`, `resumes`, `job_responses`, `invitations`, `favorites`, `reviews`, `notifications`

**Монетизация (заложена в дизайн):** верификация компании (`companies.verified`), поднятие вакансии в топ (поле `boosted` можно добавить), пакеты работодателя.

**Why:** Пользователь хотел полностью новый проект на React с чистым B&W дизайном, не переделку старого.
**How to apply:** При работе с v2 — только папка `good-vahta-v2`, не трогать `good-vahta` (v1).

---

## v1 — Старый проект
Путь: `C:\Users\1\Pictures\good-vahta`
Vanilla JS + Vite, TG Mini App + VK Mini App + Web.

**Это активный проект, с которым реально идёт работа** (v2 выше похоже заброшен/неактуален — много правок в 2026-06 шли именно в v1, vanilla JS).

**Инфраструктура (2026-06):**
- GitHub: https://github.com/azatilfakovich1993-coder/good-vahta (публичный — приватные репозитории были недоступны из-за лимита аккаунта)
- Деплой: `surge dist/ good-vahta.surge.sh` → https://good-vahta.surge.sh
- Supabase проект: `edlhhxmisqhfpkvlhwst.supabase.co` — пересоздан в 2026-06 (старый проект исчерпал лимит 2 бесплатных проектов на аккаунте), `.env` не в git, see [[feedback-git-autopush]]
- RLS был включён по умолчанию на новых таблицах и блокировал все записи (companies, vacancies) без явной ошибки в UI — пришлось `disable row level security` на всех таблицах вручную через SQL Editor
- **RLS периодически включается заново сам** (наблюдалось 2026-06-22 на таблице `resumes` — `migration/fix_rls.sql` уже содержит готовый фикс для всех 8 таблиц: vacancies, companies, job_responses, resumes, reviews, invitations, messages, referrals). При жалобах на "не сохраняется"/"не видно" в любой части приложения — первым делом проверить RLS через `migration/fix_rls.sql` в SQL Editor проекта `edlhhxmisqhfpkvlhwst`, прежде чем искать баг в JS-логике.
- См. [[feedback-git-autopush]] — коммитить и пушить в конце каждой сессии без напоминаний
- См. [[feedback-self-verify]] — пользователь просил самостоятельно перепроверять каждый шаг (включая реальный e2e-тест через браузер, а не только чтение кода)

**Архитектура поиска (2026-06-22):** `src/screens/jobs.js` — поиск вакансий (воркер), `src/screens/misc.js` (`filterResumeDb`/`toggleRdbActive`) — поиск персонала/база резюме (работодатель), данные резюме приходят из `src/api/resumes.js` `loadPublicResumes()` (фильтр `published=true` на сервере). Видимость резюме регулируется глобальным тогглом `workerStatus.open` ("В поиске работы", `src/store/index.js`, дефолт должен быть `true`) + индивидуальным архивированием через `toggleResumePublished`. `src/screens/templates.html` — мёртвый неиспользуемый файл-черновик (не импортируется), реальная разметка — в корневом `index.html`; не доверять `templates.html` при поиске актуальных onclick-хендлеров.
