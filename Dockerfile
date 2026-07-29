# Этап 1: Сборка проекта (Vite)
FROM node:20-alpine AS builder
WORKDIR /app

# Копируем файлы зависимостей и устанавливаем их
COPY package*.json ./
RUN npm install

# Копируем весь остальной код и собираем проект
COPY . .
RUN npm run build

# Этап 2: Раздача статики через Nginx
FROM nginx:alpine
# Копируем собранные файлы из первого этапа в папку Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем кастомный конфиг Nginx (опционально, но полезно для React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
