const isAuthenticated = (req, res, next) => {
    if (req.session.userId){
        // Użytkownik jest zalogowany, kontynuuj do następnego middleware/routera
        next();
    } else{
        // Użytkownik nie jest zalogowany, przekieruj na stronę logowania
        console.log('Dostęp zabroniony. Użytkownik nie jest zalogowany.');
        res.redirect('/login');
    }
};


module.exports = isAuthenticated; 