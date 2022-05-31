require('dotenv').config() 
const app = require('./api')
const request = require("supertest")
const body_parser = require("body-parser")
app.use(body_parser)
const assert = require('node:assert/strict');
let tokenUtente = "";
let tokenGestore = "";
let campoId = "";

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
          'prenotaEntro':24
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
          'prenotaEntro':24
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
          'prenotaEntro': 24
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
          'prenotaEntro':24
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
          'prenotaEntro':24
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
          'prenotaEntro':24
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


describe('DELETE Utente', function(){
	it('responds with json', function(done) {
		request(app)
			.delete('/api/v2/utente')
			.set('x-access-token', tokenUtente)
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
      .expect()
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
				assert.deepStrictEqual(res.body.errno, 17)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})

describe('Ottieni lista delle prenotazioni utente, User= Utente', function(){
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

describe('Ottieni lista delle prenotazioni utente, User= Gestore', function(){
	it('responds with prenotazioni utente list in json format', function(done){
		request(app)
			.get('/api/v2/utente/mie-prenotazioni')
			.set('x-access-token', tokenGestore)
			.expect(function(res){
				assert.deepStrictEqual(res.body.success, false)
        assert.deepStrictEqual(res.body.errno, 17)
			})
			.end(function(err, res){
				if(err) return done(err)
				return done()
			})
	})
})
