# Stage 1: Build frontend (Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Build backend (.NET 10 preview)
FROM mcr.microsoft.com/dotnet/nightly/sdk:10.0 AS backend-builder
WORKDIR /src
COPY server/ .
RUN dotnet publish Rednest.Api/Rednest.Api.csproj -c Release -o /app/publish

# Stage 3: Final image — Nginx + .NET runtime + supervisord
FROM mcr.microsoft.com/dotnet/nightly/aspnet:10.0 AS final

# Install Nginx and Supervisord
RUN apt-get update && apt-get install -y nginx supervisor && rm -rf /var/lib/apt/lists/*

# Copy frontend static files
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy backend binaries
COPY --from=backend-builder /app/publish /app/api

# Copy Nginx config (with /api proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
