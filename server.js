const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const { authenticateUser, generateAuthToken, authenticateToken } = require('./auth');
require('dotenv').config();

const app = express();
const port = 3001;

const productsFile = path.join(__dirname, 'assets/products.json');

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const readProducts = () => {
    const data = fs.readFileSync(productsFile);
    return JSON.parse(data);
};

const saveProducts = (products) => {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
};

// {
//     "username": "admin",
//     "password": "admin123"
// }

app.post('/login', (req, res) => {
    console.log('Login request body:', req.body);
    const { username, password } = req.body;

    if (authenticateUser(username, password)) {
        const token = generateAuthToken(username);
        res.json({ token });
    } else {
        res.status(401).send('Invalid username or password');
    }
});

app.get('/is-admin', authenticateToken, (req, res) => {
    console.log('req.user.username === adminUsername', req.user.username)
    if (req.user.username === 'admin') {
        res.send(req.user.username + ' Welcome to the admin area!');
    } else {
        res.status(403).send('Access denied. Admins only.');
    }
});

app.get('/products', (req, res) => {
    const products = readProducts();
    res.json(products);
});

app.get('/products/:id', (req, res) => {
    console.log(req);
    const products = readProducts();
    const product = products.find(p => p.Id == req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).send('Product not found');
    }
});

app.post('/products', (req, res) => {
    const products = readProducts();
    console.log(req.body)
    const newProduct = req.body;
    newProduct.Id = uuidv4();
    products.push(newProduct);
    saveProducts(products);
    res.status(201).json(newProduct);
});

app.put('/products/:id', (req, res) => {
    const products = readProducts();
    console.log(typeof (products[0].Id))
    console.log(typeof (req.params.id))
    const index = products.findIndex(p => p.Id === req.params.id);
    if (index !== -1) {
        const updatedProduct = { ...products[index], ...req.body };
        products[index] = updatedProduct;
        products[index].Id = req.params.id;
        saveProducts(products);
        res.json(updatedProduct);
    } else {
        res.status(404).send('Product not found');
    }
});

app.delete('/products/:id', (req, res) => {
    const products = readProducts();
    const index = products.findIndex(p => p.Id === req.params.id);
    if (index !== -1) {
        console.log('Product Deleted success (server)')
        products.splice(index, 1);
        saveProducts(products);
        res.status(200).send();
    } else {
        console.log('Failed product Deleted (server)')
        res.status(404).send('Product not found');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
