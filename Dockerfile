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

# Stage 3: Final image — .NET serves everything
FROM mcr.microsoft.com/dotnet/nightly/aspnet:10.0 AS final
WORKDIR /app

# Copy backend binaries
COPY --from=backend-builder /app/publish .

# Copy frontend static files into wwwroot
COPY --from=frontend-builder /app/dist ./wwwroot

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
CMD ["dotnet", "Rednest.Api.dll"]
