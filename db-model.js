neo4j = require('neo4j-driver')
axios = require('axios');
//modulo per usare .env file
require('dotenv').config() 

driver = neo4j.driver(process.env.uri, neo4j.auth.basic(process.env.user, process.env.password))

const baseGmapsUrl = "https://maps.googleapis.com/maps/api/geocode/json?address="
const gmapsKey = "AIzaSyAHvVUqzSD7mFoyoAQgur7dvKzL1Luz28s"

class DBModel {    

    async getCoordinates(indirizzo, cap, citta, provincia){
        let address = indirizzo + " " + cap + " " + citta + " "+ provincia
        address = address.replaceAll(" ","+")
        let url = baseGmapsUrl + address + "&key=" + gmapsKey
        const response = await axios.get(url)
        if(response.data.results.length > 0)
            return response.data.results[0].geometry.location
        else return {lat:-1, lng:-1}
        //return an object {lat:value, lng:value}
    }
    
    async createUtenteBase(nome, cognome, email, paypal, telefono, hash, tipologia) {

        let result = null
        const session = driver.session()
        try {
            result = await session.run(
                'CREATE (a:Account:' + tipologia + ' {id:apoc.create.uuid(), nome:$nome, '+
                    'cognome:$cognome, email:$email, account_paypal:$account_paypal, '+
                    'telefono: $telefono, hashed_pw:$hashed_pw}) RETURN a.id', { 
                        "nome": nome,
                        "cognome": cognome,
                        "email": email,
                        "account_paypal": paypal,
                        "telefono": telefono,
                        "hashed_pw": hash })

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
            result = await session.run('CREATE (c:Campo {id:apoc.create.uuid(), nome:$nome, '+
                'indirizzo:$indirizzo, cap:$cap, citta:$citta, provincia:$provincia, sport:$sport, '+
                'tariffa:$tariffa, prenotaEntro:$prenotaEntro, lat:$lat, lng:$lng}) RETURN c.id', { 
                    "nome": nome,
                    "indirizzo": indirizzo,
                    "cap": cap,
                    "citta": citta,
                    "provincia": provincia,
                    "sport":sport,
                    "tariffa": tariffa,
                    "prenotaEntro": prenotaEntro,
                    "lat": coord.lat,
                    "lng": coord.lng
                     })
            final = await session.run('MATCH (g:Gestore),(c:Campo) WHERE g.id = $gestoreId ' +
                'AND c.id = $campoId CREATE (g)-[r:AFFITTA]->(c)', 
                { "gestoreId": idGestore, "campoId": result.records[0].get('c.id')})
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        if(final !== null) 
            return result.records[0].get('c.id')
        else 
            return null
    }

    async getListaCampi(){
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo) RETURN c')
            dbResult.records.forEach((record)=>{
                result.push(record.get("c").properties)
            })
            
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async getCampo(idCampo){
        const session = driver.session()
        let result = null
        try {
            let dbResult = await session.run('MATCH (c:Campo {id: $idCampo})'+
            'RETURN c', {"idCampo":idCampo})
            if(dbResult.records && dbResult.records[0])
                result = dbResult.records[0].get("c").properties;
            
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async editCampo(idGestore, idCampo, nome, indirizzo, cap, citta, provincia, sport, tariffa, prenotaEntro){
        const session = driver.session()
        let result = false
        let coord = await this.getCoordinates(indirizzo, cap, citta, provincia)
        try {
            let dbResult = await session.run('MATCH (c:Campo {id: $idCampo})<-[:AFFITTA]-(g:Gestore {id: $idGestore})'+
            'SET c.nome = $nome, c.indirizzo = $indirizzo, c.cap = $cap, c.citta = $citta, c.provincia = $provincia,' + 
            ' c.sport = $sport, c.tariffa = $tariffa, c.prenotaEntro = $prenotaEntro, c.lat = $lat, c.lng = $lng', {
                "idCampo":idCampo,
                "idGestore":idGestore,
                "nome":nome,
                "indirizzo":indirizzo,
                "cap":cap,
                "citta":citta,
                "provincia":provincia,
                "sport":sport,
                "tariffa":tariffa,
                "prenotaEntro":prenotaEntro,
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

    async deleteCampo(idGestore, idCampo){
        const session = driver.session()
        let result = []
        try {
            result = await session.run('MATCH (c:Campo {id: $idCampo})<-[:AFFITTA]-(g:Gestore {id: $idGestore})'+
            'DETACH DELETE c', {"idCampo":idCampo, "idGestore":idGestore})
            
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result.summary.counters._stats.nodesDeleted > 0
    }



    async getCampiPerNome (nome){
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo) WHERE c.nome = $nome RETURN c')
            dbResult.records.forEach((record)=>{
                result.push(record.get("c").properties)
            })

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    }

    async getCampiPerLuogo(luogo){
        const session = driver.session()
        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo) WHERE (c.citta = $luogo OR c.provincia = $luogo) RETURN c')
            dbResult.records.forEach((record)=>{
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
// il raggio è da passare alla fuznione in km , le coordinate in formato  ( +/-)  xxx.yyyyyyy

    async getCampiNelRAggio(latitudine_utente, longitudine_utente, raggio){
        const session = driver.session()
        let lat_rad= latitudine_utente/57.29577951
        let long_rad= longitudine_utente/57.29577951

        let result = []
        try {
            let dbResult = await session.run('MATCH (c:Campo) WHERE (( 6372,795477598 * acos((sin($lat_rad) * sin(c.latitude/57.29577951)) + cos($lat_rad) * cos(c.latitude/57.29577951) * cos((c.longitude/57.29577951)– $long_rad)) ) <= $raggio  ) RETURN c')
            dbResult.records.forEach((record)=>{
                result.push(record.get("c").properties)
            })

        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
        return result
    } 

    async onexit () {
        // on application exit:
        await driver.close()
    }
    
}





module.exports.Model = DBModel