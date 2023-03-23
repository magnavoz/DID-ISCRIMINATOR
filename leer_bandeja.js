var Imap = require("imap");
var MailParser = require("mailparser").MailParser;
var Promise = require("bluebird");
Promise.longStackTraces();
const HtmlTableToJson = require('html-table-to-json');
const fs = require('fs')
const puppeteer = require('puppeteer-extra');

let resultadoFinal = [];

var imapConfig = {
    user: 'magnavoz.alertas@gmail.com',
    password: 'vlmcxzojcslyagpb',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
        rejectUnauthorized: false
    }
};

const imap = new Imap(imapConfig);
Promise.promisifyAll(imap);

const execute = async () => {

    imap.openBox("INBOX", false, async (err, mailBox) => {
        if (err) {
            console.error(err);
            return;
        }

        imap.search(["UNSEEN", ['HEADER', 'FROM', 'no-reply@alerts.carrier.cloud']], async (err, results) => {

            if (!results || !results.length) {
                console.log("No unread mails");
                imap.end();
                return;
            }

            imap.setFlags(results, ['\\Seen'], async(err)=> {
                if (!err) {
                    console.log("marked as read");
                } else {
                    console.log(JSON.stringify(err, null, 2));
                }
            });

            var f = imap.fetch(results, {
                bodies: ""
            });

            f.on("message", processMessage);

            f.once("error", function (err) {
                return Promise.reject(err);
            });

            f.once("end", function () {
                console.log("Done fetching all unseen messages.");
                imap.end();
            });


        })
    })

}

const processMessage = async (msg, seqno) => {
    var parser = new MailParser();

    parser.on("headers", function (headers) {
        // console.log("Header: " + JSON.stringify(headers));
    });

    parser.on("subject", function (subject) {
        // console.log("=========subject : " + subject);
    });

    parser.on('data', async (data) => {
        // console.log(data)
        if (data.type === 'text') {

            let body = data.html;

            //let tipoMensaje =  body.search('alcanzarse')==-1 ? (body.search('suspensiones')==-1 ? 0 : 2) : 1;

            //console.log(body);

            let indexStart = body.search("<table>");
            let indexEnd = body.search("</table>") + 8;


            const jsonTables = HtmlTableToJson.parse(body.substring(indexStart, indexEnd));

            const table = jsonTables.results;

            const Alarm_Details = table[0][0]['Alarm Details'];

            const carrier = Alarm_Details.split(' (')[0];
            const interconnection = Alarm_Details.split(' (')[1].substring(0, Alarm_Details.split(' (')[1].length - 1);

            console.log(Alarm_Details)

            let resultJson = [];

            await selectJson(carrier,async(err, planes) => {
                if (err) {
                    console.log(err);
                    return;
                  }
                resultJson = planes;
                
            })

            let routing = await getFreePlan(resultJson,carrier);

            console.log('routing=======>',routing);

            resultadoFinal.push({
                CARRIER:carrier,
                INTERCONNECT:interconnection,
                ROUTING: routing
            });
         

            // const page = await browser.newPage();

            // page.waitForNavigation();

            // await page.setViewport({
            //     width: 1366,
            //     height: 768
            // });

            
            // await page.goto(`https://magnavoz-us.digitalkcloud.com/Carriers?Filter=carrier_group%3D${carrier}&SortBy=Name&SortDirection=Ascending&Selections[0].Keyword=carrier_group&Selections[0].Operator==&Selections[0].Value=${carrier}&DisplayViewSelected=0&DisplayCurrencyIsoNumber=0&IsNewSearch=true&IsNewSort=false&pageNumber=undefined&ResultsId=929efc77-8dc0-41b0-a837-62c9a02067ce&TotalCount=129`, {
            //     waitUntil: 'networkidle0',
            // });
            // await updateJson(json);

        }
    })

    msg.on("body", function (stream) {
        stream.on("data", function (chunk) {
            parser.write(chunk.toString("utf8"));
        });

        console.log('terminate data')
    });
    msg.once("end", function () {
        // console.log("Finished msg #" + seqno);
        parser.end();
    });
}

const getFreePlan = async(data,carrier)=>{

    let plan = await new Promise(async(resolve, reject) => {

        //validamos si todos estan usados para reiniciar(validamos el ultimo plan si esta con 1 eso indica que ya todo esta ocupado y reinicamos)

        if(data[data.length - 1].COUNT == 1){
            //reinciamos todo;

            const jsonString = fs.readFileSync(`./util/plan.json`);

            data = JSON.parse(jsonString);
            
            await updateJson(data,carrier);

        }

        for (let i = 0; i < data.length; i++) {
            const item = data[i];

            if(item.COUNT == 0){
                //usamos este plan
                data[i]['COUNT'] = 1;

                await updateJson(data,carrier);

                resolve( item.NAME )
                break;
            }
            
        }

    });

    return plan;

    

}

const updateJson = async (DATA,carrier) => {
    // const customer = [{
    //     name: "Newbie Co.",
    //     order_count: 0,
    //     address: "Po Box City",
    // }]
    const jsonString = JSON.stringify(DATA)

    fs.writeFile(`./util/${carrier}.json`, jsonString, err => {
        if (err) {
            console.log('Error writing file', err)
        } else {
            console.log('Successfully wrote file')
        }
    })
}

const selectJson = async(carrier,cb)=> {

    if (!fs.existsSync(`./util/${carrier}.json`)) {
        console.log('no existe file')

        const jsonString = fs.readFileSync(`./util/plan.json`);
        
        fs.writeFile(`./util/${carrier}.json`, jsonString, err => {
            if (err) {
                console.log('Error writing file', err)
            } else {
                console.log('Successfully wrote file')
            }
        })
        

    }

    await new Promise((resolve, reject) => {
        fs.readFile(`./util/${carrier}.json`, (err, fileData) => {
            if (err) {
                return cb && cb(err);
            }
            try {
                const object = JSON.parse(fileData);
                resolve( cb && cb(null, object) );
                // return ;
            } catch (err) {
                reject( cb && cb(err) );
            }
        });
    })

   

}


    



const ejecuteReadMail = async() => {

    return await new Promise(resolve => {
        imap.once("ready", execute);
        imap.once("end",()=>{
            // process.exit(0);
            // console.log('ejecuteReadMail==>',resultadoFinal);
            resolve(resultadoFinal);
        })
        imap.once("error", function(err) {
            console.error("Connection error: " + err.stack);
        });
    
        imap.connect();
    })
    

    
}

module.exports = {
    ejecuteReadMail
}

