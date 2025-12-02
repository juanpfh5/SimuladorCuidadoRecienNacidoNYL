const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    //password: 'root',
    password: '4815926',
    database: 'simulador'
});

db.connect(err => {
    if (err) console.error(err);
    else console.log('MySQL conectado');
});


// --- ENDPOINT: REGISTRO ---
app.post('/registro', (req, res) => {
    const { curp, nombre, edad, bebe_vivo } = req.body;

    const query = 'INSERT INTO usuarios (curp, nombre, edad, bebe_vivo) VALUES (?, ?, ?, ?)';
    db.query(query, [curp, nombre, edad, bebe_vivo], (err, result) => {
        if (err) return res.status(400).json({ error: err });
        res.json({ msg: 'Usuario registrado correctamente' });
    });
});

// --- ENDPOINT: LOGIN ---
app.post('/login', (req, res) => {
    const { curp } = req.body;

    const query = 'SELECT * FROM usuarios WHERE curp = ? LIMIT 1';
    db.query(query, [curp], (err, results) => {
        if (err) return res.status(500).json({ error: err });
        
        if (results.length === 0) {
            return res.status(401).json({ msg: 'CURP no encontrada' });
        }

        res.json({ msg: 'Login exitoso', usuario: results[0] });
    });
});

app.listen(3000, () => console.log('API lista en http://localhost:3000'));
