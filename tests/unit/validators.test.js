const { 
    isValidEmail, 
    isStrongPassword, 
    isValidUsername, 
    isValidHouseNumber,
    isValidPostalCode 
} = require('../../utils/validators');

describe('Testy walidatorów (Unit Tests)', () => {

    describe('Funkcja isValidEmail', () => {
        test('powinno akceptować poprawny adres email', () => {
            expect(isValidEmail('jan.kowalski@example.com')).toBe(true);
            expect(isValidEmail('test@test.pl')).toBe(true);
        });

        test('powinno odrzucać niepoprawny adres email', () => {
            expect(isValidEmail('jankowalski.com')).toBe(false); 
            expect(isValidEmail('jan@kowalski')).toBe(false);    
            expect(isValidEmail('jan @kowalski.com')).toBe(false);
        });
    });

    describe('Funkcja isStrongPassword', () => {
        test('powinno akceptować silne hasło', () => {
            expect(isStrongPassword('TrudneHaslo123!')).toBe(true);
            expect(isStrongPassword('B@rdzoT@jne99')).toBe(true);
        });

        test('powinno odrzucać za słabe hasło', () => {
            expect(isStrongPassword('haslo123')).toBe(false);      
            expect(isStrongPassword('H1!')).toBe(false);           
            expect(isStrongPassword('TrudneHaslo!')).toBe(false);  
        });
    });

    describe('Funkcja isValidUsername', () => {
        test('powinno akceptować poprawną nazwę użytkownika (3-20 znaków, litery, cyfry)', () => {
            expect(isValidUsername('jan_kowalski99')).toBe(true);
            expect(isValidUsername('Kuba123')).toBe(true);
        });

        test('powinno odrzucać niepoprawną nazwę użytkownika', () => {
            expect(isValidUsername('ja')).toBe(false);             
            expect(isValidUsername('jan kowalski')).toBe(false);   
            expect(isValidUsername('jan@kowalski')).toBe(false);   
        });
    });

    describe('Funkcja isValidHouseNumber', () => {
        test('powinno akceptować poprawne numery domów i mieszkań', () => {
            expect(isValidHouseNumber('12')).toBe(true);
            expect(isValidHouseNumber('12A')).toBe(true);
            expect(isValidHouseNumber('12/14')).toBe(true);
            expect(isValidHouseNumber('12A/14B')).toBe(true);
        });

        test('powinno odrzucać błędne formaty numerów domów', () => {
            expect(isValidHouseNumber('A12')).toBe(false);         
            expect(isValidHouseNumber('12//14')).toBe(false);      
            expect(isValidHouseNumber('12@')).toBe(false);         
        });
    });

    describe('Funkcja isValidPostalCode', () => {
        test('powinno akceptować poprawny polski kod pocztowy', () => {
            expect(isValidPostalCode('00-999')).toBe(true);
            expect(isValidPostalCode('65-001')).toBe(true);
        });

        test('powinno odrzucać błędny format kodu pocztowego', () => {
            expect(isValidPostalCode('00999')).toBe(false);        
            expect(isValidPostalCode('00-99')).toBe(false);        
            expect(isValidPostalCode('AA-BBB')).toBe(false);       
        });
    });
});