const {requestAll} = require('./util/cnx');
const {API} = require('./util/connect');

const sendMessageWhatsApp = async (numbers,message=null) => {
   

    var data = {
        id:"P-941693555",  
        numbers,
        // [
        //     {
        //         id:"51927019771@c.us"
        //     }
        // ],
        message:message,
        isImage:false,
        image:""//"https://ychef.files.bbci.co.uk/976x549/p0bdlxm5.jpg"
    }

    await requestAll(API.WHATSAPP.SEND,data)
    .then((res) => {

        console.log('respuesta:',res);
    })
    .catch((err) => {
       console.log(err);
    });
}

module.exports = {  
    sendMessageWhatsApp
}