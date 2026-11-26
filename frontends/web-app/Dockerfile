FROM nginx:1.27-alpine

# Remove a config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copia a configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos
COPY index.html /usr/share/nginx/html/
COPY style.css  /usr/share/nginx/html/
COPY app.js     /usr/share/nginx/html/

EXPOSE 80
