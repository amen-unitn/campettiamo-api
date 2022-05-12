
var express = require('express');
var app = express();
var db = require('./db-model');

const port = 9080;

const model = new db.Model();

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

app.get('/api/v1/campi', function(req, res) {
    model.getListaCampi().then((campi)=>{
        res.send(JSON.stringify(campi))
    })
});