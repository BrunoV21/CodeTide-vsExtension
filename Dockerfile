# Use official Node.js LTS image with Python pre-installed
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV NODE_ENV=development
ENV PYTHONUNBUFFERED=1
ENV VSCODE_EXTENSION_PATH=/workspace

# Create and set working directory
WORKDIR /workspace

# Copy package files first for better layer caching
COPY package*.json ./
COPY python/requirements.txt ./python/

# Install Node.js dependencies
RUN npm install --include=dev

# Install Python dependencies in a virtual environment
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r python/requirements.txt

# Copy remaining files (excluded in .dockerignore)
COPY . .

# Set up VS Code extension development environment
RUN npm run compile

# Set default command to run tests
CMD ["npm", "test"]