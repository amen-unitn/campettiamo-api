
var express = require('express');
var app = express();
app.use(express.json())
var db = require('./db-model');

const model = new db.Model();


app.get('/api/v1/campi', function(req, res) {
    model.getListaCampi().then((campi)=>{
        res.json(campi)
    })
});

app.get('/api/v1/campo/:id', function(req, res) {
    model.getCampo(req.params.id).then((result)=>{
        res.json(result)
    })
});

app.delete('/api/v1/gestore/:idGestore/campo/:idCampo', function(req, res) {
    model.deleteCampo(req.params.idGestore, req.params.idCampo).then((result)=>{
        if(result)
            res.json({success:result, message:"Deleted"})
        else
            res.json({success:result, message:"Campo not found"})
    })
});

app.post('/api/v1/gestore/:idGestore/campo/', function(req, res) {
    if(checkCampoProperties(req.body)){
        model.createCampo(req.params.idGestore, req.body.nome, req.body.indirizzo, req.body.cap,
            req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result)=>{
            res.json({id:result})
        })
    }else{
        res.json({"success":false, "message":"Not all required fields were given."})
    }
    
});

app.put('/api/v1/gestore/:idGestore/campo/:idCampo', function(req, res) {
    if(checkCampoProperties(req.body)){
        model.editCampo(req.params.idGestore, req.params.idCampo, req.body.nome, req.body.indirizzo, req.body.cap,
            req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result)=>{
            if(result)
                res.json({success:result, message:"Updated"})
            else
                res.json({success:result, message:"Campo not found"})
        })
    }else{
        res.json({"success":false, "message":"Not all required fields were given."})
    }
    
})

function checkCampoProperties(reqBody){
    return reqBody.nome != undefined && reqBody.nome != null &&
    reqBody.indirizzo != undefined && reqBody.indirizzo != null &&
    reqBody.cap != undefined && reqBody.cap != null &&
    reqBody.citta != undefined && reqBody.citta != null &&
    reqBody.provincia != undefined && reqBody.provincia != null &&
    reqBody.sport != undefined && reqBody.sport != null &&
    reqBody.tariffa != undefined && reqBody.tariffa != null &&
    reqBody.prenotaEntro != undefined && reqBody.prenotaEntro != null
}


//router cerca campi per nome 
app.get('/api/v1/CampiPerNome', (req, res) => {

    model.getCampiPerNome(req.body.nomeCampo).then((campi)=>{
        res.send(JSON.stringify(campi))
    }).catch(err=>{
        response.send("error")
    })
})
// router cerca campi per luogo 
app.get('/api/v1/CampiPerluogo', (req, res) => {

    model.getCampiPerLuogo(req.body.luogo).then((campi)=>{
        res.send(JSON.stringify(campi))
    }).catch(err=>{
        res.send("error")
    })
})

// router cerca campi in un  raggio
app.get('/api/v1/CampiEntroRaggio', (req, res) => {

    model. getCampiNelRAggio(req.body.lat_utente, req.body.long_utente, req.body.raggio).then((campi)=>{
        res.send(JSON.stringify(campi))
    }).catch(err=>{
        res.send("error")
    })
})


// used for testing
module.exports = app