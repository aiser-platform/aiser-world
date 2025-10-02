FROM node:18-alpine

WORKDIR /app

# Install build tools
RUN apk add --no-cache build-base python3 make g++ git

# Copy package files
COPY package.json package-lock.json ./

# Install node modules
RUN npm ci --no-audit --no-fund

# Copy source
COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npm run dev"]


