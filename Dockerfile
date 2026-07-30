# Stage 1: Build the project (Vite)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency files and install them
COPY package*.json ./
RUN npm install

# Copy the rest of the code and build the project
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Serve static files using Nginx
FROM nginx:alpine
# Copy the built files from the first stage to the Nginx folder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (optional, but useful for React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
