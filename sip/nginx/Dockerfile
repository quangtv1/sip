FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create static files directory for future React build
RUN mkdir -p /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
