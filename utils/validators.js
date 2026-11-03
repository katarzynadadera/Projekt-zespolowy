const isValidEmail = (email) => {
    // Akceptuje standardowy format emaila, np. test@test.pl
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isStrongPassword = (password) => {
    // Wymagania: min. 8 znaków, duża litera, mała litera, cyfra, znak specjalny
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})");
    return strongRegex.test(password);
};

const isValidUsername = (username) => {
    // Wymagania: 3-20 znaków, tylko litery, cyfry i podkreślenia
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

const isValidHouseNumber = (houseNumber) => {
    // Akceptuje numery np. 12, 12A, 12/14, 12A/14B
    return /^[0-9]+[a-zA-Z]?(\/[0-9]+[a-zA-Z]?)?$/.test(houseNumber);
};

const isValidPostalCode = (postalCode) => {
    // Akceptuje polski format kodu pocztowego, np. 00-000
    return /^[0-9]{2}-[0-9]{3}$/.test(postalCode);
};

// Eksportujemy wszystkie funkcje, aby mogły być używane w innych plikach
module.exports = {
    isValidEmail,
    isStrongPassword,
    isValidUsername,
    isValidHouseNumber,
    isValidPostalCode
};