const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
});
const promisePool = pool.promise();


router.get('/', async function (req, res) {
    const [rows] = await promisePool.query("SELECT sb26forum.*, sb26users.name FROM sb26forum JOIN sb26users ON sb26forum.authorId = sb26users.id ORDER BY id DESC;");
    res.render('index.njk', {
        rows: rows,
        title: 'Forum',
    });
});
router.get('/login', function (req, res, next) {
    res.render('login.njk', {
        title: 'Login',
    });
});
router.post('/login', async function (req, res, next) {
    const { username, password } = req.body;
    const errors = [];
    
    if (username === '') {
        //console.log('Username is Required');
        errors.push('Username is Required');
    } else {
    }
    
    if (password === '') {
        //console.log('Password is Required');
        errors.push('Password is Required');
    }
    if (errors.length > 0) {
        return res.json(errors);
    }
    const [users] = await promisePool.query('SELECT * FROM sb26users WHERE name = ?', [username],);
    if(users.length > 0) {
    bcrypt.compare(password, users[0].password, function (err, result) {
        if (result === true) {
            req.session.loggedin = true;
            req.session.userid = users[0].id;
            return res.redirect('/profile');
        } else {
            return res.json('Invalid username or password');
        }
    });
} else {
    return res.redirect("/login");
}
});
router.get('/new', async function (req, res, next) {
    const [users] = await promisePool.query("SELECT * FROM srb26users");
    res.render('new.njk', {
        title: 'New Post',
        users,
    });
});
router.post('/new', async function (req, res, next) {
    console.log(req.body)
    const {title, content } = req.body;

    // Skapa en ny författare om den inte finns men du behöver kontrollera om användare finns!
    let [user] = await promisePool.query('SELECT * FROM sb26users WHERE id = ?', [req.session.userid]);

    // user.insertId bör innehålla det nya ID:t för författaren
    console.log(user);
    const userId = user.insertId || user[0].id;

    // kör frågan för att skapa ett nytt inlägg
    const [rows] = await promisePool.query('INSERT INTO sb26forum (authorId, title, content) VALUES (?, ?, ?)', [userId, title, content]);
    
    res.redirect('/'); 
});
router.get('/crypt/:password', function (req, res, next) {
    bcrypt.hash(req.params.password, 10, function (err, hash) {
        // Store hash in your password DB.
        return res.json({ hash });
    });
});

module.exports = router;
