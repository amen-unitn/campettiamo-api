const sgMail = require('@sendgrid/mail')
require('dotenv').config()
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
var db = require('./db-model');
const model = new db.Model();

async function sendNewPasswordEmail(email, newPassword){

	let user = await model.getAccountByEmail(email);
	if(user && user.email){
		const msg = {
		  to: email,
		  from: 'nicola.bernardi-2@studenti.unitn.it',
		  templateId: 'd-7ceac87dd15e44a3a6d551cf4559fb92',
	  	  dynamicTemplateData: {
	    		nome: user.nome,
	    		email: email,
	    		password: newPassword
	  	  }
		}
		sgMail
		  .send(msg)
		  .then(() => {
		    //console.log('Email sent')
		  })
		  .catch((error) => {
		    console.error(error)
		  })
	}
}

module.exports = {sendNewPasswordEmail};
