# Use an official Node.js runtime as a parent image
# Using alpine for a smaller image size
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install app dependencies
# Use --only=production to install only production dependencies
RUN npm install

# Bundle app source
COPY . .

# Expose the correct port
EXPOSE 8080

# Define the command to run your app
CMD ["node", "index.js"] 