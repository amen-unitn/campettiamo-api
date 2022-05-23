
const app = require('./api')
const request = require("supertest")
const body_parser = require("body-parser")
app.use(body_parser)


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
        .get('/api/v1/campi-nome?nome=tren&raggio=5')
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
  
