var braintree = require("braintree");

const gateway = new braintree.BraintreeGateway({
	environment: braintree.Environment.Sandbox,
	publicKey: 'qcg6yx4jg6wty2gy',
	privateKey: 'ad920af59352b256d85facb50066cdcf',
	merchantId: '8w6h3phynd264tqs'
});

function searchPayPalUserInVault(email, callback) {
	const stream = gateway.customer.search((search) => {
		search.email().is(email);
	}, function (err, response) {
        if(!err){
            let id = response.ids[0];
            callback(id);
        }
	});
}

async function addPayPalUserInVault(nome, cognome, email, telefono) {
	let result = await gateway.customer.create({
		firstName: nome,
		lastName: cognome,
		email: email,
		phone: telefono
	});
	return result.customer.id;
}

module.exports = {searchPayPalUserInVault, addPayPalUserInVault};