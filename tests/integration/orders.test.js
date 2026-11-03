const request = require('supertest');
const app = require('../../app');
const knex = require('knex')(require('../../knexfile').test);

describe('Testy integracyjne - Zamówienia (orders.js)', () => {
    
    const agent = request.agent(app);
    let testUserId;
    let physicalBookId;
    let digitalBookId;

    beforeAll(async () => {
        // Czyszczenie stanu bazy przed testami
        await knex('users').where('email', 'klient_zamowienia@ksiegarnia.pl').del();
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('Haslo123!', 10);
        
        // Inicjalizacja testowego użytkownika
        const [user] = await knex('users').insert({
            username: 'klient_zamowienia',
            email: 'klient_zamowienia@ksiegarnia.pl',
            password_hash: hash,
            first_name: 'Jan',
            last_name: 'Klient',
            role: 'user'
        }).returning('id');
        testUserId = typeof user === 'object' ? user.id : user;

        // Autoryzacja sesji agenta testowego
        await agent.post('/login').send({
            email: 'klient_zamowienia@ksiegarnia.pl',
            password: 'Haslo123!'
        });

        // Inicjalizacja testowego asortymentu
        const [physicalBook] = await knex('books').insert({
            title: 'Testowa Fizyczna do Zamówień',
            is_physical_available: true,
            physical_stock: 5,
            physical_price: '40.00',
            is_digital_available: false
        }).returning('id');
        physicalBookId = typeof physicalBook === 'object' ? physicalBook.id : physicalBook;

        const [digitalBook] = await knex('books').insert({
            title: 'Testowa Cyfrowa do Zamówień',
            is_digital_available: true,
            digital_price: '25.00',
            is_physical_available: false
        }).returning('id');
        digitalBookId = typeof digitalBook === 'object' ? digitalBook.id : digitalBook;
    });

    afterAll(async () => {
        // Sprzątanie po teście
        if (testUserId) {
            await knex('cart_items').where('user_id', testUserId).del();
            await knex('orders').where('user_id', testUserId).del();
        }
        if (physicalBookId && digitalBookId) {
            await knex('books').whereIn('id', [physicalBookId, digitalBookId]).del();
        }
        if (testUserId) {
            await knex('users').where('id', testUserId).del();
        }
        await knex.destroy();
    });

    describe('GET /checkout/cart (Widok kasy)', () => {
        test('powinno przekierować do /browse jeśli koszyk jest pusty', async () => {
            const response = await agent.get('/checkout/cart');
            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/browse');
        });

        test('powinno wyświetlić kasę z doliczonym kosztem dostawy dla produktów fizycznych', async () => {
            // Bezpośrednia inicjalizacja stanu koszyka w warstwie danych
            await knex('cart_items').insert([
                { user_id: testUserId, book_id: physicalBookId, quantity: 2, format: 'physical' },
                { user_id: testUserId, book_id: digitalBookId, quantity: 1, format: 'digital' }
            ]);

            const response = await agent.get('/checkout/cart');
            expect(response.statusCode).toBe(200);
            expect(response.text).toContain('15.00'); 
        });
    });

    describe('POST /orders/create-from-cart (Składanie zamówienia)', () => {
        
        test('powinno odrzucić zamówienie z błędnym kodem pocztowym (walidacja)', async () => {
            const response = await agent.post('/orders/create-from-cart').send({
                email: 'klient_zamowienia@ksiegarnia.pl',
                first_name: 'Jan',
                last_name: 'Klient',
                street: 'Testowa',
                house_number: '12',
                city: 'Warszawa',
                postal_code: '00123',
                payment_method: 'card'
            });

            expect(response.statusCode).toBe(302); 
            expect(response.header.location).toBe('/checkout/cart');
        });

        test('powinno pomyślnie złożyć zamówienie, zdjąć z magazynu i wyczyścić koszyk', async () => {
            const response = await agent.post('/orders/create-from-cart').send({
                email: 'klient_zamowienia@ksiegarnia.pl',
                first_name: 'Jan',
                last_name: 'Klient',
                street: 'Testowa',
                house_number: '12',
                city: 'Warszawa',
                postal_code: '00-123', 
                payment_method: 'card'
            });

            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/order-history?status=success');

            // Weryfikacja usunięcia elementów z koszyka
            const cartItems = await knex('cart_items').where('user_id', testUserId);
            expect(cartItems.length).toBe(0);

            // Weryfikacja aktualizacji stanu magazynowego po transakcji
            const book = await knex('books').where('id', physicalBookId).first();
            expect(book.physical_stock).toBe(3);

            // Weryfikacja utworzenia poszczególnych rekordów zamówienia
            const orders = await knex('orders').where('user_id', testUserId).orderBy('book_id', 'desc');
            expect(orders.length).toBe(2);
            
            const physicalOrder = orders.find(o => o.book_id === physicalBookId);
            expect(physicalOrder.status).toBe('paid'); 
            
            const digitalOrder = orders.find(o => o.book_id === digitalBookId);
            expect(digitalOrder.status).toBe('completed'); 
        });

        test('powinno wyrzucić błąd (catch) gdy brakuje książki w magazynie', async () => {
            // Symulacja braku asortymentu (stan magazynowy: 0)
            await knex('books').where('id', physicalBookId).update('physical_stock', 0);
            
            // Wstrzyknięcie zablokowanego przedmiotu do koszyka
            await knex('cart_items').insert({
                user_id: testUserId, book_id: physicalBookId, quantity: 1, format: 'physical'
            });

            const response = await agent.post('/orders/create-from-cart').send({
                email: 'klient_zamowienia@ksiegarnia.pl',
                first_name: 'Jan',
                last_name: 'Kowalski',
                street: 'Polna',
                house_number: '1',
                city: 'Gdańsk', 
                postal_code: '80-000',
                payment_method: 'card'
            });

            // Weryfikacja wycofania transakcji i przechwycenia błędu
            expect(response.statusCode).toBe(302);
            expect(response.header.location).toBe('/checkout/cart');
        });
    });
});