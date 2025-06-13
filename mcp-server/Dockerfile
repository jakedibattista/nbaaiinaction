# Use a slim Node.js runtime for a smaller image
FROM node:18-slim

# Create a non-root user and group
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Change ownership of the app directory
RUN chown -R appuser:appgroup /usr/src/app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 8765

# Define the command to run your app directly
# This prevents the container from exiting immediately
CMD [ "npx", "@mongodb-js/mongodb-mcp-server" ] 