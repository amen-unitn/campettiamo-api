require('dotenv').config() 
const app = require('./api')
const request = require("supertest")
const body_parser = require("body-parser")
app.use(body_parser)
const assert = require('node:assert/strict');
const createHttpTerminator = require ('http-terminator').createHttpTerminator;
let tokenUtente = "";
let tokenGestore = "";
let campoId = "";
let prenData, prenStart, prenEnd;
let slotData, slotStart, slotEnd;
let timeOffset = new Date().getTimezoneOffset()*60*1000;

jest.setTimeout(20000);

describe('CREATE Utente', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/utente')
        .send({
          "email": 'prova@me.it',
          "nome": 'utente',
          "cognome": 'prova',
          'paypal': 'prova@me.it',
          'telefono': '1234567890',
          'password':'s539#fnak043@q'
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})
  
describe('LOGIN Utente', function(){
	it('responds with json', function(done) {
		request(app)
			.post('/api/v2/login')
			.send({
				"email": 'prova@me.it',
				"password": 's539#fnak043@q'
			})
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, true)
			})
			.end(function(err, res){
				if(err) return done(err)
				tokenUtente = res.body.token;
				return done()
			})
  	})
})


describe('CREATE Gestore', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/gestore')
        .send({
          "email": 'provagest@me.it',
          "nome": 'gestore',
          "cognome": 'prova',
          'paypal': 'provagest@me.it',
          'telefono': '0987654321',
          'password':'s368#jkmb940@z'
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})
  
describe('LOGIN Gestore', function(){
	it('responds with json', function(done) {
		request(app)
			.post('/api/v2/login')
			.send({
				"email": 'provagest@me.it',
				"password": 's368#jkmb940@z'
			})
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, true)
			})
			.end(function(err, res){
				if(err) return done(err)
				tokenGestore = res.body.token;
				return done()
			})
  	})
}) 


describe('MODIFICA Utente', function() {
    it('responds with json', function(done) {
      request(app)
        .put('/api/v2/utente')
        .set('x-access-token', tokenUtente)
        .send({
          "email": 'prova2@me.it',
          "nome": 'utente',
          "cognome": 'prova',
          'paypal': 'prova2@me.it',
          'telefono': '1234567890',
          'password':'s539#fnak043@q'
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Cerca campo per id valido', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campo/559f4704-618d-493b-9279-aef803e5eacf')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, true)
				assert.deepStrictEqual(res.body.data.id, '559f4704-618d-493b-9279-aef803e5eacf')
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo per id NON valido', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campo/randomId')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
				assert.deepStrictEqual(res.body.errno, 2)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo senza id', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campo')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(404)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
				assert.deepStrictEqual(res.body.errno, 5)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo per nome esistente', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campi-nome?nome=Studentato%20San%20Bartolameo')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, true)
				assert.notDeepStrictEqual(res.body.data.length, null)
				assert.notDeepStrictEqual(res.body.data.length, 0)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo per nome NON esistente', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campi-nome?nome=abba%20beim%2012345%20.-.')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
				assert.deepStrictEqual(res.body.errno, 2)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo con luogo valido', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campi-luogo?luogo=Trento&raggio=5')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, true)
				assert.notDeepStrictEqual(res.body.data.length, null)
				assert.notDeepStrictEqual(res.body.data.length, 0)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})


describe('Cerca campo con luogo NON valido', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campi-luogo?luogo=&raggio=5')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
				assert.deepStrictEqual(res.body.errno, 2)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo con coordinate valide', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campi-raggio?lat=46.071765&lng=11.120828&raggio=10')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, true)
				assert.notDeepStrictEqual(res.body.data.length, null)
				assert.notDeepStrictEqual(res.body.data.length, 0)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo con coordinate NON valide', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campi-raggio?lat=11111.071765&lng=mille&raggio=10')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
				assert.deepStrictEqual(res.body.errno, 2)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Cerca campo con raggio NON valido', function(){
	it('responds with json', function(done){
		request(app)
			.get('/api/v2/campi-raggio?lat=46.071765&lng=11.120828raggio=millle')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
				assert.deepStrictEqual(res.body.errno, 2)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})


describe('Crea nuovo campo, valori validi', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo')
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'nomeDiTest',
          "indirizzo": 'Via Brennero',
          "cap": '38121',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':42,
          'prenotaEntro':48
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, true)
        	campoId = res.body.id;
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Crea nuovo campo, valori NON validi [tariffa]', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo')
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'nomeDiTest',
          "indirizzo": 'Via Brennero',
          "cap": '38121',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':'trenta euro',
          'prenotaEntro':48
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Crea nuovo campo, valori NON validi [prenotaEntro]', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo')
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'nomeDiTest',
          "indirizzo": 'Via Brennero',
          "cap": '38121',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':30,
          'prenotaEntro': 'ventiquattro ore prima'
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Crea nuovo campo, valori NON validi [cap]', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo')
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'nomeDiTest',
          "indirizzo": 'Via Brennero',
          "cap": 'ilCapDiVerona',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':30,
          'prenotaEntro': 48
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Modifica campo, valori validi', function() {
    it('responds with json', function(done) {
      request(app)
        .put('/api/v2/campo/'+campoId)
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'new name',
          "indirizzo": 'Via Brennero',
          "cap": '38121',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':88,
          'prenotaEntro':48
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Modifica campo, valori NON validi [tariffa]', function() {
    it('responds with json', function(done) {
      request(app)
        .put('/api/v2/campo/'+campoId)
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'new name',
          "indirizzo": 'Via Brennero',
          "cap": '38121',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':'millle',
          'prenotaEntro':48
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Modifica campo, valori NON validi [prenotaEntro]', function() {
    it('responds with json', function(done) {
      request(app)
        .put('/api/v2/campo/'+campoId)
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'new name',
          "indirizzo": 'Via Brennero',
          "cap": '38121',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':88,
          'prenotaEntro':'domani'
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Modifica campo, valori NON validi [cap]', function() {
    it('responds with json', function(done) {
      request(app)
        .put('/api/v2/campo/'+campoId)
        .set('x-access-token', tokenGestore)
        .send({
          "nome": 'new name',
          "indirizzo": 'Via Brennero',
          "cap": 'ilCapCheBello',
          'citta': 'Trento',
          'provincia': 'Trento',
          'sport':'PallaCorda',
          'tariffa':88,
          'prenotaEntro':48
        })
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Crea nuovo slot nel campo x per (oggi + 2 giorni)', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    let startTime = new Date(Date.now()-timeOffset + 86400*1000 -4*60*60*1000).toISOString().split('T')[1].slice(0,5)
    let endTime = new Date(Date.now()-timeOffset + 86400*1000 + 4*60*60*1000).toISOString().split('T')[1].slice(0,5)
    slotData = today
    slotStart = startTime
    slotEnd = endTime
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo/'+campoId +'/slot')
        .set('x-access-token', tokenGestore)
        .send({
          "data": today,
          "oraInizio": startTime,
          "oraFine": endTime,
        })
        .expect(200)
        .expect(function(res) {
        	////console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Cerca slots nel campo x', function() {
    it('responds with json', function(done) {
      request(app)
        .get('/api/v2/campo/'+campoId + '/slots')
        .set('x-access-token', tokenUtente)
        .send()
        .expect(200)
        .expect(function(res) {
        	////console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
        	assert.notDeepStrictEqual(res.body.data.length, null)
        	assert.notDeepStrictEqual(res.body.data.length, 0)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Crea OVERLAPPING slot nel campo x (per oggi + 2 giorni)', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    let startTime = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[1].slice(0,5)
    let endTime = new Date(Date.now()-timeOffset + 2*86400*1000 +2*60*60*1000).toISOString().split('T')[1].slice(0,5)
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo/'+campoId+'/slot')
        .set('x-access-token', tokenGestore)
        .send({
          "data": today,
          "oraInizio": startTime,
          "oraFine": endTime,
        })
        .expect(200)
        .expect(function(res) {
        	////console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Crea slot con data passata nel campo x', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo/'+campoId+'/slot')
        .set('x-access-token', tokenGestore)
        .send({
          "data": '2020-12-06',
          "oraInizio": '10',
          "oraFine": '11',
        })
        .expect(200)
        .expect(function(res) {
        	////console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Cerca slots liberi nel campo x per (oggi + 2 giorni)', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    it('responds with json', function(done) {
      request(app)
        .get('/api/v2/campo/'+campoId + '/slot/giorno/'+today)
        .set('x-access-token', tokenUtente)
        .send()
        .expect(200)
        .expect(function(res) {
        	////console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
        	assert.notDeepStrictEqual(res.body.data.length, null)
        	assert.notDeepStrictEqual(res.body.data.length, 0)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Cerca giorni con slots liberi nel campo x per il mese corrente (oggi + 2 giorni)', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    let thisMonth = today.slice(0,7)
    it('responds with json', function(done) {
      request(app)
        .get('/api/v2/campo/'+campoId + '/slot/mese/'+thisMonth)
        .set('x-access-token', tokenUtente)
        .send()
        .expect(200)
        .expect(function(res) {
        	////console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
        	assert.notDeepStrictEqual(res.body.data.length, null)
        	assert.notDeepStrictEqual(res.body.data.length, 0)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Crea prenotazione slot libero campetto x', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    let startTime = new Date(Date.now()-timeOffset + 2*86400*1000 +1*60*60*1000).toISOString().split('T')[1].slice(0,5)
    let endTime = new Date(Date.now()-timeOffset + 2*86400*1000 +2*60*60*1000).toISOString().split('T')[1].slice(0,5)
    prenData = today
    prenStart = startTime
    prenEnd = endTime
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo/'+campoId+'/prenota')
        .set('x-access-token', tokenUtente)
        .send({
          "data": today,
          "oraInizio": startTime,
          "oraFine": endTime,
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Crea prenotazione slot libero campetto x MENO DI 48 ORE PRIMA', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    let startTime = new Date(Date.now()-timeOffset + 2*86400*1000 -2*60*60*1000).toISOString().split('T')[1].slice(0,5)
    let endTime = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[1].slice(0,5)
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo/'+campoId+'/prenota')
        .set('x-access-token', tokenUtente)
        .send({
          "data": today,
          "oraInizio": startTime,
          "oraFine": endTime,
        })
        .expect(200)
        .expect(function(res) {
        	//console.log("MENO DI 48H PRIMA")
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Crea prenotazione slot GIÀ PRENOTATO campetto x', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    let startTime = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[1].slice(0,5)
    let endTime = new Date(Date.now()-timeOffset + 2*86400*1000 +3*60*60*1000).toISOString().split('T')[1].slice(0,5)
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo/'+campoId+'/prenota')
        .set('x-access-token', tokenUtente)
        .send({
          "data": today,
          "oraInizio": startTime,
          "oraFine": endTime,
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Crea prenotazione con PARAMETRI ERRATI', function() {
    let today = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[0]
    let startTime = new Date(Date.now()-timeOffset + 2*86400*1000).toISOString().split('T')[1].slice(0,5)
    let endTime = new Date(Date.now()-timeOffset + 2*86400*1000 +3*60*60*1000).toISOString().split('T')[1].slice(0,5)
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/campo/'+campoId+'/prenota')
        .set('x-access-token', tokenUtente)
        .send({
          "data": "laMiaData",
          "oraInizio": startTime,
          "oraFine": endTime,
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
        	assert.deepStrictEqual(res.body.errno, 2)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Ottieni lista delle prenotazioni utente, Account=Utente', function(){
 it('responds with prenotazioni utente list in json format', function(done){
  request(app)
   .get('/api/v2/utente/mie-prenotazioni')
   .set('x-access-token', tokenUtente)
      .expect(200)
   .expect(function(res){
    assert.deepStrictEqual(res.body.success, true)
    assert.notDeepStrictEqual(res.body.data.length, 0)
     })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})

describe('Ottieni lista delle prenotazioni utente, Account=Gestore', function(){
 it('responds with prenotazioni utente list in json format', function(done){
  request(app)
   .get('/api/v2/utente/mie-prenotazioni')
   .set('x-access-token', tokenGestore)
   .expect(function(res){
    assert.deepStrictEqual(res.body.success, false)
        assert.deepStrictEqual(res.body.errno, 1)
   })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})


describe('Ottieni lista delle prenotazioni del campo, Account=Gestore', function(){
 it('responds with campos prenptazioni list in json format', function(done){
  request(app)
   .get('/api/v2/campo/'+campoId+'/prenotazioni')
   .set('x-access-token', tokenGestore)
   .expect(function(res){
    assert.deepStrictEqual(res.body.success, true)
    assert.notDeepStrictEqual(res.body.data.length, 0)
          
   })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})


describe('Ottieni lista delle prenotazioni del campo, Account=Utente', function(){
 it('responds with campos prenotazioni list in json format', function(done){
  request(app)
   .get('/api/v2/campo/'+campoId+'/prenotazioni')
   .set('x-access-token', tokenUtente)
   .expect(function(res){
    assert.deepStrictEqual(res.body.success, false)
    assert.deepStrictEqual(res.body.errno, 3)
          
   })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})

describe('Elimina slot esistente CON PRENOTAZIONI', function() {
    it('responds with json', function(done) {
      request(app)
        .delete('/api/v2/campo/'+campoId+'/slot')
        .set('x-access-token', tokenGestore)
        .send({
          "data": slotData,
          "oraInizio": slotStart,
          "oraFine": slotEnd,
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Elimina prenotazione esistente', function() {
    it('responds with json', function(done) {
      request(app)
        .delete('/api/v2/campo/'+campoId+'/prenota')
        .set('x-access-token', tokenUtente)
        .send({
          "data": prenData,
          "oraInizio": prenStart,
          "oraFine": prenEnd,
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('Elimina slot esistente SENZA PRENOTAZIONI', function() {
    it('responds with json', function(done) {
      request(app)
        .delete('/api/v2/campo/'+campoId+'/slot')
        .set('x-access-token', tokenGestore)
        .send({
          "data": slotData,
          "oraInizio": slotStart,
          "oraFine": slotEnd,
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Ottieni lista dei campi gestore, User= Gestore', function(){
 it('responds with campi list in json format', function(done){
  request(app)
   .get('/api/v2/gestore/miei-campi')
   .set('x-access-token', tokenGestore)
      .expect(200)
   .expect(function(res){
    assert.deepStrictEqual(res.body.success, true)
    assert.notDeepStrictEqual(res.body.data.length, 0)
   })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})

describe('Ottieni lista dei campi gestore, User= Utente', function(){
 it('responds with campi list in json format', function(done){
  request(app)
   .get('/api/v2/gestore/miei-campi')
   .set('x-access-token', tokenUtente)
   .expect(function(res){
    assert.deepStrictEqual(res.body.success, false)
    assert.deepStrictEqual(res.body.errno, 1)
   })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})

describe('Ottieni foto di un campo esistente', function(){
 it('responds with an image', function(done){
  request(app)
   .get('/api/v2/campo/'+campoId+'/foto')
   .set('x-access-token', tokenUtente)
   .expect(function(res){
    res != null
         })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})

describe('Ottieni foto di un campo NON esistente', function(){
 it('responds with an image', function(done){
  request(app)
   .get('/api/v2/campo/nonUnCampo/foto')
   .set('x-access-token', tokenUtente)
   .expect(function(res){
    assert.deepStrictEqual(res.body.success, false)
    assert.notDeepStrictEqual(res.body.errno, 2)

         })
   .end(function(err, res){
    if(err) return done(err)
    return done()
   })
 })
})

describe('Elimina campo esistente', function() {
    it('responds with json', function(done) {
      request(app)
        .delete('/api/v2/campo/'+campoId)
        .set('x-access-token', tokenGestore)
        .send()
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, true)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('Elimina campo INesistente', function() {
    it('responds with json', function(done) {
      request(app)
        .delete('/api/v2/campo/unIdInesistente')
        .set('x-access-token', tokenGestore)
        .send()
        .expect(200)
        .expect(function(res) {
        	assert.deepStrictEqual(res.body.success, false)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('CREATE Utente (con mail già usata da altro utente)', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/utente')
        .send({
          "email": 'prova2@me.it',
          "nome": 'utente',
          "cognome": 'prova',
          'paypal': 'prova2@me.it',
          'telefono': '1234567890',
          'password':'s539#fnak043@q'
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})

describe('CREATE Utente (con mail già usata da gestore)', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v2/utente')
        .send({
          "email": 'provagest@me.it',
          "nome": 'utente',
          "cognome": 'prova',
          'paypal': 'prova@me.it',
          'telefono': '1234567890',
          'password':'s539#fnak043@q'
        })
        .expect(200)
        .expect(function(res) {
        	//console.log(res.body)
        	assert.deepStrictEqual(res.body.success, false)
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})


describe('DELETE Utente', function(){
	it('responds with json', function(done) {
		request(app)
			.delete('/api/v2/utente')
			.set('x-access-token', tokenUtente)
			.send()
			.expect(200)
			.expect(function(res){
				//console.log(res.body)
				assert.deepStrictEqual(res.body.success, true)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})


describe('DELETE Gestore', function(){
	it('responds with json', function(done) {
		request(app)
			.delete('/api/v2/gestore')
			.set('x-access-token', tokenGestore)
			.send()
			.expect(200)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, true)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

