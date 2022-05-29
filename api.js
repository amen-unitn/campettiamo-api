
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
	   || req._parsedUrl.pathname == '/api/v1/login')
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

app.post('/api/v1/login', authentication.generateToken);
app.post('/api/v1/utente', authentication.createAccountUtente);
app.post('/api/v1/gestore', authentication.createAccountGestore);
app.put('/api/v1/utente', authentication.editAccount);
app.put('/api/v1/gestore', authentication.editAccount);
app.delete('/api/v1/utente', authentication.deleteAccount);
app.delete('/api/v1/gestore', authentication.deleteAccount);

/*

	in caso di errore, nella risposta c'è anche errno, che vale:
	1: token invalido
	2: parametri non validi
	3: non autorizzato
	4: altro
*/

app.get('/api/v1/campi', function (req, res) {
    model.getListaCampi().then((campi) => {
        res.json({success: true, data:campi})
    })
});

app.get('/api/v1/campo/:id', function (req, res) {
    model.getCampo(req.params.id).then((result) => {
        if (result === null) {
            res.json({ success:false, msg: "il campo inserito non è valido", errno:2 })
        } else {
            res.json({success: true, data:result})
        }

    })
});

app.delete('/api/v1/campo/:id', async (req, res) => {
    if(authentication.checkIsGestore(req, res)){
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if(!checkOwns)
			res.json({success:false, message: "You are not authorized to do this", errno:3});
		else{
			model.deleteCampo(req.params.id).then((result) => {
				if (result)
				    res.json({ success: true, message: "Deleted" })
				else
				    res.json({ success: true, message: "Campo not found" })
			})
		}
	}
});

app.post('/api/v1/campo/', function (req, res) {
    if(authentication.checkIsGestore(req, res)){
		if (checkCampoProperties(req.body)) {
		    model.createCampo(req.loggedUser.id, req.body.nome, req.body.indirizzo, req.body.cap,
		        req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result) => {
		            res.json({ "success": true, id: result })
		        })
		} else {
		    res.json({ "success": false, "message": "Not all required fields were given correctly.", errno:2 })
		}
	}

});

app.put('/api/v1/campo/:id', async (req, res) => {
    if(authentication.checkIsGestore(req, res)){
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if(!checkOwns)
			res.json({success:false, message: "You are not authorized to do this", errno:3});
		else{
		
			if (checkCampoProperties(req.body)) {
				model.editCampo(req.params.id, req.body.nome, req.body.indirizzo, req.body.cap,
				    req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result) => {
				        if (result)
				            res.json({ success: true, message: "Updated" })
				        else
				            res.json({ success: true, message: "Campo not found or invalid" })
				    })
			} else {
				res.json({ "success": false, "message": "Not all required fields were given.", errno:2 })
			}
		}
	}

});

// slots





app.post('/api/v1/campo/:idCampo/slot', async (req, res) => {
    if(authentication.checkIsGestore(req, res)){
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if(!checkOwns)
			res.json({success:false, message: "You are not authorized to do this", errno:3});
		else{
			if (checkSlotProperties(req.body)) {
				let [anno, mese, giorno] = req.body.data.split('-')

				data = model.createSlot(req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {

				    if (result)
				        res.json({ success: true, message: "Slot created" })
				    else
				        res.json({ success: true, message: "Slot overlaps with another or is in the past" })
				})
			} else {
				res.json({ "success": false, "message": "Not all required fields were given.", errno:2 })
			}
		}
	}
});

app.delete('/api/v1/campo/:idCampo/slot', async (req, res) => { // add oraInizio and oraFine
    if(authentication.checkIsGestore(req, res)){
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if(!checkOwns)
			res.json({success:false, message: "You are not authorized to do this", errno:3});
		else{
			if (checkSlotProperties(req.body)) {
				model.deleteSlot(req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
				    res.json({ success: result.success, message: result.message })
				})
			} else {
				res.json({ "success": false, "message": "Not all required fields were given.", errno:2 })
			}
		}
	}
});

app.get('/api/v1/campo/:idCampo/slots', function (req, res) {
    model.getSlots(req.params.idCampo).then((result) => {
        res.json({success:true, data:result})
    })
});

app.get('/api/v1/campo/:idCampo/slot/mese/:data', function (req, res) {
    let [anno, mese] = req.params.data.split('-')

    model.checkMonthAvailability(req.params.idCampo, mese, anno).then((result) => {
        res.json({success:true, data:result})
    })
});

app.get('/api/v1/campo/:idCampo/slot/giorno/:data', function (req, res) {
    model.getAvailableSlots(req.params.idCampo, req.params.data).then((result) => {
        res.json({success:true, data:result})
    })
});

// put method is not implemented because it wouldn't be useful specify both old and new values
// you can delete the old slot and create a new one

app.post('/api/v1/campo/:idCampo/prenota', function (req, res) {
    if(authentication.checkIsUtente(req, res)){
		if (checkPrenotazioneProperties(req.body)) {
		    model.newPrenotazione(req.loggedUser.id, req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
		        if (result)
		            res.json({ success: true, message: "Prenotazione created", id: result })
		        else
		            res.json({ success: false, message: "Cannot create prenotazione", errno:4 })
		    })
		} else {
		    res.json({ "success": false, "message": "Not all required fields were given", errno:2 })
		}
	}
});

app.get('/api/v1/utenti', function (req, res) {
    model.idUtenti().then((utenti) => {
        res.json({success:true, data:utenti})
    })
});

function checkSlotProperties(reqBody) {
    return reqBody.data != undefined && reqBody.data != null &&
        reqBody.oraInizio != undefined && reqBody.oraInizio != null &&
        reqBody.oraFine != undefined && reqBody.oraFine != null
}

function checkPrenotazioneProperties(reqBody) {
    return reqBody.data != undefined && reqBody.data != null &&
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
        reqBody.prenotaEntro != undefined && reqBody.prenotaEntro != null && !isNaN(reqBody.prenotaEntro)
}


//router cerca campi per nome   
app.get('/api/v1/campi-nome', (req, res) => {

    model.getCampiPerNome(req.query.nome).then((campi) => {
        if (campi.length === 0) {
            res.json({ success: false, message: "campetto inesistente", errno:2 })
        } else {
            res.json({success:true, data:campi})
        }
    })
})
// router cerca campi per luogo (trova prima le coordinate geografiche del luogo)
app.get('/api/v1/campi-luogo', async (req, res) => {

    if (req.query.luogo == undefined || req.query.luogo == null || req.query.luogo == '' || req.query.raggio == undefined || req.query.raggio == null || isNaN(parseFloat(req.query.raggio))) {
        res.json({ success: false, message: "Luogo or raggio not provided", errno:2 })
    } else {
        coord = await model.getCoordinates(req.query.luogo)

        model.getCampiNelRaggio(coord.lat, coord.lng, parseFloat(req.query.raggio)).then((campi) => {
            res.json({success:true, data:campi})
        }).catch(err => {
            res.json({ success: false, message: "Error", errno:4 })
        })
    }

})

// router cerca campi in un raggio
app.get('/api/v1/campi-raggio', (req, res) => {

    lat = parseFloat(req.query.lat)
    lng = parseFloat(req.query.lng)
    raggio = parseFloat(req.query.raggio)

    if (isNaN(lat) || isNaN(lng) || isNaN(raggio)) {
        res.json({ success: false, message: "Error on finding data", errno:2 })
    } else {
        model.getCampiNelRaggio(parseFloat(req.query.lat), parseFloat(req.query.lng), parseFloat(req.query.raggio)).then((campi) => {
            res.json({success:true, data:campi})
        }).catch(err => {
            res.json({ success: false, message: "Error", errno:4 })
        })
    }

})

app.get('/api/v1/campo/:idCampo/foto', (req, res) => {
    model.getCampo(req.params.idCampo).then(async (campo) => {


        const path = Path.resolve(__dirname, 'tmp', 'streetview' + Date.now() + '.jpg')

        if (campo === null) {
            res.json({ success: false, message: "Campo not found", errno:2 })
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
                res.json({ success: false, message: err, errno:4 })
            })

        }
    }).catch((err) => {
        console.log(err)
        res.json({ success: false, message: "Error while downloading image from Street View", errno:4 })
    })
})

// router ottiene lista delle prenotazioni del campo
app.get('/api/v1/campo/:idCampo/prenotazioni', async (req, res) => {
    if(authentication.checkIsGestore(req, res)){
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if(!checkOwns)
			res.json({success:false, message: "You are not authorized to see these info", errno:3});
		else
			model.getListaPrenotazioni(req.params.idCampo).then((prenotazioni) => {
				res.json({success:true, data:prenotazioni})
			}).catch(err => {
				res.json({ success: false, message: "Error", errno:4 })
			})
	}
})

// router ottiene lista delle prenotazioni in base all'ID dell'utente
app.get('/api/v1/utente/mie-prenotazioni', (req, res) => {
    if(authentication.checkIsUtente(req, res)){
		model.getListaPrenotazioniUtente(req.loggedUser.id).then((prenotazioni) => {
		    res.json({success:true, data:prenotazioni})
		}).catch(err => {
		    res.json({ success: false, message: "Error", errno:4 })
		})
	}
})

// router ottiene lista dei campi del gestore
app.get('/api/v1/gestore/miei-campi', (req, res) => {
    if(authentication.checkIsGestore(req, res)){
		model.getListaCampiGestore(req.loggedUser.id).then((campi) => {
		    res.json({success:true, data:campi})
		}).catch(err => {
		    res.json({ success: false, message: "Error", errno:4 })
		})
    }
})

// router elimina la prenotazione effettuata dall'utente
app.delete('/api/v1/utente/elimina-prenotazione/:data/:oraInizio/:oraFine', (req, res) => {
    if(authentication.checkIsUtente(req, res)){
    	model.deletePrenotazione(req.loggedUser.id, req.params.data, req.params.oraInizio, req.params.oraFine).then((result) => {
        res.json({ success: result.success, message: result.message })
		}).catch(err => {
		    res.json({success:false, message:"Error", errno:4})
		})
    }
})

module.exports = app
