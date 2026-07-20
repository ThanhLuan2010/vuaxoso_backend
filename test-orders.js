const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/vuaxoso').then(async () => {
  const Order = mongoose.connection.collection('orders');
  const orders = await Order.find().limit(5).toArray();
  console.log(JSON.stringify(orders, null, 2));
  process.exit(0);
});
