const express = require('express');
const app = express();
const conn = require('./db/confic');
const path = require('path');
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const flash = require('connect-flash');
const crypto = require('crypto');

const reg = require('./model/registerSchema');
const Product = require('./model/AddproductSchema.js');

app.set('view engine', 'ejs');
app.use(express.static('views'));
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'mySuperSecretKey123456789!',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 }
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.render('index', { products });
  } catch (error) {
    res.status(500).send('Error loading home page');
  }
});

app.get('/About', (req, res) => {
  res.render('About');
});

app.get('/contact', (req, res) => {
  res.render('register');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await reg.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newuser = new reg({ username, email, password: hashedPassword });
    await newuser.save();
    res.status(201).json({ message: 'user register successfully' });
  } catch (err) {
    res.status(500).json({ err: 'something went wrong' });
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await reg.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });
    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/view-register', async (req, res) => {
  try {
    const data = await reg.find({});
    res.render('./Dashboard/view-register.ejs', { data });
  } catch (err) {
    res.status(500).send('Error fetching users');
  }
});

app.get('/user/edit/:id', async (req, res) => {
  const user = await reg.findById(req.params.id);
  if (!user) return res.status(404).send('User not found');
  res.render('edit-register', { user });
});

app.post('/user/edit/:id', async (req, res) => {
  const { username, email } = req.body;
  try {
    await reg.findByIdAndUpdate(req.params.id, { username, email });
    res.redirect('/view-register');
  } catch (err) {
    res.status(500).send('Update failed');
  }
});

app.get('/user/delete/:id', async (req, res) => {
  try {
    const user = await reg.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).send('User not found');
    const data = await reg.find();
    res.render('./dashboard/view-register', { data, msg: 'User deleted successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Forgot password flow
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

// const crypto = require("crypto"); // Top of file

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await reg.findOne({ email });

  if (!user) {
    req.flash('error', 'No account found with that email.');
    return res.redirect('/forgot-password');
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetLink = `http://localhost:7200/reset-password/${token}`;
  
  // Simulate email (in real app use Nodemailer)
  console.log("Reset link:", resetLink);

  req.flash('success', 'Password reset link has been sent to your email.');
  res.redirect('/forgot-password');
});


app.get('/reset-password/:token', async (req, res) => {
  try {
    const user = await reg.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send("Password reset token is invalid or has expired.");
    }

    // Pass token to the template so <%= token %> works
    res.render('reset-password', { token: req.params.token });
  } catch (err) {
    res.status(500).send('Server error');
  }
});



app.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;

  try {
    const user = await reg.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.send("Token expired or invalid.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send("✅ Password has been successfully updated. You can now login.");
  } catch (err) {
    res.status(500).send('Server error');
  }
});
  
//Dashboard Apies start
app.get('/dashboard',(req,res)=>{
    res.render('./Dashboard/index')
})

// add product api for get and post
app.get('/Add-product',(req,res)=>{
    res.render('./Dashboard/Add-product')
})

// Configure Multer storage
    const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads'); // Make sure this folder exists
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname)); // e.g., 168125123-image.jpg
    }
  });
  
  const upload = multer({ storage });

//Add product api start
  app.post('/Add-product', upload.single('image'), async (req, res) => {
    try {
      const { productName,productPrice, productDescription, productCategory } = req.body;
      const image = req.file ? req.file.filename : null;
  
      const newProduct = new Product({
        productName,
        productPrice,
        productDescription,
        productCategory,
        image // store just filename or path
      });
  
      const addProduct = await newProduct.save();
  
      res.status(201).json({ 
        product: addProduct,
        message: 'Product added successfully'
      });
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  //add product end 

  //get product api start
  
  app.get('/view-product', async (req, res) => {
    try {
      const products = await Product.find(); // Fetch products from DB
      res.render('./dashboard/view-product', { products }); // Render dashboard and pass products
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).send('Error loading dashboard');
    }
  });
  //get product api end

//Add to cart api 
app.get('/add-to-cart/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    if (!req.session.products) req.session.products = [];

    req.session.products.push({
      productName: product.productName,
      productPrice: product.productPrice,
      productDescription: product.productDescription,
      productCategory: product.productCategory,
      image: product.image
    });

    res.redirect('/view-orders');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// View orders route
app.get('/view-orders', (req, res) => {
  const products = req.session.products || [];
  res.render('dashboard/view-orders', { products });
  
});

// Add to cart api end

// payment get api start
app.get('/buy-now/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('Product not found');
    res.render('dashboard/payment', { product });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

//get api for payment end


//post api for payment start

app.post('/make-payment', (req, res) => {
  // Later here you’ll add Stripe logic
  // For now, just simulate success
  res.send('Payment successfull');
});
//post payment  api end 


//logout post api
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Could not log out');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login'); 
  });
});

// logout api end

app.listen(7200)
