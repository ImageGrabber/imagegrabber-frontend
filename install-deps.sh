#!/bin/bash

echo "Installing missing dependencies..."

# Install the missing packages
npm install date-fns@^4.1.0
npm install recharts@^2.12.7
npm install fast-xml-parser@^4.4.2

echo "Dependencies installed successfully!"
echo "You can now run: npm run build" 