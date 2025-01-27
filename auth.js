const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const adminUsername = process.env.ADMIN_USERNAME || 'admin'; // שם המשתמש של המנהל
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // הסיסמה של המנהל (לא בטקסט רגיל במציאות)
const hashedPassword = process.env.HASHED_PASSWORD;

const secretKey = process.env.SECRET_KEY || 'yourSecretKey'; // מפתח הסודי ליצירת הטוקן

// פונקציה לאמת את שם המשתמש והסיסמה
const authenticateUser = (username, password) => {
  if (username === adminUsername && bcrypt.compareSync(password, hashedPassword)) {
    return true;
  }
  return false;
};

// פונקציה ליצירת טוקן JWT
const generateAuthToken = (username) => {
  const token = jwt.sign({ username }, secretKey, { expiresIn: '12345h' });
  if (!token) {
    return res.status(403).send('נדרש טוקן');
  }
  return token;
};

// פונקציה לאימות טוקן JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(403).send('נדרש טוקן');
  }
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.status(403).send('הטוקן לא תקף');
    }
    req.user = user; // שומר את המשתמש
    next();
  });
};

module.exports = { authenticateUser, generateAuthToken, authenticateToken };
