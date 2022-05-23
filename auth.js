var jwt = require('jsonwebtoken');
var db = require('./db-model');
const model = new db.Model();

async function generateToken(req, res){
    let account = await model.getAccount(req.body.email)
    if (!account) res.json({success:false,message:'User not found'})
    if (account.password!=req.body.password) res.json({success:false,message:'Wrong password'})
    // user authenticated -> create a token
    var payload = { email: account.email, id: account.id, tipologia: account.tipologia }
    var options = { expiresIn: 86400 } // expires in 24 hours
    var token = jwt.sign(payload, process.env.SUPER_SECRET, options);
    res.json({ success: true, message: 'Enjoy your token!',
        token: token, email: account.email, id: account.id, tipologia: account.tipologia, self: "api/v1/" + account.id
    });
}

const checkIsGestore = function(req, res){
	let check = req.loggedUser && req.loggedUser.tipologia == "Gestore";
	if(!check)
		res.json({ success: false, message: "You are not authorized to do this" })
}

const checkIsUtente = function(req, res){
	let check = req.loggedUser && req.loggedUser.tipologia == "Utente";
	if(!check)
		res.json({ success: false, message: "You are not authorized to do this" })
}

const tokenChecker = function(req, res, next) {
    // header or url parameters or post parameters
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
	if (!token) res.status(401).json({success:false,message:'No token provided.'})
	// decode token, verifies secret and checks expiration
	jwt.verify(token, process.env.SUPER_SECRET, function(err, decoded) {
		if (err) res.status(403).json({success:false,message:'Token not valid'})
		else {
			// if everything is good, save in req object for use in other routes
			req.loggedUser = decoded;
			console.log(req.loggedUser);
			next();
		}
	});
}

module.exports = {generateToken, tokenChecker, checkIsGestore, checkIsUtente};
