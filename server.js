require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const { authenticateUser, generateAuthToken, authenticateToken } = require('./auth');

const app = express();
const port = process.env.PORT || 3001;

// נתיבי קבצים - תלוי pkg
const isPkg = process.pkg;
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;

const angularDistPath = path.join(basePath, 'dist', 'r-system', 'browser');
const productsFile = path.join(basePath, 'assets', 'products.json');
const idFile = path.join(basePath, 'assets', 'lastId.json');

// הגדרות כלליות
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(angularDistPath));
app.use('/assets', express.static(path.join(basePath, 'assets')));

// CSP – אבטחה
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; " +
    "img-src 'self' data: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "script-src 'self'; " +
    "connect-src 'self' https://netfree.link;"
  );
  next();
});

// קריאה וכתיבה
const readProducts = () => JSON.parse(fs.readFileSync(productsFile));
const saveProducts = (products) => fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
const getNextId = () => {
  const defaultLastId = "A100";
  let lastId = defaultLastId;

  try {
    if (fs.existsSync(idFile)) {
      const data = fs.readFileSync(idFile, 'utf-8');
      lastId = JSON.parse(data).lastId || defaultLastId;
    }
  } catch (err) {
    console.error("Error reading lastId file:", err);
  }

  let [letter, num] = [lastId.charAt(0), parseInt(lastId.slice(1))];
  num = (num < 999) ? num + 1 : 100;
  if (num === 100) letter = String.fromCharCode(letter.charCodeAt(0) + 1);

  const newId = `${letter}${num}`;
  fs.writeFileSync(idFile, JSON.stringify({ lastId: newId }), 'utf-8');
  return newId;
};

// Auth
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
  req.user.username === 'admin'
    ? res.send(`${req.user.username} Welcome to the admin area!`)
    : res.status(403).send('Access denied. Admins only.');
});

// מוצרים
app.get('/products', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const products = readProducts().map(p => ({
    ...p,
    image: `${baseUrl}/${p.image}`
  }));
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const product = readProducts().find(p => p.Id == req.params.id);
  product ? res.json(product) : res.status(404).send('Product not found');
});

// העלאת תמונה
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.query.folder || 'default';
    const folderPath = path.join(basePath, 'assets', 'product-images', folder);
    fs.mkdirSync(folderPath, { recursive: true });
    cb(null, folderPath);
  },
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

app.post('/products/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  const imagePath = path.posix.join('assets/product-images', req.query.folder, req.file.filename);
  res.json({ imagePath });
});

// מחיקת תמונה
app.post('/products/delete-image', authenticateToken, (req, res) => {
  const relativePath = req.body.imagePath.replace(`${req.protocol}://${req.get('host')}/`, '');
  if (!relativePath) return res.status(400).send('No image path provided');

  const filePath = path.join(basePath, relativePath);
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) return res.status(404).send('Image not found');
    fs.unlink(filePath, err => {
      if (err) return res.status(500).send('Error deleting image');
      res.send('Image deleted successfully');
    });
  });
});

// הוספת מוצר
app.post('/products', authenticateToken, (req, res) => {
  const products = readProducts();
  const newProduct = req.body;

  if (!newProduct.image || !newProduct.categories) {
    return res.status(400).send('Missing required fields');
  }

  newProduct.image = newProduct.image.replace(`${req.protocol}://${req.get('host')}/`, '');
  newProduct.Id = getNextId();
  newProduct.name ||= newProduct.Id;

  products.push(newProduct);
  saveProducts(products);
  res.status(201).json(newProduct);
});

// עדכון מוצר
app.put('/products/:id', authenticateToken, (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.Id === req.params.id);
  if (index === -1) return res.status(404).send('Product not found');

  const updatedProduct = { ...products[index], ...req.body };

  if (!updatedProduct.image || !updatedProduct.categories) {
    return res.status(400).send('Missing required fields');
  }

  updatedProduct.image = updatedProduct.image.replace(`${req.protocol}://${req.get('host')}/`, '');
  updatedProduct.name ||= updatedProduct.Id;

  products[index] = updatedProduct;
  saveProducts(products);
  res.json(updatedProduct);
});

// מחיקת מוצר
app.delete('/products/:id', authenticateToken, (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.Id === req.params.id);
  if (index === -1) return res.status(404).send('Product not found');

  products.splice(index, 1);
  saveProducts(products);
  res.status(204).send();
});

// דף הבית
app.get('/', (req, res) => {
  res.send('API is running');
});

// הפעלת השרת
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
