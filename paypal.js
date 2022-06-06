var braintree = require("braintree");
const db = require("./db-model");
var model = new db.Model();

const gateway = new braintree.BraintreeGateway({
	environment: braintree.Environment.Sandbox,
	publicKey: 'qcg6yx4jg6wty2gy',
	privateKey: 'ad920af59352b256d85facb50066cdcf',
	merchantId: '8w6h3phynd264tqs'
});

async function searchPayPalUserInVault(email, callback) {
	await gateway.customer.search((search) => {
		search.email().is(email);
	}, function (err, response) {
        if(!err){
            let id = response.ids[0];
            callback(id);
        }
	});
}

async function addPayPalUserInVault(nome, cognome, email, telefono, callback, errCallback) {
	try{
		await gateway.customer.create({
			firstName: nome,
			lastName: cognome,
			email: email,
			phone: telefono
		});
		callback(result.customer.id);
	}catch(err){
		if(errCallback)
			errCallback(err);
	}
}

async function getClientToken(id, callback) {
	await gateway.clientToken.generate({
		customerId: id
	}, (err, response) => {
		if(!err){
			callback(response.clientToken);
		}
	});
}

async function pay(idCampo, data, oraInizio, oraFine, nonce, callback) {

	let amount = await model.getCostoPrenotazione(idCampo, data, oraInizio, oraFine);
	console.log(amount);
	if(amount == 0)
		res.json({success:false, errno:2, message:"Invalid prenotazione"})
	else{
		await gateway.transaction.sale({
			amount: amount.toString(), //paypal expects amount as a string
			paymentMethodNonce: nonce,
			options: {
				submitForSettlement: true
			}
		}, (err, response) => {
			if(!err){
				callback(response);
			}
		});
	}
}

module.exports = {searchPayPalUserInVault, addPayPalUserInVault, getClientToken, pay};
