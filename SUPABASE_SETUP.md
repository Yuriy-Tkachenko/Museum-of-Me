# Подключение облачного Supabase

Docker для этого варианта не нужен. Код входа, создания музеев, приглашений, воспоминаний и портретов уже подключён к Supabase SDK.

1. Создайте облачный проект на https://supabase.com/dashboard или откройте существующий.
2. Запишите его настройки в `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```

   Нужны ключи `anon` и `service_role` из настроек API проекта; они могут находиться во вкладке legacy API keys. `service_role` — серверный секрет: не помещайте его в переменные `NEXT_PUBLIC_*`, не отправляйте в чат и не коммитьте `.env.local`. `SECURITY_SECRET` уже создан локально; сохраните его значение.

3. Для нового пустого проекта выполните файлы в SQL Editor по очереди:

   - `supabase/migrations/202609110001_initial_museum_schema.sql`
   - `supabase/migrations/202609130001_security_pass.sql`
   - `supabase/migrations/202609130002_public_mvp.sql`
   - `supabase/migrations/202610060001_museum_portraits.sql`
   - `supabase/migrations/202610080001_explicit_api_grants.sql`

   Для нового пустого проекта можно выполнить один объединённый файл `supabase/setup-new-project.sql`. Команда `npm run supabase:prepare` пересобирает его из актуальных миграций. Не выполняйте одновременно объединённый файл и отдельные миграции.

   Для существующей базы выполните только ещё не применённые миграции. Не повторяйте начальную миграцию поверх существующих таблиц. Хранилища `exhibits` и `portraits` должны оставаться приватными.

4. В настройках Supabase Auth задайте Site URL `http://localhost:3000` и разрешённый Redirect URL `http://localhost:3000/auth/callback`. Оставьте вход по email включённым. В шаблонах Magic Link и Confirm Signup должны быть код `{{ .Token }}` и ссылка `{{ .ConfirmationURL }}`. Для входа пользователей за пределами команды проекта настройте свой SMTP: https://supabase.com/docs/guides/auth/auth-smtp.
5. Выполните `npm run supabase:check`. Проверка читает схему, Auth и настройки хранилищ, не создавая пользователей или музеев. Затем перезапустите локальный сервер и откройте http://localhost:3000.

После подключения кнопка создания ведёт на вход по почте. После ввода кода можно заполнить имя, адрес музея, загрузить портрет и создать музей. Он сохранится в базе, а в кабинете появится приглашение для друзей.

Создание музея не требует Turnstile. Для отправки воспоминаний друзьями дополнительно задайте `NEXT_PUBLIC_TURNSTILE_SITE_KEY` и `TURNSTILE_SECRET_KEY` настоящего виджета Cloudflare, разрешающего `localhost`. Поиск сторонних изображений необязателен и требует `PEXELS_API_KEY`; личные фото и текстовые воспоминания его не требуют.
