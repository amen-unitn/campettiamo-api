
var express = require('express');
var app = express();
app.use(express.json())
var db = require('./db-model');
const Path = require('node:path');
var Fs = require('node:fs');
var authentication = require('./auth.js');
var paypal = require('./paypal');

const model = new db.Model();

// filtro di autenticazione
function authFilter(req, res, next) {
	//console.log(req._parsedUrl.pathname);
	//console.log(req.method);
	pathRequiresAuth = ['/api/v2/campi', '/api/v2/campo', '/api/v2/campi-luogo', '/api/v2/campi-nome', '/api/v2/campi-raggio', '/api/v2/utenti'];
	if ((req._parsedUrl.pathname == '/api/v2/utente' || req._parsedUrl.pathname == '/api/v2/gestore') && req.method == "POST"
		|| req._parsedUrl.pathname == '/api/v2/login' || req._parsedUrl.pathname == '/api/v2/recupero')
		next(); //allow account creation
	else {
		let needAuth = false;
		for (path in pathRequiresAuth) {
			if (req._parsedUrl.pathname.includes(path)) {
				needAuth = true;
				break;
			}
		}
		if (needAuth)
			authentication.tokenChecker(req, res, next);
		else
			next();
	}
}

app.use(authFilter);

// gestione account ed autenticazione
app.post('/api/v2/login', authentication.generateToken);
app.post('/api/v2/recupero', authentication.recuperoPassword);
app.post('/api/v2/utente', authentication.createAccountUtente);
app.post('/api/v2/gestore', authentication.createAccountGestore);
app.put('/api/v2/utente', authentication.editAccount);
app.put('/api/v2/gestore', authentication.editAccount);
app.get('/api/v2/utente', authentication.getLoggedAccount);
app.get('/api/v2/gestore', authentication.getLoggedAccount);
app.delete('/api/v2/utente', authentication.deleteAccount);
app.delete('/api/v2/gestore', authentication.deleteAccount);

/*

	in caso di errore, nella risposta c'è anche errno, che vale:
	1: token invalido
	2: parametri non validi / corrispondenze non trovate
	3: non autorizzato
	4: altro (errore interno)
	5: percorso non valido (endpoint non trovato)
*/

// -----------------------------------------------------------> CAMPI <--------------------------------------------------
// router ottieni la lista di tutti i campi
app.get('/api/v2/campi', function (req, res) {
	model.getListaCampi().then((campi) => {
		res.json({ success: true, data: campi })
	})
});

// router ottieni campi per luogo
app.get('/api/v2/campi-luogo', async (req, res) => {

	if (req.query.luogo == undefined || req.query.luogo == null || req.query.luogo == '' || req.query.raggio == undefined || req.query.raggio == null || isNaN(parseFloat(req.query.raggio))) {
		res.json({ success: false, message: "Luogo or raggio not provided", errno: 2 })
	} else {
		coord = await model.getCoordinates(req.query.luogo)

		model.getCampiNelRaggio(coord.lat, coord.lng, parseFloat(req.query.raggio)).then((campi) => {
			res.json({ success: true, data: campi })
		}).catch(err => {
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}

})

//router ottiene campi per nome
app.get('/api/v2/campi-nome', (req, res) => {

	model.getCampiPerNome(req.query.nome).then((campi) => {
		if (campi.length === 0) {
			res.json({ success: false, message: "campetto inesistente", errno: 2 })
		} else {
			res.json({ success: true, data: campi })
		}
	})
})

// router cerca campi in un raggio
app.get('/api/v2/campi-raggio', (req, res) => {

	lat = parseFloat(req.query.lat)
	lng = parseFloat(req.query.lng)
	raggio = parseFloat(req.query.raggio)

	if (isNaN(lat) || isNaN(lng) || isNaN(raggio)) {
		res.json({ success: false, message: "Error on finding data", errno: 2 })
	} else {
		model.getCampiNelRaggio(parseFloat(req.query.lat), parseFloat(req.query.lng), parseFloat(req.query.raggio)).then((campi) => {
			res.json({ success: true, data: campi })
		}).catch(err => {
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}

})

// router crea campo
app.post('/api/v2/campo', function (req, res) {
	if (authentication.checkIsGestore(req, res)) {
		if (checkCampoProperties(req.body)) {
			model.createCampo(req.loggedUser.id, req.body.nome, req.body.indirizzo, req.body.cap,
				req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result) => {
					res.json({ "success": true, id: result })
				})
		} else {
			res.json({ "success": false, "message": "Not all required fields were given correctly.", errno: 2 })
		}
	}

});

// router ottiene campo
app.get('/api/v2/campo/:id', function (req, res) {
	model.getCampo(req.params.id).then((result) => {
		if (result === null) {
			res.json({ success: false, msg: "il campo inserito non è valido", errno: 2 })
		} else {
			res.json({ success: true, data: result })
		}

	})
});

// router modifica campo
app.put('/api/v2/campo/:id', async (req, res) => {
	if (authentication.checkIsGestore(req, res)) {
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.id);
		if (!checkOwns)
			res.json({ success: false, message: "You are not authorized to do this", errno: 3 });
		else {

			if (checkCampoProperties(req.body)) {
				model.editCampo(req.params.id, req.body.nome, req.body.indirizzo, req.body.cap,
					req.body.citta, req.body.provincia, req.body.sport, req.body.tariffa, req.body.prenotaEntro).then((result) => {
						if (result)
							res.json({ success: true, message: "Updated" })
						else
							res.json({ success: true, message: "Campo not found or invalid" })
					})
			} else {
				res.json({ "success": false, "message": "Not all required fields were given, or they were invalid", errno: 2 })
			}
		}
	}

});

// router elimina campo
app.delete('/api/v2/campo/:id', async (req, res) => {
	if (authentication.checkIsGestore(req, res)) {
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.id);
		if (!checkOwns)
			res.json({ success: false, message: "You are not authorized to do this", errno: 3 });
		else {
			model.deleteCampo(req.params.id).then((result) => {
				if (result)
					res.json({ success: true, message: "Deleted" })
				else
					res.json({ success: true, message: "Campo not found" })
			})
		}
	}
});

// router crea prenotazione del campo
app.post('/api/v2/campo/:idCampo/prenota', function (req, res) {
	if (authentication.checkIsUtente(req, res)) {
		if (checkPrenotazioneProperties(req.body)) {
			console.log(req.body)
			model.newPrenotazione(req.loggedUser.id, req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
				if (result)
					res.json({ success: true, message: "Prenotazione created", id: result })
				else
					res.json({ success: false, message: "Cannot create prenotazione", errno: 4 })
			})
		} else {
			res.json({ "success": false, "message": "Not all required fields were given", errno: 2 })
		}
	}
});

app.get('/api/v2/utenti', function (req, res) {
	model.idUtenti().then((utenti) => {
		res.json({ success: true, data: utenti })
	})
});

function checkSlotProperties(reqBody) {
	return reqBody.data != undefined && reqBody.data != null &&
		reqBody.oraInizio != undefined && reqBody.oraInizio != null &&
		reqBody.oraFine != undefined && reqBody.oraFine != null
}

function checkPrenotazioneProperties(reqBody) {
	return reqBody.data != undefined && reqBody.data != null && !isNaN(new Date(reqBody.data).getTime()) &&
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
app.get('/api/v2/campi-nome', (req, res) => {

	model.getCampiPerNome(req.query.nome).then((campi) => {
		if (campi.length === 0) {
			res.json({ success: false, message: "campetto inesistente", errno: 2 })
		} else {
			res.json({ success: true, data: campi })
		}
	})
})
// router cerca campi per luogo (trova prima le coordinate geografiche del luogo)
app.get('/api/v2/campi-luogo', async (req, res) => {

	if (req.query.luogo == undefined || req.query.luogo == null || req.query.luogo == '' || req.query.raggio == undefined || req.query.raggio == null || isNaN(parseFloat(req.query.raggio))) {
		res.json({ success: false, message: "Luogo or raggio not provided", errno: 2 })
	} else {
		coord = await model.getCoordinates(req.query.luogo)

		model.getCampiNelRaggio(coord.lat, coord.lng, parseFloat(req.query.raggio)).then((campi) => {
			res.json({ success: true, data: campi })
		}).catch(err => {
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}

})

// router cerca campi in un raggio
app.get('/api/v2/campi-raggio', (req, res) => {

	lat = parseFloat(req.query.lat)
	lng = parseFloat(req.query.lng)
	raggio = parseFloat(req.query.raggio)

	if (isNaN(lat) || isNaN(lng) || isNaN(raggio)) {
		res.json({ success: false, message: "Error on finding data", errno: 2 })
	} else {
		model.getCampiNelRaggio(parseFloat(req.query.lat), parseFloat(req.query.lng), parseFloat(req.query.raggio)).then((campi) => {
			res.json({ success: true, data: campi })
		}).catch(err => {
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}

})

app.get('/api/v2/campo/:idCampo/foto', (req, res) => {
	model.getCampo(req.params.idCampo).then(async (campo) => {


		const path = Path.resolve(__dirname, 'tmp', 'streetview' + Date.now() + '.jpg')

		if (campo === null) {
			res.json({ success: false, message: "Campo not found", errno: 2 })
		} else {
			const size = "800x800"
			let url = process.env.baseStreetViewUrl + "?size=" + size + "&location=" + campo.lat + "," + campo.lng + "&fov=80&heading=70&pitch=0&key=" + process.env.gmapsKey
			let response_strview = await axios({
				url,
				method: 'GET',
				responseType: 'stream'
			})


			res.set('Content-Type', 'image/jpeg');
			const chunks = [];

			response_strview.data.on("data", function (chunk) {
				chunks.push(chunk);
			});

			// Send the buffer or you can put it into a var
			response_strview.data.on("end", function () {
				res.send(Buffer.concat(chunks));
			});

		}
	}).catch((err) => {
		console.log(err)
		res.json({ success: false, message: "Error while downloading image from Street View", errno: 4 })
	})
})

// router ottiene lista delle prenotazioni del campo (gestore)
app.get('/api/v2/campo/:idCampo/prenotazioni', async (req, res) => {
	if (authentication.checkIsGestore(req, res)) {
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if (!checkOwns)
			res.json({ success: false, message: "You are not authorized to see these info", errno: 3 });
		else
			model.getListaPrenotazioni(req.params.idCampo).then((prenotazioni) => {
				res.json({ success: true, data: prenotazioni })
			}).catch(err => {
				res.json({ success: false, message: "Error", errno: 4 })
			})
	}
})

// ---------------------------------------------------------------> CAMPI <--------------------------------------------------

// ---------------------------------------------------------------> SLOTS <--------------------------------------------------

// router ottiene lista di slot del campo
app.get('/api/v2/campo/:idCampo/slots', function (req, res) {
	model.getSlots(req.params.idCampo).then((result) => {
		res.json({ success: true, data: result })
	})
});

// router ottiene lista di slot per giorno del campo
app.get('/api/v2/campo/:idCampo/slot/giorno/:data', function (req, res) {
	model.getAvailableSlots(req.params.idCampo, req.params.data).then((result) => {
		res.json({ success: true, data: result })
	})
});

// router ottiene lista di slot per mese del campo
app.get('/api/v2/campo/:idCampo/slot/mese/:data', function (req, res) {
	let [anno, mese] = req.params.data.split('-')

	if (anno != undefined && mese != undefined)
		model.checkMonthAvailability(req.params.idCampo, mese, anno).then((result) => {
			res.json({ success: true, data: result })
		})
	else res.json({ success: false, errno: 2 })
});

// router crea slot nel campo
app.post('/api/v2/campo/:idCampo/slot', async (req, res) => {
	if (authentication.checkIsGestore(req, res)) {
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if (!checkOwns)
			res.json({ success: false, message: "You are not authorized to do this", errno: 3 });
		else {
			if (checkSlotProperties(req.body)) {
				let [anno, mese, giorno] = req.body.data.split('-')

				data = model.createSlot(req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {

					if (result)
						res.json({ success: true, message: "Slot created" })
					else
						res.json({ success: false, message: "Slot overlaps with another one, is in the past" })
				})
			} else {
				res.json({ "success": false, "message": "Not all required fields were given.", errno: 2 })
			}
		}
	}
});

// router elimina slot dal campo
app.delete('/api/v2/campo/:idCampo/slot', async (req, res) => { // add oraInizio and oraFine
	if (authentication.checkIsGestore(req, res)) {
		checkOwns = await authentication.checkOwnsCampo(req.loggedUser.id, req.params.idCampo);
		if (!checkOwns)
			res.json({ success: false, message: "You are not authorized to do this", errno: 3 });
		else {
			if (checkSlotProperties(req.body)) {
				model.deleteSlot(req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
					res.json({ success: result.success, message: result.message })
				})
			} else {
				res.json({ "success": false, "message": "Not all required fields were given.", errno: 2 })
			}
		}
	}
});

// put method is not implemented because it wouldn't be useful specify both old and new values
// you can delete the old slot and create a new one

// ---------------------------------------------------------> SLOTS <--------------------------------------------------

// ---------------------------------------------------------> UTENTE <--------------------------------------------------

// router elimina la prenotazione effettuata dall'utente
app.delete('/api/v2/utente/elimina-prenotazione/', (req, res) => {
	if (authentication.checkIsUtente(req, res)) {
		model.deletePrenotazione(req.loggedUser.id, req.body.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
			res.json({ success: result.success, message: result.message })
		}).catch(err => {
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}
})

// router ottiene lista delle prenotazioni in base all'ID dell'utente
app.get('/api/v2/utente/mie-prenotazioni', (req, res) => {
	if (authentication.checkIsUtente(req, res)) {
		model.getListaPrenotazioniUtente(req.loggedUser.id).then((prenotazioni) => {
			res.json({ success: true, data: prenotazioni })
		}).catch(err => {
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}
})

// ---------------------------------------------------------> UTENTE <--------------------------------------------------

// ---------------------------------------------------------> GESTORE <--------------------------------------------------

// router ottiene lista dei campi del gestore
app.get('/api/v2/gestore/miei-campi', (req, res) => {
	if (authentication.checkIsGestore(req, res)) {
		model.getListaCampiGestore(req.loggedUser.id).then((campi) => {
			res.json({ success: true, data: campi })
		}).catch(err => {
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}
})

// router elimina la prenotazione effettuata dall'utente
app.delete('/api/v2/campo/:id/prenota', (req, res) => {
	if (authentication.checkIsUtente(req, res)) {
		model.deletePrenotazione(req.loggedUser.id, req.params.id, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
			if (result)
				res.json({ success: true, message: "Prenotazione deleted" })
			else
				res.json({ success: false, message: "Error on delete prenotazione - it is not possible to delete a prenotazione less than 24 hours before" })
		}).catch(err => {
			console.log(err)
			res.json({ success: false, message: "Error", errno: 4 })
		})
	}
})

app.get('/api/v2/paypal/client', (req, res) => {
	paypal.getClientToken(req.query.id, (token) => {
		res.json({ success: true, token: token })
	})
})

app.post('/api/v2/paypal/paga', (req, res) => {
	paypal.pay(req.body.amount, req.body.nonce, (result) => {
		res.json({ success: result.success })
	})
})

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function (req, res) {
	res.status(404).json({ success: false, message: "Invalid path", errno: 5 });
});

process.on('exit', async function () {
	// Add shutdown logic here.
	await model.onexit()
});

module.exports = app
