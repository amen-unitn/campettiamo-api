var jwt = require('jsonwebtoken');
var db = require('./db-model');
var crypto = require('crypto');
var sendmail = require('./email');
var paypal = require('./paypal');
const model = new db.Model();

function createAccountUtente(req, res) {
	if (checkNewUserProperties(req.body)) {
		model.createUtente(req.body.nome, req.body.cognome, req.body.email, req.body.paypal, req.body.telefono, req.body.password).then((id) => {
			paypal.addPayPalUserInVault(req.body.nome, req.body.cognome, req.body.paypal, req.body.telefono).then((paypal) => {
				if (paypal != null)
					res.json({ success: true, message: "Account creato", id: id });
				else
					res.json({ success: false, message: "PayPal id non ritornato" });
			}).catch(err => {
				res.json({ success: false, message: "Errore nel salvataggio dell'account PayPal" });
			});
		}).catch(err => {
			res.json({success:false, message:"Errore nella registrazione dell'utente", errno:4});
		});
	}else
		res.json({success:false, message: "I parametri richiesti sono: nome, cognome, email, paypal, telefono, password. Non tutti sono stati forniti", errno:2});
}

function createAccountGestore(req, res) {
	if (checkNewUserProperties(req.body)) {
		model.createGestore(req.body.nome, req.body.cognome, req.body.email, req.body.paypal, req.body.telefono, req.body.password).then((id) => {
			paypal.addPayPalUserInVault(req.body.nome, req.body.cognome, req.body.paypal, req.body.telefono).then((paypal) => {
				if (paypal != null)
					res.json({ success: true, message: "Account creato", id: id });
				else
					res.json({ success: false, message: "PayPal id non ritornato" });
			}).catch(err => {
				res.json({ success: false, message: "Errore nel salvataggio dell'account PayPal" });
			});
		}).catch(err => {
			res.json({success:false, message:"Errore nella registrazione del gestore", errno:4});
		});
	}else
		res.json({success:false, message: "I parametri richiesti sono: nome, cognome, email, paypal, telefono, password. Non tutti sono stati forniti", errno:2});
}

function getLoggedAccount(req, res){
	let userId = req.loggedUser.id;
	model.getAccountById(userId).then(account => {
		if(account != null)
			res.json({success:true, data:account});
		else
			res.json({success:false, message:"User not found", errno:2});
	}).catch(err => {
		res.json({success:false, message:"Errore nella ricerca del dettaglio account", errno:4});
	});
}

function editAccount(req, res) {
	let userId = req.loggedUser.id;
	if(checkNewUserProperties(req.body)){
		model.editAccount(userId, req.body.nome, req.body.cognome, req.body.email, req.body.paypal, req.body.telefono, req.body.password).then( 
		(result) => {
			if(result)
				res.json({success:true, message:"Account modificato"});
			else
				res.json({success:false, message:"Errore nella modifica dell'account", errno:4});
		}).catch(err => {
			res.json({success:false, message:"Errore nella modifica dell'account", errno:4});
		});
	}else
		res.json({success:false, message: "I parametri richiesti sono: nome, cognome, email, paypal, telefono, password. Non tutti sono stati forniti", errno:2});
}

async function recuperoPassword(req, res){
	let email = req.body.email;
	if(!email)
		res.json({success:false, message:"Missing email", errno:2});
	else{
  		let length = 10;
  		let wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$';
		let password = Array.from(crypto.randomFillSync(new Uint32Array(length)))
		    .map((x) => wishlist[x % wishlist.length])
		    .join('');
		if(model.updatePassword(email, password)){
			sendmail.sendNewPasswordEmail(email, password);
			res.json({success:true, message:"Check your inbox"});
		}else
			res.json({success:false, message:"User not found", errno:2});
		
	}
}

function deleteAccount(req, res) {
	let userId = req.loggedUser.id;
	model.deleteAccount(userId).then((result) => {
		if (result)
			res.json({ success: true, message: "Account cancellato. Torna a trovarci :(" });
		else
			res.json({success:false, message:"Errore nella cancellazione dell'account", errno:4});
	}).catch(err => {
		res.json({success:false, message:"Errore nella cancellazione dell'account", errno:4});
	});
}

function checkNewUserProperties(reqBody) {
	return reqBody.nome != undefined && reqBody.nome != null &&
		reqBody.cognome != undefined && reqBody.cognome != null &&
		reqBody.email != undefined && reqBody.email != null &&
		reqBody.paypal != undefined && reqBody.paypal != null &&
		reqBody.telefono != undefined && reqBody.telefono != null &&
		reqBody.password != undefined && reqBody.password != null;
}

async function generateToken(req, res){
    let account = await model.getAccountByEmail(req.body.email)
    if (!account) res.json({success:false,message:'User not found', errno:2})
    else if (!req.body.password || account.password!=req.body.password) 
		res.json({success:false,message:'Wrong password', errno:2})
	else{
		paypal.searchPayPalUserInVault(account.account_paypal, (vaultId) => {
			if (vaultId == null) {
				vaultId = paypal.addPayPalUserInVault(account.nome, account.cognome, account.account_paypal, account.telefono, (res) => {
					vaultId = res;
				})
			}
			// user authenticated -> create a token
			var payload = { email: account.email, id: account.id, tipologia: account.tipologia }
			var options = { expiresIn: 86400 } // expires in 24 hours, 86400
			var token = jwt.sign(payload, process.env.SUPER_SECRET, options);
			res.json({ success: true, message: 'Enjoy your token!',
				token: token, email: account.email, id: account.id, tipologia: account.tipologia,
				vaultId: vaultId
			});
		});
	}
}

async function checkOwnsCampo(idGestore, idCampo){
	campi = await model.getListaCampiGestore(idGestore);
	let result = false;
	if(campi && campi.length > 0){
		campi.forEach((campo) => {
			console.log(campo.id);
			if(campo.id == idCampo){
				result = true;
			}
		});
	}
	return result;
}

const checkIsGestore = function(req, res){
	let check = req.loggedUser && req.loggedUser.tipologia == "Gestore";
	if(!check)
		res.json({ success: false, message: "You are not authorized to do this", errno:3})
	return check;
}

const checkIsUtente = function (req, res) {
	let check = req.loggedUser && req.loggedUser.tipologia == "Utente";
	if(!check)
		res.json({ success: false, message: "You are not authorized to do this", errno:3 })
	return check;
}

const tokenChecker = function(req, res, next) {
    // header or url parameters or post parameters
    var token = req.body.token || req.query.token || req.headers['x-access-token'];
	if (!token) res.status(401).json({success:false,message:'No token provided.', errno:2})
	// decode token, verifies secret and checks expiration
	jwt.verify(token, process.env.SUPER_SECRET, function(err, decoded) {
		if (err) res.status(403).json({success:false,message:'Token not valid', errno:1})
		else {
			// if everything is good, save in req object for use in other routes
			req.loggedUser = decoded;
			console.log(req.loggedUser);
			next();
		}
	});
}

module.exports = {generateToken, tokenChecker, checkIsGestore, checkIsUtente, checkOwnsCampo, createAccountUtente, 
	createAccountGestore, editAccount, deleteAccount, getLoggedAccount, recuperoPassword};
