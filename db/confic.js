const mongoose=require('mongoose');
 var conn=mongoose.connect('mongodb://localhost:27017/pre',
    {
        useNewUrlParser:true,
        useUnifiedTopology:true

 })
 .then(()=>console.log('connection sucessfully'))
 .catch((err)=>console.log(err));

 module.exports=conn;