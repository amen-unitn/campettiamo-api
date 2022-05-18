
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
            res.body[0].id = "559f4704-618d-493b-9279-aef803e5eacf"
            res.body[0].name = "Clesio Opera Universitaria"
          })
        .end(function(err, res) {
          if (err) return done(err)
          return done()
        })
    })
  })