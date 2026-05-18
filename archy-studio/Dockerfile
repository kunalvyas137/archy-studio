FROM node:22-slim

WORKDIR /app

# Install system dependencies needed for Archy and Git operations
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Download and install the Genesys Cloud Archy CLI for Linux
RUN mkdir -p /opt/archy \
    && curl -sSL -o archy.zip "https://sdk-cdn.mypurecloud.com/archy/latest/archy-linux.zip" \
    && unzip archy.zip -d /opt/archy \
    && chmod +x /opt/archy/archy \
    && chmod -R +x /opt/archy/archyBin \
    && ln -s /opt/archy/archy /usr/local/bin/archy \
    && rm archy.zip

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the Vite frontend application
RUN npm run build

# Configure environment for production
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Archy Studio profiles default to ~/.archy-studio, ensure it exists
RUN mkdir -p /root/.archy-studio/profiles && chmod 700 /root/.archy-studio

EXPOSE 3001

CMD ["node", "server/server.js"]
