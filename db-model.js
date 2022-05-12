neo4j = require('neo4j-driver')

const user = "neo4j"
const password = "sxuWw-WxadX0Kq5WwinvL-8qYiMmD9wApTgEUhgu0jE"
const uri = "neo4j+s://79126456.databases.neo4j.io"
driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

class DBModel {    
    
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

    async createCampo(idGestore, nome, indirizzo, cap, citta, provincia, tariffa, prenotaEntro) {
        const session = driver.session()
        try {
            let result = await session.run('CREATE (c:Campo {id:apoc.create.uuid(), nome:$nome, '+
                'indirizzo:$indirizzo, cap:$cap, citta:$citta, provincia:$provincia, '+
                'tariffa:$tariffa, prenota_entro:$prenota_entro}) RETURN c.id', { 
                    "nome": nome,
                    "indirizzo": indirizzo,
                    "cap": cap,
                    "citta": citta,
                    "provincia": provincia,
                    "tariffa": tariffa,
                    "prenota_entro": prenotaEntro })
            let result2 = await session.run('MATCH (g:Gestore),(c:Campo) WHERE g.id = $gestoreId ' +
                'AND c.id = $campoId CREATE (g)-[r:affitta]->(c)', { "gestoreId": idGestore, "campoId": result.records[0].get('c.id') })
        } catch (error) {
            console.log(error)
        } finally {
            await session.close()
        }
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

    async onexit () {
        // on application exit:
        await driver.close()
    }
    
}

module.exports.Model = DBModel

/*model = new DBModel()

model.createUtente("Toni", "Negri", "g.r56@gmail.it", "pro7a@it.it", "1239567890", "--");
model.createUtente("Bepi", "Rossi", "g.r5@gmail.it", "pro6a@it.it", "1239567890", "--");
model.createUtente("Gianni", "Verdi", "g.r32@gmail.it", "pro5a@it.it", "1239567890", "--");

g1 = model.createGestore("Marco", "Gialli", "g.54r@gmail.it", "pro11a@it.it", "1239567890", "--");
g2 = model.createGestore("Nicola", "Blu", "g.r4@gmail.it", "pro12a@it.it", "1239567890", "--");
g3 = model.createGestore("Luca", "Negroni", "l.r@gmail.it", "pro13a@it.it", "1239567890", "--");

g1.then((id)=>{
    model.createCampo(id, "Campetto dei fioi", "via del lago duria 7", "38122", "Trento", "TN", 20, 24);
    model.createCampo(id, "Campetto Villazzano", "via del lago nia 23", "38123", "Villazzano", "TN", 25, 12);
})
g2.then((id)=>{
    model.createCampo(id, "Campo via Mestre", "via mestre 34", "38102", "Pergine Valsugana", "TN", 20, 48);
    model.createCampo(id, "Oratorio Arsiè", "via del lago duria 7", "36142", "Arsiè", "TN", 20, 24);
})
g3.then((id)=>{
    model.createCampo(id, "Campetto fango", "via del novello 13", "38234", "Trento", "TN", 20, 36);
})*/

