FROM mysql:8.0

# Копируем SQL скрипты для инициализации таблиц
# Они будут выполнены автоматически при первом запуске контейнера
COPY ./backend/t_users.sql /docker-entrypoint-initdb.d/1_users.sql
COPY ./backend/t_reports.sql /docker-entrypoint-initdb.d/2_reports.sql
COPY ./backend/t_pdfs.sql /docker-entrypoint-initdb.d/3_pdfs.sql
COPY ./backend/t_add_user.sql /docker-entrypoint-initdb.d/4_add_user.sql

# Устанавливаем права доступа (на всякий случай)
RUN chmod a+r /docker-entrypoint-initdb.d/*
