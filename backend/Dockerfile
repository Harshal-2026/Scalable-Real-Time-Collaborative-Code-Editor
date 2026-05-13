# Use an official Node.js runtime as a parent image
FROM node:18

# Install Java JDK
RUN apt-get update && \
    apt-get install -y default-jdk gcc g++ python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "server.js"]
