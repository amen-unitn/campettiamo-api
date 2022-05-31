const app = require('./api');
const cron = require('node-cron');
const model = require('./db-model')

require('dotenv').config() 

port = process.env.PORT || 9080

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
// this schedule some task every hour
  cron.schedule('0 * * * *', function() {
    console.log('running a task every hour');
    // model.aggiorna_prenotazioni()
    // model.pulisci_prenotazioni()
  });

  start (port)


