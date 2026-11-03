const isAdmin = (req, res, next) => {
    if (req.session.userId && req.session.role === 'admin') {
        next();
    } else {
        console.log('Próba nieautoryzowanego dostępu do panelu admina.');
        res.redirect('/');
    }
};

module.exports = isAdmin;