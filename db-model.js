slot = require('./slot');
neo4j = require('neo4j-driver')
axios = require('axios');
//modulo per usare .env file
require('dotenv').config()

driver = neo4j.driver(process.env.uri, neo4j.auth.basic(process.env.user, process.env.password))

class DBModel {

    async getCoordinates(indirizzo, cap, citta, provincia) {
        let address = indirizzo + " " + cap + " " + citta + " " + provincia
        return await getCoordinates(address)
    }

    async getCoordinates(address) {
        address = address.replaceAll(" ", "+")
        let url = process.env.baseGmapsUrl + address + "&key=" + process.env.gmapsKey
        const response = await axios.get(url)
        if (response.data.results.length > 0)
            return response.data.results[0].geometry.location
        else return { lat: -1, lng: -1 }
        //returns an object {lat:value, lng:value}
    }

    async createUtenteBase(nome, cognome, email, paypal, telefono, hash, tipologia) {

        let result = null
        const session = driver.session()
        try {
            result = await session.run(
                'CREATE (a:Account: ' + tipologia + ' {id:apoc.create.uuid(), nome:$nome,  ' +
                'cognome:$cognome, email:$email, account_paypal:$account_paypal,  ' +
                'telefono: $telefono, hashed_pw:$hashed_pw}) RETURN a.id', {
                "nome": nome,
                "cognome": cognome,
                "email": email,
                "account_paypal": paypal,
                "telefono": telefono,
                "hashed_pw": hash
            })

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result.records[0].get('a.id')
    }

    async createUtente(nome, cognome, email, paypal, telefono, hash) {
        return this.createUtenteBase(nome, cognome, email, paypal, telefono, hash, "Utente")
    }

    async createGestore(nome, cognome, email, paypal, telefono, hash) {
        return this.createUtenteBase(nome, cognome, email, paypal, telefono, hash, "Gestore")
    }

    async createCampo(idGestore, nome, indirizzo, cap, citta, provincia, sport, tariffa, prenotaEntro) {
        const session = driver.session()
        let final = null
        let result
        let coord = await this.getCoordinates(indirizzo, cap, citta, provincia)
        try {
            result = await session.run('CREATE (c:Campo {id:apoc.create.uuid(), nome:$nome,  ' +
                'indirizzo:$indirizzo, cap:$cap, citta:$citta, provincia:$provincia, sport:$sport,  ' +
                'tariffa:$tariffa, prenotaEntro:$prenotaEntro, lat:$lat, lng:$lng}) RETURN c.id', {
                "nome": nome,
                "indirizzo": indirizzo,
                "cap": cap,
                "citta": citta,
                "provincia": provincia,
                "sport": sport,
                "tariffa": tariffa,
                "prenotaEntro": prenotaEntro,
                "lat": coord.lat,
                "lng": coord.lng
            })
            final = await session.run('MATCH (g:Gestore),(c:Campo) WHERE g.id = $gestoreId  ' +
                'AND c.id = $campoId CREATE (g)-[r:AFFITTA]->(c)',
                { "gestoreId": idGestore, "campoId": result.records[0].get('c.id') })
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        if (final !== null)
            return result.records[0].get('c.id')
        else
            return null
    }

    async getListaCampi() {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo) RETURN c')
            dbResult.records.forEach((record) => {
                result.push(record.get("c").properties)
            })

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async getCampo(id) {
        const session = driver.session()
        let result = null
        try {
            let dbResult = await session.run('MATCH (c:Campo {id: $idCampo}) ' +
                'RETURN c', { "idCampo": id })
            if (dbResult.records && dbResult.records[0])
                result = dbResult.records[0].get("c").properties;

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async editCampo(id, nome, indirizzo, cap, citta, provincia, sport, tariffa, prenotaEntro) {
        const session = driver.session()
        let result = false
        let coord = await this.getCoordinates(indirizzo, cap, citta, provincia)
        try {
            let dbResult = await session.run('MATCH (c:Campo {id: $idCampo}) ' +
                'SET c.nome = $nome, c.indirizzo = $indirizzo, c.cap = $cap, c.citta = $citta, c.provincia = $provincia, ' +
                ' c.sport = $sport, c.tariffa = $tariffa, c.prenotaEntro = $prenotaEntro, c.lat = $lat, c.lng = $lng', {
                "idCampo": id,
                "nome": nome,
                "indirizzo": indirizzo,
                "cap": cap,
                "citta": citta,
                "provincia": provincia,
                "sport": sport,
                "tariffa": tariffa,
                "prenotaEntro": prenotaEntro,
                "lat": coord.lat,
                "lng": coord.lng
            })
            result = dbResult.summary.counters._containsUpdates
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async deleteCampo(id) {
        const session = driver.session()
        let result = []
        try {
            result = await session.run('MATCH (c:Campo {id: $idCampo}) ' +
                'DETACH DELETE c', { "idCampo": id })

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result.summary.counters._stats.nodesDeleted > 0
    }



    async getCampiPerNome(nome) {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo) WHERE c.nome =~ $cerca RETURN c', { "cerca": "(?i)^.*" + nome + ".*" })
            dbResult.records.forEach((record) => {
                result.push(record.get("c").properties)
            })

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }



    // la matematica è presa da qui https://www.geeksforgeeks.org/program-distance-two-points-earth/
    // in particolare usiamo questa formula Distance  = 6372,795477598(raggio terrestre in km) * arccos[(sin(lat1) * sin(lat2)) + cos(lat1) * cos(lat2) * cos(long2 – long1)]
    // il raggio è da passare alla funzione in km , le coordinate in formato  ( +/-)  xxx.yyyyyyy

    async getCampiNelRaggio(latitudine_utente, longitudine_utente, raggio) {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo) WHERE (6371 * acos((sin(c.lat/57.29577951)*sin($lat/57.29577951)) + cos(c.lat/57.29577951)*cos($lat/57.29577951)*cos($lng/57.29577951-c.lng/57.29577951))) <= $raggio RETURN c', { "lat": latitudine_utente, "lng": longitudine_utente, "raggio": raggio })
            dbResult.records.forEach((record) => {
                result.push(record.get("c").properties)
            })

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async createSlot(idCampo, data, oraInizio, oraFine) {
        let [year, month, day] = data.split("-").map(Number)    // split date by "-" and convert to number
        let date = new Date(data)   // check if date exists

        if (date.getFullYear() == year && date.getMonth() + 1 == month && date.getDate() == day && oraInizio < oraFine) {
            const session = driver.session()
            let result = false
            try {
                let dbResult = await session.run('MATCH (c:Campo {id: $idCampo})-[:HAS_SLOT]->(s:Slot) ' +
                    'RETURN s', {
                    "idCampo": idCampo,
                })

                let slots = []
                dbResult.records.forEach((record) => {
                    slots.push(new slot.Slot(record.get("s").properties.data.toString(), record.get("s").properties.oraInizio, record.get("s").properties.oraFine))
                })
                // check if new slot is not overlapping with existing slots
                let overlapping = false
                for (let i = 0; i < slots.length && !overlapping; i++) {
                    if (slots[i].data == data && (oraInizio >= slots[i].oraInizio && oraInizio < slots[i].oraFine || oraFine > slots[i].oraInizio && oraFine <= slots[i].oraFine)) {
                        overlapping = true
                    }
                }
                if (!overlapping) {
                    dbResult = await session.run('MATCH (c:Campo {id: $idCampo}) ' +
                        'CREATE (c)-[:HAS_SLOT]->(s: Slot {data: $data, oraInizio: $oraInizio, oraFine: $oraFine}) ' +
                        'RETURN s',
                        {
                            "idCampo": idCampo,
                            "data": data,
                            "oraInizio": oraInizio,
                            "oraFine": oraFine
                        })
                    result = dbResult.summary.counters._containsUpdates
                }
            } catch (error) {
                console.log(error)
            } finally {
                await session.close()
            }
            return result
        } else {
            return false
        }
    }

    async getSlots(idCampo) {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo {id: $idCampo})-[:HAS_SLOT]->(s:Slot) ' +
                'RETURN s.data, s.oraInizio, s.oraFine',
                {
                    "idCampo": idCampo
                })
            dbResult.records.forEach((record) => {
                result.push({
                    "data": record.get("s.data").toString(),
                    "oraInizio": record.get("s.oraInizio").toString(),
                    "oraFine": record.get("s.oraFine").toString()
                })
            })
        }
        catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async deleteSlot(idCampo, data, oraInizio, oraFine) {
        const session = driver.session()
        let result = null
        let prenotazioni = null
        try {
            // check prenotazioni campo
            prenotazioni = await session.run('MATCH ()-[p:PRENOTA]->(c:Campo {id: $idCampo}) ' +
                'WHERE p.data = date($data) AND (p.oraInizio >= time($oraInizio) OR p.oraFine <= time($oraFine))' +
                'RETURN p', { "idCampo": idCampo, "data": data, "oraInizio": oraInizio, "oraFine": oraFine })
            console.log(prenotazioni)
            if (prenotazioni.records.length == 0) {
                result = await session.run('MATCH (c:Campo {id: $idCampo})-[:HAS_SLOT]->(s:Slot {data: date($data), oraInizio: time($oraInizio), oraFine: time($oraFine)}) ' +
                    'DETACH DELETE s', { "idCampo": idCampo, "data": data, "oraInizio": oraInizio, "oraFine": oraFine })
            }
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        // check if result has updates
        return {
            "success": prenotazioni.records.length == 0 ? true : false,
            "message": prenotazioni.records.length == 0 ? "Slot deleted" : "Slot not deleted because there are prenotazioni"
        }
    }

    async newPrenotazione(idUtente, idCampo, data, oraInizio, oraFine) { //TODO: check if slot is available
        const session = driver.session()
        let result = null
        try {
            let avaiableSlots = await this.getAvailableSlots(idCampo, data)
            if (avaiableSlots.length > 0) {
                // find which slot is suitable for given time
                let slot = avaiableSlots.find(slot => {
                    return slot.oraInizio <= oraInizio && oraFine <= slot.oraFine
                })
                if (slot) {
                    let dbResult = await session.run('MATCH (c:Campo {id: $idCampo}), (u:Utente {id: $idUtente}) ' +
                        // verifica se è troppo tardi per prenotare, vedendo se data e oraInizio che voglio prenotare - prenotaEntro ore > data e ora attuale
                        'WHERE date($data) - date(datetime()) > 0 AND date($data) - date(datetime()) < $prenotaEntro ' +
                        'CREATE (u)-[p:PRENOTA {id: apoc.create.uuid(), data: date($data), oraInizio: time($oraInizio), oraFine: time($oraFine)}]->(c) ' +
                        'RETURN p.id', {
                        "idCampo": idCampo,
                        "idUtente": idUtente,
                        "data": data,
                        "oraInizio": oraInizio,
                        "oraFine": oraFine
                    })
                    result = dbResult.records[0].get("p.id")
                }
            }
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async checkMonthAvailability(idCampo, month, year) {
        const session = driver.session()
        let giorniLiberi = []
        try {
            let giorni = await session.run('MATCH (c:Campo {id: $idCampo})-[:HAS_SLOT]->(s:Slot) ' +
                'WHERE s.data.year = toInteger($year) AND s.data.month = toInteger($month) ' + // return array of days
                'RETURN DISTINCT s.data.day AS days',
                {
                    "idCampo": idCampo,
                    "month": month,
                    "year": year
                })
            giorniLiberi = giorni.records.map(record => record.get("days").toNumber())

            // check if there are slots for each day
            for (let giorno = 0; giorno < giorniLiberi.length; giorno++) {
                let slots = await this.getAvailableSlots(idCampo, year + "-" + month + "-" + giorniLiberi[giorno])
                if (slots.length == 0) {
                    giorniLiberi.splice(giorno, 1)
                    giorno--
                }
            }
        }
        catch (error) {
            console.log(error)
        }
        finally {
            await session.close()
        }
        return giorniLiberi
    }

    async getAvailableSlots(idCampo, data) {
        const session = driver.session()
        let slots = []
        try { // to test
            let slots_campo = await session.run('MATCH (c:Campo {id: $idCampo})-[:HAS_SLOT]->(s:Slot) ' +
                'WHERE s.data=date($data) ' +
                'RETURN s.oraInizio, s.oraFine ' +
                'ORDER BY s.oraInizio ',
                {
                    "idCampo": idCampo,
                    "data": data
                })
            // iterate over all slots
            slots_campo.records.forEach((record) => {
                // get last slot oraFine
                if (slots.length != 0 && slots[slots.length - 1].oraFine == record.get("s.oraInizio").toString()) {
                    slots[slots.length - 1].oraFine = record.get("s.oraFine").toString()
                } else {
                    slots.push(new slot.Slot(data, record.get("s.oraInizio").toString(), record.get("s.oraFine").toString()))
                }
            })

            let prenotazioni = await session.run('MATCH (u:Utente)-[p:PRENOTA]->(c:Campo {id: $idCampo}) ' +
                'WHERE p.data=date($data) ' +
                'RETURN c.prenotaEntro, p.oraInizio, p.oraFine',
                {
                    "idCampo": idCampo,
                    "data": data
                })

            const prenotaEntro = prenotazioni.records[0].get("c.prenotaEntro")

            prenotazioni.records.forEach((record) => {
                // search which slot is associated to record
                let current_slot = slots.find(s => s.oraInizio <= record.get("p.oraInizio").toString() && record.get("p.oraFine").toString() <= s.oraFine)
                let index = slots.indexOf(current_slot) // get current_slot index in slots array

                if (current_slot) {
                    // remove slot from array
                    slots.splice(index, 1)
                    let aggiuntoInizio = false
                    if (current_slot.oraInizio != record.get("p.oraInizio").toString()) {
                        aggiuntoInizio = true
                        // add new slot
                        slots.splice(index, 0, new slot.Slot(data, current_slot.oraInizio, record.get("p.oraInizio").toString()))
                    }
                    if (current_slot.oraFine != record.get("p.oraFine").toString()) {
                        // add new slot
                        slots.splice(!aggiuntoInizio ? index : index + 1, 0, new slot.Slot(data, record.get("p.oraFine").toString(), current_slot.oraFine))
                    }
                }
            })
            slots = slots.filter(s => {
                let diff = Math.abs(new Date(s.data + " " + s.oraInizio).getTime() - new Date().getTime()) / 3600000
                return diff > prenotaEntro
            })
        }
        catch (error) {
            console.log(error)
        }
        finally {
            await session.close()
        }
        return slots
    }

    async idUtenti() {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (u:Utente) RETURN u.id AS id')
            result = dbResult.records.map(record => record.get("id").toString())
        }
        catch (error) {
            console.log(error)
        }
        finally {
            await session.close()
        }
        return result
    }

    // Get the list of all reservations of a field given the id of the field
    async getListaPrenotazioni(idCampo) {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (u : Utente) - [p : PRENOTA] -> (c : Campo {id : $idCampo}) RETURN p, u', { idCampo: idCampo })
            dbResult.records.forEach((record) => {
                result.push({
                    "data": record.get("p").properties.data.toString(),
                    "oraInizio": record.get("p").properties.oraInizio.toString(),
                    "oraFine": record.get("p").properties.oraFine.toString(),
                    "telefono": record.get("u").properties.telefono.toString()
                })
            })
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    // async getAvailableSlots(idCampo, day, month, year) { //add passing a date in format yyyy-mm-dd
    //     const session = driver.session()
    //     let result = []
    //     try {
    //         let dbResult = await session.run('MATCH (c:Campo {id: $idCampo})-[:HAS_SLOT]->(s:Slot) ' +
    //             'WHERE s.data.year = toInteger($year) AND s.data.month = toInteger($month) AND s.data.day = toInteger($day) ' +
    //             'RETURN s.oraInizio, s.oraFine',
    //             {
    //                 "idCampo": idCampo,
    //                 "day": day,
    //                 "month": month,
    //                 "year": year
    //             })
    //         result = dbResult.records.map(record => {
    //             return {
    //                 oraInizio: record.get("s.oraInizio").toString(),
    //                 oraFine: record.get("s.oraFine").toString()
    //             }
    //         })
    //     }
    //     catch (error) {
    //         console.log(error)
    //     }
    //     finally {
    //         await session.close()
    //     }
    //     return result
    // }

    // let slot = {
    //     oraInizio: "12:00",
    //     oraFine: "16:00",
    // }
    // let prenotazioni = [
    //     {
    //         oraInizio: "13:00",
    //         oraFine: "14:00",
    //     },
    //     {
    //         oraInizio: "14:30",
    //         oraFine: "15:30",
    //     }
    // ]
    // let slotLiberi = []
    // prenotazioni = prenotazioni.sort((a, b) => {
    //     return a.oraInizio - b.oraInizio
    // })
    // let lastInizio = slot.oraInizio
    // for (let i = 0; i <= prenotazioni.length; i++) {
    //     if (i == prenotazioni.length && lastInizio != slot.oraFine) {
    //         slotLiberi.push({
    //             oraInizio: lastInizio,
    //             oraFine: slot.oraFine
    //         })
    //     } else {
    //         if (lastInizio != prenotazioni[i].oraInizio) {
    //             slotLiberi.push({
    //                 oraInizio: lastInizio,
    //                 oraFine: prenotazioni[i].oraInizio
    //             })
    //         }
    //         lastInizio = prenotazioni[i].oraFine
    //     }
    // }
    // console.log(slotLiberi)

    async onexit() {
        // on application exit:
        await driver.close()
    }

}





module.exports.Model = DBModel
