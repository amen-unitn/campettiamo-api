
var express = require('express');
var app = express();
app.use(express.json())
var db = require('./db-model');
const Path = require('node:path');
var Fs = require('node:fs');
var authentication = require('./auth.js');

const model = new db.Model();

function authFilter(req, res, next){
	console.log(req._parsedUrl.pathname);
	console.log(req.method);
	pathRequiresAuth = ['/api/v1/campi','/api/v1/campo','/api/v1/campi-luogo','/api/v1/campi-nome','/api/v1/campi-raggio','/api/v1/utenti'];
	if((req._parsedUrl.pathname == '/api/v1/utente' || req._parsedUrl.pathname == '/api/v1/gestore') && req.method == "POST"
	   || req._parsedUrl.pathname == '/api/v1/utente/login' || req._parsedUrl.pathname == '/api/v1/gestore/login')
		next(); //allow account creation
	else{
		let needAuth = false;
		for(path in pathRequiresAuth){
			if(req._parsedUrl.pathname.includes(path)){
				needAuth = true;
				break;
			}
		}
		if(needAuth)
			authentication.tokenChecker(req, res, next);
		else
			next();
	}
}

app.use(authFilter);

app.post('/api/v1/utente/login', authentication.generateToken);
app.post('/api/v1/gestore/login', authentication.generateToken);
app.post('/api/v1/utente', authentication.createAccountUtente);
app.post('/api/v1/gestore', authentication.createAccountGestore);
app.put('/api/v1/utente', authentication.editAccount);
app.put('/api/v1/gestore', authentication.editAccount);
app.delete('/api/v1/utente', authentication.deleteAccount);
app.delete('/api/v1/gestore', authentication.deleteAccount);

app.get('/api/v1/campi', function (req, res) {
    model.getListaCampi().then((campi) => {
        res.json(campi)
    })
});

app.get('/api/v1/campo/:id', function (req, res) {
    model.getCampo(req.params.id).then((result) => {
        if (result === null) {
            res.json({ ERRORE: "il campo inserito non è valido" })
        } else {
            res.json(result)
        }

    })
});

app.delete('/api/v1/campo/:id', function (req, res) {
    authentication.checkIsGestore(req, res);
    model.deleteCampo(req.params.id).then((result) => {
        if (result)
            res.json({ success: result, message: "Deleted" })
        else
            res.json({ success: result, message: "Campo not found" })
    })
});

app.post('/api/v1/campo/', function (req, res) {
    authentication.checkIsGestore(req, res);
    if (checkCampoProperties(req.body)) {
        model.createCampo(req.body.idGestore, req.body.nome, req.body.indirizzo, req.body.cap,
            req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result) => {
                res.json({ "success": true, id: result })
            })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given correctly." })
    }

});

app.put('/api/v1/campo/:id', function (req, res) {
    authentication.checkIsGestore(req, res);
    if (checkCampoProperties(req.body)) {
        model.editCampo(req.params.id, req.body.nome, req.body.indirizzo, req.body.cap,
            req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result) => {
                if (result)
                    res.json({ success: result, message: "Updated" })
                else
                    res.json({ success: result, message: "Campo not found or invalid" })
            })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given." })
    }

});

// slots





app.post('/api/v1/campo/:idCampo/slot', function (req, res) {
    authentication.checkIsGestore(req, res);
    if (checkSlotProperties(req.body)) {
        let [anno, mese, giorno] = req.body.data.split('-')
        data = model.createSlot(req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {

            if (result)
                res.json({ success: result, message: "Slot created" })
            else
                res.json({ success: result, message: "Slot overlaps with another or is in the past" })
        })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given." })
    }
});

app.delete('/api/v1/campo/:idCampo/slot', function (req, res) { // add oraInizio and oraFine
    authentication.checkIsGestore(req, res);
    if (checkSlotProperties(req.body)) {
        model.deleteSlot(req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
            res.json({ success: result.success, message: result.message })
        })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given." })
    }
});

app.get('/api/v1/campo/:idCampo/slots', function (req, res) {
    model.getSlots(req.params.idCampo).then((result) => {
        res.json(result)
    })
});

app.get('/api/v1/campo/:idCampo/slot/mese/:data', function (req, res) {
    let [anno, mese] = req.params.data.split('-')

    model.checkMonthAvailability(req.params.idCampo, mese, anno).then((result) => {
        res.json(result)
    })
});

app.get('/api/v1/campo/:idCampo/slot/giorno/:data', function (req, res) {
    model.getAvailableSlots(req.params.idCampo, req.params.data).then((result) => {
        res.json(result)
    })
});

// put method is not implemented because it wouldn't be useful specify both old and new values
// you can delete the old slot and create a new one

app.post('/api/v1/campo/:idCampo/prenota', function (req, res) {
    authentication.checkIsUtente(req, res);
    if (checkPrenotazioneProperties(req.body)) {
        model.newPrenotazione(req.body.idUtente, req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
            if (result)
                res.json({ success: true, message: "Prenotazione created", id: result })
            else
                res.json({ success: false, message: "Cannot create prenotazione" })
        })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given" })
    }
});

app.get('/api/v1/utenti', function (req, res) {
    model.idUtenti().then((utenti) => {
        res.json(utenti)
    })
});

function checkSlotProperties(reqBody) {
    return reqBody.data != undefined && reqBody.data != null &&
        reqBody.oraInizio != undefined && reqBody.oraInizio != null &&
        reqBody.oraFine != undefined && reqBody.oraFine != null
}

function checkPrenotazioneProperties(reqBody) {
    const today = new Date();
    const todayDate = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    const prenotazione = new Date(reqBody.data + 'T' + reqBody.oraInizio + ':00');
    const prenotazioneDate = prenotazione.getFullYear() + '-' + (prenotazione.getMonth() + 1) + '-' + prenotazione.getDate();

    return reqBody.idUtente != undefined && reqBody.idUtente != null &&
        reqBody.data != undefined && reqBody.data != null &&
        reqBody.oraInizio != undefined && reqBody.oraInizio != null &&
        reqBody.oraFine != undefined && reqBody.oraFine != null
}

function checkCampoProperties(reqBody) {
    return reqBody.nome != undefined && reqBody.nome != null &&
        reqBody.indirizzo != undefined && reqBody.indirizzo != null &&
        reqBody.cap != undefined && reqBody.cap != null && !isNaN(reqBody.cap) &&
        reqBody.citta != undefined && reqBody.citta != null &&
        reqBody.provincia != undefined && reqBody.provincia != null &&
        reqBody.sport != undefined && reqBody.sport != null &&
        reqBody.tariffa != undefined && reqBody.tariffa != null && !isNaN(reqBody.tariffa) &&
        reqBody.prenotaEntro != undefined && reqBody.prenotaEntro != null && !isNaN(reqBody.prenotaEntro) &&
        reqBody.idGestore != undefined && reqBody.idGestore != null
}


//router cerca campi per nome   
app.get('/api/v1/campi-nome', (req, res) => {

    model.getCampiPerNome(req.query.nome).then((campi) => {
        if (campi.length === 0) {
            res.json({ success: false, message: "campetto inesistente" })
        } else {
            res.json(campi)
        }
    })
})
// router cerca campi per luogo (trova prima le coordinate geografiche del luogo)
app.get('/api/v1/campi-luogo', async (req, res) => {

    if (req.query.luogo == undefined || req.query.luogo == null || req.query.luogo == '' || req.query.raggio == undefined || req.query.raggio == null || isNaN(parseFloat(req.query.raggio))) {
        res.json({ success: false, message: "Luogo or raggio not provided" })
    } else {
        coord = await model.getCoordinates(req.query.luogo)

        model.getCampiNelRaggio(coord.lat, coord.lng, parseFloat(req.query.raggio)).then((campi) => {
            res.json(campi)
        }).catch(err => {
            res.json({ success: false, message: "Error" })
        })
    }

})

// router cerca campi in un raggio
app.get('/api/v1/campi-raggio', (req, res) => {

    lat = parseFloat(req.query.lat)
    lng = parseFloat(req.query.lng)
    raggio = parseFloat(req.query.raggio)

    if (isNaN(lat) || isNaN(lng) || isNaN(raggio)) {
        res.json({ success: false, message: "Error on finding data" })
    } else {
        model.getCampiNelRaggio(parseFloat(req.query.lat), parseFloat(req.query.lng), parseFloat(req.query.raggio)).then((campi) => {
            res.json(campi)
        }).catch(err => {
            res.json({ success: false, message: "Error" })
        })
    }

})

app.get('/api/v1/campo/:idCampo/foto', (req, res) => {
    model.getCampo(req.params.idCampo).then(async (campo) => {


        const path = Path.resolve(__dirname, 'tmp', 'streetview' + Date.now() + '.jpg')

        if (campo === null) {
            res.json({ success: false, message: "Campo not found" })
        } else {
            const size = "800x800"
            let url = process.env.baseStreetViewUrl + "?size=" + size + "&location=" + campo.lat + "," + campo.lng + "&fov=80&heading=70&pitch=0&key=" + process.env.gmapsKey
            let response_strview = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            })

            const writer = Fs.createWriteStream(path)
            response_strview.data.pipe(writer)
            writer.on('finish', () => {
                res.download(path, () => {
                    //after sending to client, delete picture
                    Fs.unlink(path, () => { })
                })
            })
            writer.on('error', (err) => {
                res.json({ success: false, message: err })
            })

        }
    }).catch((err) => {
        console.log(err)
        res.json({ success: false, message: "Error while downloading image from Street View" })
    })
})

// router ottiene lista delle prenotazioni del campo
app.get('/api/v1/campo/:idCampo/prenotazioni', (req, res) => {
    model.getListaPrenotazioni(req.params.idCampo).then((prenotazioni) => {
        res.json(prenotazioni)
    }).catch(err => {
        res.json({ success: false, message: "Error" })
    })
})

// router ottiene lista delle prenotazioni in base all'ID dell'utente
app.get('/api/v1/utente/:idUtente/mie-prenotazioni', (req, res) => {
    model.getListaPrenotazioniUtente(req.params.idUtente).then((prenotazioni) => {
        res.json(prenotazioni)
    }).catch(err => {
        res.json({ success: false, message: "Error" })
    })
})

// router ottiene lista dei campi del gestore
app.get('/api/v1/gestore/:idGestore/miei-campi', (req, res) => {
    model.getListaCampiGestore(req.params.idGestore).then((campi) => {
        res.json(campi)
    }).catch(err => {
        res.json({ success: false, message: "Error" })
    })
})

// used for testing
module.exports = app
