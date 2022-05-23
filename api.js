
var express = require('express');
var app = express();
app.use(express.json())
var db = require('./db-model');
const Path = require('node:path');
var Fs = require('node:fs');
var authentication = require('./auth.js');

const model = new db.Model();

app.post('/api/v1/authentication', authentication.generateToken);
app.use('/api/v1/campi', authentication.tokenChecker);
app.use('/api/v1/campo', authentication.tokenChecker);
app.use('/api/v1/campi-luogo', authentication.tokenChecker);
app.use('/api/v1/campi-nome', authentication.tokenChecker);
app.use('/api/v1/campi-raggio', authentication.tokenChecker);
app.use('/api/v1/utenti', authentication.tokenChecker);


app.get('/api/v1/campi', function (req, res) {
    model.getListaCampi().then((campi) => {
        res.json(campi)
    })
});

app.get('/api/v1/campo/:id', function (req, res) {
    model.getCampo(req.params.id).then((result) => {
        res.json(result)
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
                res.json({ id: result })
            })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given." })
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
                    res.json({ success: result, message: "Campo not found" })
            })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given." })
    }

});

// slots

app.post('/api/v1/campo/:idCampo/slot', function (req, res) {
	authentication.checkIsGestore(req, res);
    if (checkSlotProperties(req.body)) {
        data = model.createSlot(req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
            if (result)
                res.json({ success: result, message: "Slot created" })
            else
                res.json({ success: result, message: "Slot overlaps with another" })
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

app.get('/api/v1/campo/:idCampo/slot/:data', function (req, res) {
    let [anno, mese, giorno] = req.params.data.split('-')
    // check if giorno is passed or not
    if (giorno == undefined) {
        model.checkMonthAvailability(req.params.idCampo, mese, anno).then((result) => {
            res.json(result)
        })
    } else {
        model.getAvailableSlots(req.params.idCampo, req.params.data).then((result) => {
            res.json(result)
        })
    }
});

// put method is not implemented because it wouldn't be useful specify both old and new values
// you can delete the old slot and create a new one

app.post('/api/v1/campo/:idCampo/prenotazione', function (req, res) {
	authentication.checkIsUtente(req, res);
    if (checkPrenotazioneProperties(req.body)) {
        model.newPrenotazione(req.body.idUtente, req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
            if (result)
                res.json({ success: true, message: "Prenotazione created", id: result })
            else
                res.json({ success: false, message: "Cannot create prenotazione" })
        })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given or prenotazione in the past." })
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
    const prenotazione = new Date(reqBody.data+'T'+reqBody.oraInizio+':00');
    const prenotazioneDate = prenotazione.getFullYear() + '-' + (prenotazione.getMonth() + 1) + '-' + prenotazione.getDate();

    return reqBody.idUtente != undefined && reqBody.idUtente != null &&
        reqBody.data != undefined && reqBody.data != null &&
        reqBody.oraInizio != undefined && reqBody.oraInizio != null &&
        reqBody.oraFine != undefined && reqBody.oraFine != null &&
        // check if data, oraInizio and oraFine are not in the past
        (prenotazioneDate > todayDate || 
        prenotazioneDate == todayDate && (prenotazione.getHours() > today.getHours() ||
        prenotazione.getHours() == today.getHours() && prenotazione.getMinutes() > today.getMinutes()))
}

function checkCampoProperties(reqBody) {
    return reqBody.nome != undefined && reqBody.nome != null &&
        reqBody.indirizzo != undefined && reqBody.indirizzo != null &&
        reqBody.cap != undefined && reqBody.cap != null &&
        reqBody.citta != undefined && reqBody.citta != null &&
        reqBody.provincia != undefined && reqBody.provincia != null &&
        reqBody.sport != undefined && reqBody.sport != null &&
        reqBody.tariffa != undefined && reqBody.tariffa != null &&
        reqBody.prenotaEntro != undefined && reqBody.prenotaEntro != null &&
        reqBody.idGestore != undefined && reqBody.idGestore != null
}


//router cerca campi per nome 
app.get('/api/v1/campi-nome', (req, res) => {

    model.getCampiPerNome(req.query.nome).then((campi) => {
        res.json(campi)
    }).catch(err => {
        res.json({success:false, message:"Error"})
    })
})
// router cerca campi per luogo (trova prima le coordinate geografiche del luogo)
app.get('/api/v1/campi-luogo', async (req, res) => {
	
    if(req.query.luogo == undefined || req.query.luogo == null || req.query.luogo == '' || req.query.raggio == undefined || req.query.raggio == null || isNaN(parseFloat(req.query.raggio))){
    	res.json({success:false, message:"Luogo or raggio not provided"})
    }else{
    	coord = await model.getCoordinates(req.query.luogo)

        model.getCampiNelRaggio(coord.lat, coord.lng, parseFloat(req.query.raggio)).then((campi) => {
            res.json(campi)
        }).catch(err => {
            res.json({success:false, message:"Error"})
        })
    }

})

// router cerca campi in un raggio
app.get('/api/v1/campi-raggio', (req, res) => {

    lat = parseFloat(req.query.lat)
    lng = parseFloat(req.query.lng)
    raggio = parseFloat(req.query.raggio)
    
    if(isNaN(lat) || isNaN(lng) || isNaN(raggio)){
    	res.json({success:false, message:"Error on finding data"})
    }else{
    	model.getCampiNelRaggio(parseFloat(req.query.lat), parseFloat(req.query.lng), parseFloat(req.query.raggio)).then((campi) => {
            res.json(campi)
        }).catch(err => {
            res.json({success:false, message:"Error"})
        })
    }

})

app.get('/api/v1/campo/:idCampo/foto', (req, res) => {
    model.getCampo(req.params.idCampo).then(async (campo) => {
    
    
    const path = Path.resolve(__dirname, 'tmp', 'streetview'+Date.now()+'.jpg')
    
        if(campo === null){
            res.json({success:false, message:"Campo not found"})
        }else{
            const size = "800x800"
    	    let url = process.env.baseStreetViewUrl + "?size=" + size + "&location=" + campo.lat + "," + campo.lng + "&fov=80&heading=70&pitch=0&key=" + process.env.gmapsKey
            let response_strview = await axios({url,
                method: 'GET',
                responseType: 'stream'})
                
            const writer = Fs.createWriteStream(path)
            response_strview.data.pipe(writer)
            writer.on('finish', () => {
            	res.download(path, ()=>{
            	    //after sending to client, delete picture
            	    Fs.unlink(path, ()=>{})
            	})
            })
            writer.on('error', (err) => {
            	res.json({success:false, message:err})
            })

        }
    }).catch((err) => {
        console.log(err)
        res.json({success:false, message:"Error while downloading image from Street View"})
    })
})

// router ottiene lista delle prenotazioni
app.get('/api/v1/campo/:idCampo/prenotazioni', (req, res) => {
    model.getListaPrenotazioni(req.params.idCampo).then((prenotazioni) => {
        res.json(prenotazioni)
    }).catch(err => {
        res.json({success:false, message:"Error"})
    })
})

// router ottiene lista dei campi del gestore
app.get('/api/v1/campo/:idGestore/miei-campi', (req, res) => {
    model.getListaCampiGestore(req.params.idGestore).then((campi) => {
        res.json(campi)
    }).catch(err => {
        res.json({success:false, message:"Error"})
    })
})

// const test = () => {
//     let slot = {
//         oraInizio: "12:00",
//         oraFine: "16:00",
//     }
//     let prenotazioni = [
//         {
//             oraInizio: "13:00",
//             oraFine: "14:00",
//         },
//         {
//             oraInizio: "14:30",
//             oraFine: "15:30",
//         }
//     ]
//     let slotLiberi = []
//     prenotazioni = prenotazioni.sort((a, b) => {
//         return a.oraInizio - b.oraInizio
//     })
//     let lastInizio = slot.oraInizio
//     for (let i = 0; i <= prenotazioni.length; i++) {
//         if (i == prenotazioni.length && lastInizio != slot.oraFine) {
//             slotLiberi.push({
//                 oraInizio: lastInizio,
//                 oraFine: slot.oraFine
//             })
//         } else {
//             if (lastInizio != prenotazioni[i].oraInizio) {
//                 slotLiberi.push({
//                     oraInizio: lastInizio,
//                     oraFine: prenotazioni[i].oraInizio
//                 })
//             }
//             lastInizio = prenotazioni[i].oraFine
//         }
//     }
//     console.log(slotLiberi)
// }

// test()

// used for testing
module.exports = app
