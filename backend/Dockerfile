FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Initialize the database (SQLite)
# RUN npx knex migrate:latest --env production # If using migrations

EXPOSE 8080
ENV PORT=8080

CMD ["node", "index.js"]
