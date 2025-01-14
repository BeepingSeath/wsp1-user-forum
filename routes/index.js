const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
var validator = require('validator');
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
    if (req.session.loggedin == false){
        return res.json('Need to be logged in to post.');
    }
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

router.get('/register', async function (req, res, next){
    res.render('register.njk', {
        title: 'Register',
    });
});
router.post('/register', async function (req, res, next){
    const { username, password, passwordConfirmation } = req.body;
    const errors = [];
    
    if (username === '') {
        errors.push('Username is Required');
    } else {
    }

    if (password === '') {
        errors.push('Password is Required');
    }
    if (password !== passwordConfirmation) {
        errors.push('Passwords do not match');
    }
    if (validator.isAlphanumeric(username , 'en-US') == false){
        errors.push('Username is illegal');
    }
    if (errors.length > 0) {
        return res.json([errors]);
    }
    const [userCheck] = await promisePool.query('SELECT name FROM sb26users WHERE name = ?',[username],);
    if (userCheck.length > 0){
        errors.push('Username is already taken');
    }
    if (errors.length > 0) {
        return res.json([errors]);
    } else {
        bcrypt.hash(password, 10, async function (err, hash) {
            const [newUser] = await promisePool.query('INSERT INTO sb26users (name, password) VALUES (?, ?)', [username, hash])
            return res.redirect('/login');
        });
        

    }
});
router.get('/profile', async function (req, res, next) {

    if (req.session.loggedin === undefined) {
        
        return res.status(401).send('Access Denied');
    } else {
    const [username] = await promisePool.query('SELECT * FROM sb26users WHERE id = ?', [req.session.userid],);
    res.render('profile.njk', {
        title: 'Profile',
        username: username[0].name,
    });}
});
router.get('/delete', async function (req, res, next) {
    if (req.session.loggedin === true) {
        req.session.loggedin = false;
        req.session.userid = null;
        await promisePool.query('DELETE FROM sb26users WHERE id = ?', [req.session.userid],);
        return res.redirect('/login');
    }
});
router.get('/logout', function (req, res, next){
    req.session.loggedin = false
    req.session.userid = null;
        return res.redirect('/login')
    
});
router.post('/logout', async function (req, res, next){
    if (req.session.loggedin === undefined) {
        
        return res.status(401).send('Access Denied');
    }
    else {
        req.session.loggedin=undefined;
        return res.redirect('/')
    }
});

router.get('/crypt/:password', function (req, res, next) {
    bcrypt.hash(req.params.password, 10, function (err, hash) {
        // Store hash in your password DB.
        return res.json({ hash });
    });
});

module.exports = router;
