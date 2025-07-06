const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  productPrice: {
    type: Number,
    required: true,
  },
  productDescription: String,
  productCategory: String,
  image: String,
  
});

const product = mongoose.model('Product', productSchema);
module.exports=product
