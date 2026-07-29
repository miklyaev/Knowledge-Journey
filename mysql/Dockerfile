FROM mysql:8.0

# Настраиваем UTF-8 для кириллицы и символов вне BMP во всех новых БД и таблицах
COPY ./mysql/conf.d/charset.cnf /etc/mysql/conf.d/charset.cnf

# Копируем SQL скрипты для инициализации таблиц
# Они будут выполнены автоматически при первом запуске контейнера
COPY ./backend/t_users.sql /docker-entrypoint-initdb.d/1_users.sql
COPY ./backend/t_reports.sql /docker-entrypoint-initdb.d/2_reports.sql
COPY ./backend/t_pdfs.sql /docker-entrypoint-initdb.d/3_pdfs.sql
COPY ./backend/t_requests.sql /docker-entrypoint-initdb.d/4_requests.sql
COPY ./backend/t_add_user.sql /docker-entrypoint-initdb.d/5_add_user.sql

# Устанавливаем права доступа (на всякий случай)
RUN chmod a+r /docker-entrypoint-initdb.d/*
