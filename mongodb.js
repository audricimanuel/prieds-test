var mongoose = require('mongoose');
require('dotenv').config();

var db = process.env.DB || 'local_db';
const username = 'prieds-test';
const password = 'pr1eds-t35t';
var url = process.env.DB_URL || `${username}:${password}@dric.9ngoxrs.mongodb.net`;
var DB_ref = mongoose
  .createConnection('mongodb+srv://' + url + '/' + db)

  .on('error', function (err) {
    if (err) {
      console.error('Error connecting to MongoDB.', err.message);
      process.exit(1);
    }
  })
  .once('open', function callback() {
    console.info('Mongo db connected successfully ' + db);
  });

module.exports = DB_ref;
