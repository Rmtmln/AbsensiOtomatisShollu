FROM node:18-alpine

WORKDIR /app

# Install curl for time sync fallback
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=8355
ENV NODE_ENV=production

EXPOSE 8355

CMD ["node", "index.js"]
