const app = require('./api')

require('dotenv').config() 

port = process.env.port


const start = (port) => {
    try {
      app.listen(port, () => {
        console.log(`Api running at http://localhost:${port}`);
      });
    } catch (err) {
      console.error(err);
      process.exit();
    }
  };

  start (port)


