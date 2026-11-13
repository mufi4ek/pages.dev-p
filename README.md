# MUFI.DEV — motion portfolio

Статичный сайт-портфолио: HTML + CSS + vanilla JS, без сборки и зависимостей. Готов к Cloudflare Pages.

## Что внутри
- Анимированный loader со спиралью MUFI.
- 6 работ с живыми CSS/SVG-превью, фильтрами и модальным разбором.
- Motion Lab: 3 знака, 11 параметров, drag-поворот, сброс, рандом, экспорт SVG.
- Услуги, обо мне, контакт, локальный генератор брифа (.txt / copy / mailto).
- Переключатель анимаций, `prefers-reduced-motion`, локальные шрифты, 404, `_headers`.

## Локальный запуск
Откройте `index.html` или поднимите любой статический сервер:

```bash
python3 -m http.server 8080
# или
npx serve .
```

## Деплой на Cloudflare Pages (бесплатно)
### Вариант 1 — Drag & Drop
1. Откройте Cloudflare Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Drag and drop your files**.
2. Назовите проект, например `mufi-portfolio`.
3. Перетащите **содержимое** этой папки (или zip, где `index.html` лежит в корне архива).
4. Нажмите **Deploy site**. Получите адрес `https://<project>.pages.dev`.

### Вариант 2 — Wrangler CLI
```bash
npx wrangler pages deploy . --project-name=mufi-portfolio
```

Сборка не нужна: framework preset — **None**, build command — пусто, output directory — `/` или `.`.

## Домен
В Pages → **Custom domains** добавьте `mufi.dev` или `www.mufi.dev` и следуйте подсказкам DNS.

## Что заменить под себя
- Почта: `hello@mufi.dev` в `index.html` и `assets/js/main.js`.
- Тексты работ/услуг и бюджеты в брифе.
- OG-картинка: `assets/img/og.svg` (при желании замените на PNG 1200×630).

## Производительность
- Нет внешних CDN, видео и тяжёлых библиотек.
- Анимации вне экрана ставятся на паузу.
- Motion Lab использует один `requestAnimationFrame` и останавливается вне экрана / на паузе / при скрытой вкладке.
- Шрифты локальные, `font-display: swap`.
