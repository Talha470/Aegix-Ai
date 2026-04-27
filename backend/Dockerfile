FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-numpy \
    py3-scikit-learn

COPY package*.json ./
RUN npm install

COPY . .

# Copy ML dataset into container
COPY ML/all_logs_dataset.json /app/ML/

EXPOSE 8080
CMD ["node", "Server.js"]
