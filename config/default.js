const path = require('path');

module.exports = {
  staticRoot: path.join(process.cwd(), 'static'),
  secretOrKey: 'secret',
  mongoose: {
    uri: 'mongodb://localhost:27017',
    options: {
      dbName: 'messanger',
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    }
  },
  crypto: {
    iterations: 100,
    keylen: 100,
    digest: 'sha512'
  },
  jsonwebtoken: {
    algorithm: 'HS512'
  }
};