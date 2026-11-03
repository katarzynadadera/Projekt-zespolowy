# Projekt

## Instalacja zależności

```bash
npm install express dotenv knex pg ejs bcryptjs express-session --save
npm install nodemon @faker-js/faker --save-dev
npm install jest supertest --save-dev
npm audit fix
```

## Konfiguracja bazy danych w Dockerze

```bash
# Pobierz obraz PostgreSQL
docker pull postgres:latest

# Uruchom kontener z PostgreSQL
docker run --detach --env POSTGRES_USER=postgres --env POSTGRES_PASSWORD=projekt --publish 5432:5432 --name postgresql postgres

# Utwórz bazę danych sklep_ksiazki
docker exec -it postgresql bash -c "psql -U postgres -c 'CREATE DATABASE sklep_ksiazki;'"
```

## Migracje i seedy (npx)

```bash
# Utwórz migrację
npx knex migrate:make create_tables

# Uruchom migrację
npx knex migrate:latest

# Utwórz pliki seedów
npx knex seed:make nazwa

# Uruchom seedy
npx knex seed:run
```

### Zmiany w migracjach:

```bash
# Wycofanie wszystkich migracji
npx knex migrate:rollback --all

# Ponowne uruchomienie migracji
npx knex migrate:latest

# Ponowne wypełnienie bazy danymi
npx knex seed:run
```

## Testowanie
```bash
# Uruchomienie testów
npm test

# Testowanie pokrycia
npm run coverage
```

### Przykładowe karty spełniające algorytm Luhna
```bash
4392193402002548
4240099725843787
4831297411249518
4705384319759906
4908863636844108
```

### Dane logowania admina z seeda
admin@ksiegarnia.pl
admin123