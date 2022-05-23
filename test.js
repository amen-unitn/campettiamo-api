
const app = require('./api')
const request = require("supertest")
const body_parser = require("body-parser")
const model = require ('./db-model')
app.use(body_parser)

describe('POST /api/v1/campo/:campo/slot', function() {
    it('responds with json', function(done) {
      request(app)
        .post('/api/v1/campo/559f4704-618d-493b-9279-aef803e5eacf/slot')
        .send({
          "data": '2022-11-11',
          "oraInizio": '14:30',
          "oraFine": '16:30'
        })
        .expect(200)
        .expect(function(res) {
            res.body.success = true
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
  })

 

describe('GET /api/v1/campi', function() {
    it('responds with json', function(done) {
      request(app)
        .get('/api/v1/campi')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) {
            res.body.length > 0
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
  })
  
  
describe('GET /api/v1/campi-nome', function() {
    it('responds with json', function(done) {
      request(app)
        .get('/api/v1/campi-nome?nome=trento&raggio=5')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) {
            res.body.length > 0
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})
  
describe('GET /api/v1/campi-luogo', function() {
    it('responds with json', function(done) {
      request(app)
        .get('/api/v1/campi-luogo?lat=46.0682733&lng=11.1179705&raggio=10')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect(function(res) {
            res.body.length > 0
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
})
  
  
describe('/api/v1/campo/:id', function() {
  
      step('POST: create resource', function(done) {
          request(app)
            .post({
                 url: '/api/v1/campo',
                 body: JSON.stringify({nome:"Campo di prova", idGestore:"", indirizzo:"via del lago duria 7", cap:"38153", citta:"Navile", provincia:"TN", 
                   sport:"Calcio, Baseball", prenotaEntro:24, tariffa:30})
                 }, function(error, response, body){
                    console.log(body);
             }).expect('Content-Type', /json/)
		.expect(200)
		.expect(function(res) {
		    res.body.id != null
		  })
		.end(function(err, res) {
		  if (err) return done(err)
		  return done()
		})
      });
  
      step('GET: read edited resource', function(done) {
      });

      step('PUT: edit resource', function(done) {
          throw new Error('failed');
      });

      step('GET: read edited resource', function(done) {
      });

      step('DELETE: delete resource', function(done) {
      });
  
      xstep('GET: read edited resource', function(done) {
      });

});
