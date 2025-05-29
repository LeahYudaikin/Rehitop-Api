const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { authenticateUser, generateAuthToken, authenticateToken } = require('./auth');
require('dotenv').config();

const app = express();
const port = 3001;

const angularDistPath = process.pkg
    ? path.join(path.dirname(process.execPath), 'dist', 'r-system', 'browser')
    : path.join(__dirname, 'dist', 'r-system', 'browser');

const productsFile = process.pkg
    ? path.join(path.dirname(process.execPath), 'assets', 'products.json')
    : path.join(__dirname, 'assets', 'products.json');
const idFile = process.pkg
    ? path.join(path.dirname(process.execPath), 'assets', 'lastId.json')
    : path.join(__dirname, 'assets', 'lastId.json');
// הגדרת תיקיית Angular כסטטית
app.use(express.static(angularDistPath));


app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const folderPath = path.join(process.cwd(), 'assets');
app.use('/assets', express.static(folderPath));

const readProducts = () => {
    const data = fs.readFileSync(productsFile);
    return JSON.parse(data);
};

const saveProducts = (products) => {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
};

const getNextId = () => {
    const defaultLastId = "A100"; // ערך ברירת מחדל ל-lastId
    let lastId = defaultLastId;
    let newId = "";
    try {
        if (fs.existsSync(idFile)) {
            console.log('---if (fs.existsSync(idFile))');
            const data = fs.readFileSync(idFile, 'utf-8');
            lastId = JSON.parse(data).lastId || defaultLastId; // טיפול במקרה שהתוכן ריק
            console.log(lastId);
        }
    } catch (error) {
        console.error("Error reading or parsing idFile:", error);
        lastId = defaultLastId; // במקרה של שגיאה, השתמש בערך ברירת מחדל
    }

    // חישוב ה-ID החדש
    let letter = lastId.charAt(0);
    let number = parseInt(lastId.slice(1), 10);
    if (number < 999) {
        number++;
    } else {
        letter = String.fromCharCode(letter.charCodeAt(0) + 1);
        number = 100;
    }
    newId = `${letter}${number}`;
    console.log(newId);

    // כתיבה לקובץ
    try {
        fs.writeFileSync(idFile, JSON.stringify({ lastId: newId }), 'utf-8');
    } catch (error) {
        console.error("Error writing to idFile:", error);
        throw error; // זורק שגיאה אם הכתיבה נכשלת
    }

    return newId;
};


app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (authenticateUser(username, password)) {
        const token = generateAuthToken(username);
        res.json({ token });
    } else {
        res.status(401).send('Invalid username or password');
    }
});

app.get('/is-admin', authenticateToken, (req, res) => {
    if (req.user.username === 'admin') {
        res.send(req.user.username + ' Welcome to the admin area!');
    } else {
        res.status(403).send('Access denied. Admins only.');
    }
});

app.get('/products', (req, res) => {
    const products = readProducts();
    const baseUrl = `http://localhost:${port}`;
    const updatedProducts = products.map(product => ({
        ...product,
        image: `${baseUrl}/${product.image}`
    }));
    res.json(updatedProducts);
});


app.get('/products/:id', (req, res) => {
    console.log("app.get('/products/:id', (req, res) => {");
    const products = readProducts();
    const product = products.find(p => p.Id == req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).send('Product not found');
    }
});

app.post('/products/upload-image', (req, res) => {
    const multer = require('multer');
    const folderPath = `assets/product-images/${req.query.folder}`;
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, folderPath);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        }
    });

    const upload = multer({ storage }).single('image');
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).send('Error uploading file.');
        }
        const imagePath = `${folderPath}/${req.file.filename}`;
        res.json({ imagePath });
    });
});

app.post('/products/delete-image', authenticateToken, (req, res) => {
    let imagePath = req.body.imagePath.replace(`http://localhost:${port}/`, '');
    if (!imagePath) {
        return res.status(400).send('No image path provided');
    }
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Image not found');
        }
        fs.unlink(imagePath, (err) => {
            if (err) {
                return res.status(500).send('Error deleting image');
            }
            res.send('Image deleted successfully');
        });
    });
});

app.post('/products', authenticateToken, (req, res) => {
    console.log('app.post(/products, authenticateToken, (req, res) => {')
    const products = readProducts();
    const newProduct = req.body;

    if (!newProduct.image || !newProduct.categories) {
        return res.status(400).send('Missing required fields');
        }
    if (newProduct.image.startsWith(`http://localhost:${port}/`)) {
        newProduct.image = newProduct.image.replace(`http://localhost:${port}/`, '');
    }
    newProduct.Id = getNextId();
    if (!newProduct.name)
        newProduct.name = newProduct.Id;
    products.push(newProduct);
    saveProducts(products);
    res.status(201).json(newProduct);
});

app.put('/products/:id', authenticateToken, (req, res) => {
    const products = readProducts();
    const index = products.findIndex(p => p.Id === req.params.id);

    if (index !== -1) {
        const updatedProduct = { ...products[index], ...req.body };

        if (!updatedProduct.image || !updatedProduct.categories) {
            return res.status(400).send('Missing required fields');
            }

        if (updatedProduct.image.startsWith(`http://localhost:${port}/`)) {
            updatedProduct.image = updatedProduct.image.replace(`http://localhost:${port}/`, '');
        }
        if (!updatedProduct.name)
            updatedProduct.name = updatedProduct.Id;
        products[index] = updatedProduct;
        saveProducts(products);
        res.json(updatedProduct);
    } else {
        res.status(404).send('Product not found');
    }
});

app.delete('/products/:id', authenticateToken, (req, res) => {
    console.log('app.delete(/products/:id, authenticateToken, (req, res) =>');
    const products = readProducts();
    const index = products.findIndex(p => p.Id === req.params.id);
    if (index !== -1) {
        products.splice(index, 1);
        saveProducts(products);
        res.status(204).send('sucssed');
    } else {
        console.log(' res.status(404).send("Product not found");')
        res.status(404).send('Product not found');
    }
});


// הכוונת כל הבקשות הלא ידועות לקובץ index.html של Angular
app.get('*', (req, res) => {
    res.sendFile(path.join(angularDistPath, 'index.html'));
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
