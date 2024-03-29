// --------------------------------------------------------> LOGIC <-----------------------------------------------------------------


// ---------------------------------------------------------> SET UP <---------------------------------------------------------------

slot = require('./slot');
neo4j = require('neo4j-driver')
axios = require('axios');
moment = require("moment");
//modulo per usare .env file
require('dotenv').config()
driver = neo4j.driver(process.env.uri, neo4j.auth.basic(process.env.user, process.env.password))


// ---------------------------------------------------------> DB MODEL CLASS <-------------------------------------------------------
// ------------------------------------------------------> CONTAINS FUNCTION LOGIC <--------------------------------------------------
class DBModel {

    // --------------------------------------------------->COORDINATE GEOGRAFICHE<----------------------------------------------------
    async getCoordinates(indirizzo, cap, citta, provincia) {
        let address = indirizzo + " " + cap + " " + citta + " " + provincia
        return await this.getCoordinatesByString(address)
    }

    async getCoordinatesByString(address) {
        address = address.replaceAll(" ", "+")
        let url = process.env.baseGmapsUrl + address + "&key=" + process.env.gmapsKey
        const response = await axios.get(url)
        if (response.data.results.length > 0)
            return response.data.results[0].geometry.location
        else return { lat: -1, lng: -1 }
        //returns an object {lat:value, lng:value}
    }

    /*async getAccount(email){
        const session = driver.session()
        let result = null
        try {
            let dbResult = await session.run('MATCH (a:Account {email:$email}) RETURN a, labels(a)', {"email":email})
            if (dbResult.records && dbResult.records[0])
                result = dbResult.records[0].get("a").properties;
                let labels = dbResult.records[0].get("a").labels;
                let index = labels.indexOf("Account");
                delete labels[index];
                result.tipologia = labels[0];
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }*/
    // ------------------------------------------------->ACCOUNT<----------------------------------------------------------------------

    //given a mail returns account + tipologia
    async getAccountByEmail(email) {
        const session = driver.session()
        let result = null
        try {
            let dbResult = await session.run('MATCH (a:Account {email:$email}) RETURN a, labels(a)', { "email": email })
            if (dbResult.records && dbResult.records[0]) {
                result = dbResult.records[0].get("a").properties;
                let labels = dbResult.records[0].get("a").labels;
                let index = labels.indexOf("Account");
                delete labels[index];
                result.tipologia = labels[0];
            }
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }
    // given email and password change old password with new one
    async updatePassword(email, password) {
        const session = driver.session()
        let result = false;
        try {
            let dbResult = await session.run('MATCH (a:Account {email:$email}) SET a.password = $pwd', { "email": email, "pwd": password });
            result = dbResult.summary.counters._containsUpdates;
        } catch (error) {
            console.log(error);
        } finally {
            await session.close();
        }
        return result;
    }

    //returns only account, without tipologia
    async getAccountById(id) {
        const session = driver.session()
        let result = null
        try {
            let dbResult = await session.run('MATCH (a:Account {id:$id}) RETURN a', { "id": id })
            if (dbResult.records && dbResult.records[0])
                result = dbResult.records[0].get("a").properties;
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    //create new account, fail if email is already used
    async createAccount(nome, cognome, email, paypal, telefono, pw, tipologia) {
        //controllo che l'email non sia già usata
        let stessaMail = await this.getAccountByEmail(email);
        //console.log(stessaMail)
        if (stessaMail === null) {
            let result
            const session = driver.session()
            try {
                result = await session.run(
                    'CREATE (a:Account: ' + tipologia + ' {id:apoc.create.uuid(), nome:$nome,  ' +
                    'cognome:$cognome, email:$email, account_paypal:$account_paypal,  ' +
                    'telefono: $telefono, password:$pw}) RETURN a.id', {
                    "nome": nome,
                    "cognome": cognome,
                    "email": email,
                    "account_paypal": paypal,
                    "telefono": telefono,
                    "pw": pw
                })

            } catch (error) {
                console.log(error)
            } finally {
                await session.close()
            }
            return result.records[0].get('a.id')
        }
        return null;
    }
    // given account's info change the old one, fails if email is already in use
    async editAccount(id, nome, cognome, email, paypal, telefono, pw) {
        let result = false
        //console.log("id = " + id)
        let stessaMail = await this.getAccountByEmail(email);
        //console.log(stessaMail)
        if (stessaMail === null || stessaMail.id == id) {
            //se l'email viene cambiata, deve essere non già usata (oppure l'email non viene cambiata, quindi resta la stessa dell'utente)
            const session = driver.session()
            try {
                let dbResult = await session.run(
                    'MATCH (a:Account {id: $id}) SET a.nome = $nome,  ' +
                    'a.cognome = $cognome, a.email = $email, a.account_paypal = $account_paypal,  ' +
                    'a.telefono = $telefono, a.password = $pw', {
                    "id": id,
                    "nome": nome,
                    "cognome": cognome,
                    "email": email,
                    "account_paypal": paypal,
                    "telefono": telefono,
                    "pw": pw
                });
                result = dbResult.summary.counters._containsUpdates

            } catch (error) {
                console.log(error)
            } finally {
                await session.close()
            }
        }
        return result
    }
    // given all account info deletes it 
    async deleteAccount(id, nome, cognome, email, paypal, telefono, pw) {
        let result = false
        const session = driver.session()
        const tx = session.beginTransaction()
        try {
            let tx1 = await tx.run("MATCH (a:Account {id:$id})-[r:AFFITTA]->(c:Campo)-[sr:HAS_SLOT]->(s:Slot) DETACH DELETE s", { "id": id });
            let tx2 = await tx.run("MATCH (a:Account {id:$id})-[r:AFFITTA]->(c:Campo) DETACH DELETE c", { "id": id });
            let tx3 = await tx.run("MATCH (a:Account {id:$id}) DETACH DELETE a", { "id": id });
            await tx.commit();
            result = tx3.summary.counters._containsUpdates
        } catch (error) {
            tx.rollback();
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }
    // create an account of type Utente
    async createUtente(nome, cognome, email, paypal, telefono, pw) {
        return this.createAccount(nome, cognome, email, paypal, telefono, pw, "Utente")
    }
    // create an account of type Gestore
    async createGestore(nome, cognome, email, paypal, telefono, pw) {
        return this.createAccount(nome, cognome, email, paypal, telefono, pw, "Gestore")
    }
    // return user list
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

    // ------------------------------------------------->CAMPI<--------------------------------------------------

    // given account info create campo; coordinates are calculated based on the adress 
    async createCampo(idGestore, nome, indirizzo, cap, citta, provincia, sport, tariffa, prenotaEntro) {
        const session = driver.session()
        const tx = session.beginTransaction()
        let final = null
        let result
        let coord = await this.getCoordinates(indirizzo, cap, citta, provincia)
        try {
            result = await tx.run('CREATE (c:Campo {id:apoc.create.uuid(), nome:$nome,  ' +
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
            final = await tx.run('MATCH (g:Gestore),(c:Campo) WHERE g.id = $gestoreId  ' +
                'AND c.id = $campoId CREATE (g)-[r:AFFITTA]->(c)',
                { "gestoreId": idGestore, "campoId": result.records[0].get('c.id') })
            await tx.commit()
        } catch (error) {
            tx.rollback()
            console.log(error)
            return null
        } finally {
            await session.close()
        }
        if (final !== null)
            return result.records[0].get('c.id')
        else
            return null
    }
    // return all the campi 
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
    // given a campo id return campo info
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

    // given campo info update the old ones
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

    // given a campo id deletes it
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

    //given a campo name return its informations
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


    // given lat, lng, radius return all the campi in the radius
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


    // Get the list of all manager's fields given the id of the manager
    async getListaCampiGestore(idGestore) {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (g : Gestore {id : $idGestore}) - [a : AFFITTA] -> (c : Campo) RETURN c', { idGestore: idGestore })
            dbResult.records.forEach((record) => {
                result.push({
                    "nome": record.get("c").properties.nome.toString(),
                    "citta": record.get("c").properties.citta.toString(),
                    "indirizzo": record.get("c").properties.indirizzo.toString(),
                    "id": record.get("c").properties.id.toString()
                })
            })
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    // ------------------------------------------------->SLOT<--------------------------------------------------------------------------

    // given slot info create a new slot, fail if slot overlaps with a preexisting one  
    async createSlot(idCampo, data, oraInizio, oraFine) {
        let [year, month, day] = data.split("-").map(Number)    // split date by "-" and convert to number
        let [hour, minute] = oraInizio.split(":").map(Number)   // split time by ":" and convert to number
        let current_datetime = new Date()
        let slot_datetime = new Date(year, month - 1, day, hour, minute)
        let diff = (slot_datetime - current_datetime) / 3600000

        let validSlot = ((moment(oraFine, "hh:mm:ssZ") - moment(oraInizio, "hh:mm:ssZ")) / (3600 * 1000)) > 0

        if (validSlot && year == slot_datetime.getFullYear() && month == slot_datetime.getMonth() + 1 && day == slot_datetime.getDate() && diff > 0) {
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
                    if (slots[i].data == data && (oraInizio > slots[i].oraInizio && oraInizio < slots[i].oraFine || oraFine > slots[i].oraInizio && oraFine < slots[i].oraFine)) {
                        overlapping = true
                    }
                }
                if (!overlapping) {
                    dbResult = await session.run('MATCH (c:Campo {id: $idCampo}) ' +
                        'CREATE (c)-[:HAS_SLOT]->(s: Slot {data: date($data), oraInizio: time($oraInizio), oraFine: time($oraFine)}) ' +
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

    // give a campo's id return its info
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

    // given a slot info deletes the slot 
    async deleteSlot(idCampo, data, oraInizio, oraFine) {
        const session = driver.session()
        let result = null
        let prenotazioni = null
        try {
            // check prenotazioni campo
            prenotazioni = await session.run('MATCH ()-[p:PRENOTA]->(c:Campo {id: $idCampo}) ' +
                'WHERE p.data = date($data) AND (p.oraInizio >= time($oraInizio) OR p.oraFine <= time($oraFine))' +
                'RETURN p', { "idCampo": idCampo, "data": data, "oraInizio": oraInizio, "oraFine": oraFine })
            //console.log(prenotazioni.records)
            if (prenotazioni.records.length == 0) {
                result = await session.run('MATCH (c:Campo {id: $idCampo})-[:HAS_SLOT]->(s:Slot {data: date($data), oraInizio: time($oraInizio), oraFine: time($oraFine)}) ' +
                    'DETACH DELETE s', { "idCampo": idCampo, "data": data, "oraInizio": oraInizio, "oraFine": oraFine })
                //console.log(result.summary.counters._stats.nodesDeleted)
            }
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        // check if result has updates
        let success = prenotazioni.records.length == 0 && result.summary.counters._stats.nodesDeleted > 0
        let obj = {
            "success": success,
            "message": success ? "Slot deleted" : "Slot not deleted because there are prenotazioni"
        }
        if (obj.success == false)
            obj.errno = 2;
        return obj
    }


    // ------------------------------------------------->PRENOTAZIONI<--------------------------------------------------------------------------

    //creates a new prenotazione
    async newPrenotazione(idUtente, idCampo, data, oraInizio, oraFine) {
        const session = driver.session()
        let result = null
        try {
            let availableSlots = await this.getAvailableSlots(idCampo, data)
            if (availableSlots.length > 0) {
                console.log(availableSlots)
                // find which slot is suitable for given time
                let slot = availableSlots.find(slot => {
                    return slot.oraInizio <= oraInizio + ':00Z' && oraFine <= slot.oraFine + ':00Z'
                })
                console.log(slot)

                if (slot) {
                    let dbResult = await session.run('MATCH (c:Campo {id: $idCampo}), (u:Utente {id: $idUtente}) ' +
                        'CREATE (u)-[p:PRENOTA {id: apoc.create.uuid(), data: date($data), oraInizio: time($oraInizio), oraFine: time($oraFine), idUtente : $idUtente}]->(c) ' +
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
    // given an idcampo, month and year cheks if there are prenotations for the campo on the given month and return the days
    async checkMonthAvailability(idCampo, month, year) {
        const session = driver.session()
        let giorniLiberi = []
        let today = new Date()
        if (today.getFullYear() <= year && today.getMonth() + 1 <= month) {
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
                    let slots = await this.getAvailableSlots(idCampo, year + "-" + month + "-" + giorniLiberi[giorno]) // get slots for each day
                    if (slots.length == 0) { //
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
        }
        return giorniLiberi
    }
    // given an idcampo and a data cheks if there are prenotations for the campo on the given day 
    async getAvailableSlots(idCampo, data) {
        const session = driver.session()
        let slots = []
        try { // to test

            const prenotaEntro = await this.get_prenota_entro(idCampo)

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
                'RETURN p.oraInizio, p.oraFine',
                {
                    "idCampo": idCampo,
                    "data": data
                })

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
                let diff = (new Date(s.data + " " + s.oraInizio).getTime() - (new Date().getTime())) / 3600000
                //console.log("diff (hours) = " + diff)
                //console.log("prenota entro = " + prenotaEntro)
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

    // Get the list of all reservations given the id of the user
    async getListaPrenotazioniUtente(idUtente) {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (u : Utente {id : $idUtente}) - [p : PRENOTA] -> (c : Campo) RETURN c, p', { idUtente: idUtente })
            dbResult.records.forEach((record) => {
                result.push({
                    "data": record.get("p").properties.data.toString(),
                    "oraInizio": record.get("p").properties.oraInizio.toString(),
                    "oraFine": record.get("p").properties.oraFine.toString(),
                    "nome": record.get("c").properties.nome.toString(),
                    "id": record.get("c").properties.id.toString(),
                    "citta": record.get("c").properties.citta.toString(),
                    "indirizzo": record.get("c").properties.indirizzo.toString()
                })
            })
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async getCostoPrenotazione(idCampo, data, oraInizio, oraFine) {
        const session = driver.session()
        let result = 0
        try {
            let result1 = await session.run(
                'MATCH (c : Campo {id : $idCampo}) RETURN c',
                { "idCampo": idCampo }
            )
            //console.log(result1.records[0].get("c"))
            if (result1.records.length > 0) {
                let tariffa = parseFloat(result1.records[0].get("c").properties.tariffa);
                //console.log(tariffa);
                let ore = (moment(oraFine, "hh:mm:ssZ") - moment(oraInizio, "hh:mm:ssZ")) / (3600 * 1000);
                let costo = tariffa * ore;
                result = costo;
            }
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    // Elimina se possibile la prenotazione dell'utente (max entro 24h prima)
    async deletePrenotazione(idUtente, idCampo, data, oraInizio, oraFine) {
        const session = driver.session()
        let result = false
        try {
            let result1 = await session.run(
                'MATCH (u : Utente {id : $idUtente}) - [p : PRENOTA {data : date($data), oraInizio : time($oraInizio), oraFine : time($oraFine)}] -> (c : Campo {id : $idCampo}) RETURN p',
                { "idUtente": idUtente, "data": data, "oraInizio": oraInizio, "oraFine": oraFine, "idCampo": idCampo }
            )
            let result2 = await session.run(
                'MATCH (u : Utente {id : $idUtente}) - [p : PRENOTA {data : date($data), oraInizio : time($oraInizio), oraFine : time($oraFine)}] -> (c : Campo {id : $idCampo}) RETURN c',
                { "idUtente": idUtente, "data": data, "oraInizio": oraInizio, "oraFine": oraFine, "idCampo": idCampo }
            )

            if (result1.records.length > 0 && result2.records.length > 0) {
                let dataControllo = result1.records[0].get("p").properties.data;
                let oraInizioControllo = result1.records[0].get("p").properties.oraInizio;
                let prenotaEntro = result2.records[0].get("c").properties.prenotaEntro
                let diff = (new Date(dataControllo + " " + oraInizioControllo).getTime() - (new Date().getTime())) / 3600000
                if (diff > prenotaEntro) {
                    let result2 = await session.run(
                        'MATCH (u : Utente {id : $idUtente}) - [p : PRENOTA {data : date($data), oraInizio : time($oraInizio), oraFine : time($oraFine)}] -> (c : Campo {id : $idCampo})\nDELETE p',
                        { "idUtente": idUtente, "data": data, "oraInizio": oraInizio, "oraFine": oraFine, "idCampo": idCampo }
                    )
                    result = result2.summary.counters._stats.relationshipsDeleted > 0
                }

            }

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }
    // given a campo id return it's prenotaEntro property 
    async get_prenota_entro(idCampo) {
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c : Campo {id : $idCampo}) RETURN c.prenotaEntro', { idCampo: idCampo })
            result = dbResult.records.map(record => record.get("c.prenotaEntro").toString())
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    // ------------------------------------------------->CLOSE DB CONNECTION<--------------------------------------------------------------------------

    async onexit() {
        // on application exit:
        await driver.close()
    }

}

// ------------------------------------------------->EXPORTING<--------------------------------------------------------------------------

module.exports.Model = DBModel
