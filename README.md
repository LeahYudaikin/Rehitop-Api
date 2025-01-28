### 1. לשים את הקובץ של dist בתוך התיקייה של ה node
### 2. להוסיף את הקוד הבא לpackege.json 
bash
```
"pkg": {
    "assets": [
      "dist/**/*"
    ],
    "scripts": [
      "server.js"
    ]
  }
  ```
### 3. להריץ את הפקודה
```
pkg server.js --targets node14-win-x64 --output myapp.exe
```
