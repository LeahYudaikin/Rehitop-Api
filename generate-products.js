const fs = require('fs');
const path = require('path');
const axios = require('axios');

const baseDir = path.join(__dirname, 'assets/product-images');
const serverUrl = 'http://localhost:3001/products';

const { Schema } = require('./product.model.js');

const createProductFromImage = (category, imageName) => {
    return {
        image: `/assets/product-images/${category}/${imageName}`,
        name: path.basename(imageName, path.extname(imageName)),
        categories: [category],
        price: 0,
        describe: `This is a ${category} named ${path.basename(imageName, path.extname(imageName))}.+++++++++++`,
        colors: 'Random Color',
        company: 'Default Company'
    };
};

const generateProducts = async () => {
    // try {
        for (const [key, value] of Object.entries(Schema)) {
            console.log('קטגוריה ראשית:', value);
          
            if (value && typeof value === 'object') {
              for (const [subKey, subValue] of Object.entries(value)) {
                console.log('  תת-קטגוריה:', subValue);
              }
            } else {
              console.log('  אין תתי-קטגוריות');
            }
          }
          
    //     for (const categoryKey in Category) {
    //         const category = categoryKey;
    //         const categoryPath = path.join(baseDir, category);
    //         if (fs.existsSync(categoryPath)) {
    //             const images = fs.readdirSync(categoryPath).filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
    //             for (const image of images) {
    //                 const product = createProductFromImage(category, image);
    //                 try {
    //                     const response = await axios.post(serverUrl, product);
    //                     console.log(`Product created:`, response.data);
    //                 } catch (postError) {
    //                     console.error(`Failed to create product for image ${image}:`, postError.message);
    //                 }
    //             }
    //         } else {
    //             console.log(`Directory for category ${category} does not exist.`);
    //         }
    //     }
    //     console.log('All products created successfully!');
    // } catch (error) {
    //     console.error('Error while generating products:', error.message);
    // }
};

generateProducts();