# HTTP: redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name studio.bawebtech.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    return 301 https://$host$request_uri;
}

# HTTPS: SPA + API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name studio.bawebtech.com;

    # Once issued via certbot (webroot mode), Studio's certs will live here:
    ssl_certificate /etc/letsencrypt/live/studio.bawebtech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/studio.bawebtech.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Static SPA (Vite build output)
    root /home/ubuntu/studio/client/dist;
    index index.html;

    # Allow ACME on HTTPS too (harmless)
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # API → Node on 6000
    location /api/ {
        proxy_pass http://127.0.0.1:6000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }

    # Optional: keep direct health check on backend
    location /health {
        proxy_pass http://127.0.0.1:6000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: direct DB health check on backend
    location /health/db {
        proxy_pass http://127.0.0.1:6000/health/db;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache immutable assets
    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA fallback
    location / {
        try_files $uri /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    }
}
