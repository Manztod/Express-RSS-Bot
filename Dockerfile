# Gunakan image Node.js versi terbaru
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json dan package-lock.json first (untuk caching)
COPY package*.json ./

# Install dependencies secara clean
RUN npm install --production

# Copy semua file project
COPY . .

# Beri label port (opsional)
EXPOSE 3000

# Jalankan bot dan server
CMD ["npm", "start"]
