var Imap = require("imap");
var MailParser = require("mailparser").MailParser;
var Promise = require("bluebird");
Promise.longStackTraces();

let listaEmpresas = [];

const DB = require("./database/generalDatabase");
const { SP } = require("./util/connect");
const { sendMessageWhatsApp } = require('./whatsapp')

var imapConfig = {
    user: 'magnavoz.alertas@gmail.com',
    password: 'vlmcxzojcslyagpb',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
};

const execute = async()=> {

    listaEmpresas = await DB.exec(SP.LISTAREMPRESAS).then((res)=>{
        return res;
    });

    imap.openBox("INBOX", false, async(err, mailBox)=> {
        if (err) {
            console.error(err);
            return;
        }
        imap.search(["UNSEEN",['HEADER','FROM','alerta@magnavoz.com']], async(err, results)=> {
            if(!results || !results.length){
                console.log("No unread mails");
                imap.end();
                return;
            }
             //mark as seen
            imap.setFlags(results, ['\\Seen'], async(err)=> {
                if (!err) {
                    console.log("marked as read");
                } else {
                    console.log(JSON.stringify(err, null, 2));
                }
            });

            

            

            var f = imap.fetch(results, { bodies: "" });
            f.on("message", processMessage);
            f.once("error", function(err) {
                return Promise.reject(err);
            });
            f.once("end", function() {
                console.log("Done fetching all unseen messages.");
                imap.end();
            });
        });
    });
}

const processMessage = async (msg, seqno) => {
    //console.log("Processing msg #" + seqno);
    //console.log(msg);

    var parser = new MailParser();
    parser.on("headers", function(headers) {
        ///console.log("Header: " + JSON.stringify(headers));
    });

    parser.on("subject", function(subject) {
        //console.log("=========subject : " + subject);
    });

    parser.on('data', async(data) => {
        if (data.type === 'text') {
            //console.log(seqno);
            //console.log(data.text);  /* data.html*/
            let body = data.text;        
            
            let tipoMensaje =  body.search('alcanzarse')==-1 ? (body.search('suspensiones')==-1 ? 0 : 2) : 1;
           
            if( tipoMensaje > 0 ){

                let idCliente = "";
                let telefonos = [];

                listaEmpresas.map((x)=>{
                    if(body.search(x.CLIENTE)!=-1){
                        idCliente = x.ID;
                        return;
                    }
                });

                //console.log(idCliente);

                await DB.exec(SP.LISTARTELEFONO,[idCliente]).then((res)=>{
                    telefonos = res.map((x)=>{
                        let result = {
                            id:x.TELEFONO+'@c.us'
                        }
                        return result;
                    });
                });

                // telefonos.push({
                //     id:'51927019771@c.us'
                // })

                console.log(telefonos)

                console.log(body)

                //await sendMessageWhatsApp(telefonos,body);

                //console.log(cliente);
                //let cliente = body.substr(14,30).split(",")[0];
                //console.log('cliente==========',cliente)
                
            }else{
                console.log("mensaje no valido")
            }
                
        }       

        // if (data.type === 'attachment') {
        //     console.log(data.filename);
        //     data.content.pipe(process.stdout);
        //     // data.content.on('end', () => data.release());
        // }
     });

    msg.on("body", function(stream) {
        stream.on("data", function(chunk) {
            parser.write(chunk.toString("utf8"));
        });
    });
    msg.once("end", function() {
        // console.log("Finished msg #" + seqno);
        parser.end();
    });
}

var imap = new Imap(imapConfig);
Promise.promisifyAll(imap);

imap.once("ready", execute);
imap.once("end",()=>{process.exit(0);})
imap.once("error", function(err) {
    console.error("Connection error: " + err.stack);
});

imap.connect();