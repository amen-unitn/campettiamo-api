
var express = require('express');
var app = express();
app.use(express.json())
var db = require('./db-model');

const model = new db.Model();


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
    model.deleteCampo(req.params.id).then((result) => {
        if (result)
            res.json({ success: result, message: "Deleted" })
        else
            res.json({ success: result, message: "Campo not found" })
    })
});

app.post('/api/v1/campo/', function (req, res) {
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
    if (checkPrenotazioneProperties(req.body)) {
        model.newPrenotazione(req.body.idUtente, req.params.idCampo, req.body.data, req.body.oraInizio, req.body.oraFine).then((result) => {
            if (result)
                res.json({ success: true, message: "Prenotazione created", id: result })
            else
                res.json({ success: false, message: "Cannot create prenotazione" })
        })
    } else {
        res.json({ "success": false, "message": "Not all required fields were given." })
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
    return reqBody.idUtente != undefined && reqBody.idUtente != null &&
        reqBody.data != undefined && reqBody.data != null &&
        reqBody.oraInizio != undefined && reqBody.oraInizio != null &&
        reqBody.oraFine != undefined && reqBody.oraFine != null
}

function checkCampoProperties(reqBody) {
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
app.post('/api/v1/CampiPerNome', (req, res) => {

    model.getCampiPerNome(req.body.nomeCampo).then((campi) => {
        res.send(campi.json())
    }).catch(err => {
        response.send("error")
    })
})
// router cerca campi per luogo 
app.post('/api/v1/CampiPerluogo', (req, res) => {

    model.getCampiPerLuogo(req.body.luogo).then((campi) => {
        res.send(campi.json())
    }).catch(err => {
        res.send("error")
    })
})

// router cerca campi in un  raggio
app.post('/api/v1/CampiEntroRaggio', (req, res) => {

    model.getCampiNelRAggio(req.body.lat_utente, req.body.long_utente, req.body.raggio).then((campi) => {
        res.send(campi.json())
    }).catch(err => {
        res.send("error")
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