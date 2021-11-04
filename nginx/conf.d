server {
    listen 3000;
    ssl on;
    ssl_certificate /app/nginx.crt;
    ssl_certificate_key /app/nginx.key;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    server_name line.testusuke.net;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}