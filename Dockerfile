FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-dev gcc musl-dev
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm install
RUN cd frontend && npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "dev"]
