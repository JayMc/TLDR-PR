# Use the official Node.js 20 image.
FROM node:20

# Create and set the working directory.
WORKDIR /usr/src/app

# Copy package.json and package-lock.json.
COPY package*.json ./

# Install dependencies.
RUN npm install --production

# Copy the rest of the application code.
COPY dist/ .

# Expose the port.
ENV PORT 8080
EXPOSE 8080

# Start the application.
CMD [ "node", "index.js" ]