# Projekt Zespołowy - Aplikacja Bazodanowa: Wypożyczalnia i Sklep z Książkami

## Opis projektu
Aplikacja webowa typu hybrydowego, łącząca funkcjonalności **cyfrowej wypożyczalni książek (PDF/online)** z **tradycyjnym sklepem oferującym fizyczne egzemplarze**. System umożliwia przeglądanie katalogu, zarządzanie koszykiem oraz realizację zamówień w obu formatach.

Sercem aplikacji jest relacyjna baza danych PostgreSQL, która przechowuje informacje o produktach, użytkownikach, stanach magazynowych oraz historii transakcji.

---

## Używane technologie
Projekt wykorzystuje następujące technologie:

-   **Backend:** Node.js, Express.js
-   **Baza Danych:** PostgreSQL
-   **ORM/Query Builder:** Knex.js (migracje, seedowanie, zapytania)
-   **Frontend:** EJS (szablony), CSS3, JavaScript
-   **Bezpieczeństwo:** Bcrypt.js (hashowanie haseł), Express-Session (zarządzanie sesją)

---

## Główne możliwości aplikacji
Aplikacja ma kilka kluczowych funkcjonalności:

* **Katalog i Wyszukiwanie:** Przeglądanie oferty z podziałem na formaty (E-book / Fizyczna) oraz wyszukiwanie książek.
* **Proces Zakupowy:** Funkcjonalny koszyk, składanie zamówień i symulacja płatności.
* **Dostęp do treści:** Po zakupie e-booka użytkownik może go czytać bezpośrednio w przeglądarce.
* **Panel Użytkownika:** Pełna historia zamówień ze statusami, zarządzanie danymi konta i biblioteka zakupionych treści.
* **Panel Admina:** Kompletny moduł do zarządzania sklepem, umożliwiający zarządzanie książkami, zamówieniami i użytkownikami.

---

## Struktura Projektu

```text
projekt-zespolowy/
├── app.js               # Główny plik serwera i konfiguracja middleware
├── knexfile.js          # Konfiguracja połączenia z bazą danych
├── db/
│   ├── migrations/      # Skrypty tworzące strukturę tabel
│   └── seeds/           # Dane testowe
├── public/
│   ├── css/             # Arkusze stylów
│   ├── js/              # Skrypty frontendowe (walidacja formularzy, obsługa koszyka)
│   ├── images/          # Okładki książek
│   └── files/           # Pliki PDF dla e-booków
├── routes/              # Logika biznesowa i routing (API)
│   ├── admin.js         # Panel administratora (CRUD książek, użytkownicy, zamówienia)
│   ├── auth.js          # Uwierzytelnianie (logowanie, rejestracja)
│   ├── books.js         # Obsługa katalogu (lista i szczegóły)
│   ├── cart.js          # Operacje na koszyku
│   ├── orders.js        # Składanie zamówień i płatności
│   ├── search.js        # Logika wyszukiwania i system podpowiedzi
│   └── user.js          # Profil użytkownika, historia i dostęp do plików
└── views/               # Szablony widoków (EJS)
    ├── admin/           # Widoki panelu administratora
    ├── partials/        # Elementy współdzielone (nagłówek, stopka)
    └── ...              # Widoki poszczególnych podstron