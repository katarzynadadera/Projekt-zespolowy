const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  await knex('users').del();

  // Generowanie hasha hasła (domyślne hasło: 'admin123')
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  // Utworzenie konta z uprawnieniami administratora
  await knex('users').insert([
    {
      username: 'admin',
      email: 'admin@ksiegarnia.pl',
      password_hash: hashedPassword,
      role: 'admin', // Jawne przypisanie roli 'admin'
      first_name: 'Główny',
      last_name: 'Administrator',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};