const cors = require('cors');
const express = require('express');
const fs = require('fs');
const { console } = require('inspector');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3001;

const productsFile = path.join(__dirname, 'assets/products.json');
app.use(cors());
app.use(express.json());

const readProducts = () => {
    const data = fs.readFileSync(productsFile);
    return JSON.parse(data);
};

const saveProducts = (products) => {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
};

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
        products.splice(index, 1);
        saveProducts(products);
        res.status(204).send('sucssed');
    } else {
        res.status(404).send('Product not found');
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
