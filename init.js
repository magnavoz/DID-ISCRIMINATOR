const puppeteer = require('puppeteer-extra');
const { ejecuteReadMail } = require("./leer_bandeja");

async function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

const init = async()=>{

    let lista = await ejecuteReadMail();

    console.log('lista======>>>',lista)

    if(lista.length == 0){
        console.log('sin data que procesar')
        process.exit(1);
    }

    const browser = await puppeteer.launch({

        headless: false,
        ignoreHTTPSErrors: true,
        userDataDir: './session/routing',

    });

    const page = await browser.newPage();

    page.waitForNavigation();

    await page.setViewport({
        width: 1366,
        height: 768
    });

    await page.goto('https://magnavoz-us.digitalkcloud.com/Login');


    const loginInput = await page.waitForSelector('#Username');

    const loginPassword = await page.waitForSelector('#Password');

    await loginInput.type("anthony@quispemejia.com");

    await loginPassword.type("Kosex.1475")

    await page.click('#LoginButton');

    await page.waitForSelector(".breadcrumb-item").catch(async (err) => {
        console.log('.breadcrumb-item=================>:', err)
        await delay(3000)
        process.exit(1);
    });

    for (let i = 0; i < lista.length; i++) {
        const item = lista[i];

        let carrier = item.CARRIER;

        await page.goto(`https://magnavoz-us.digitalkcloud.com/Carriers?Filter=carrier_group%3D${item.CARRIER}&SortBy=Name&SortDirection=Ascending&Selections[0].Keyword=carrier_group&Selections[0].Operator==&Selections[0].Value=${item.CARRIER}&DisplayViewSelected=0&DisplayCurrencyIsoNumber=0&IsNewSearch=true&IsNewSort=false&pageNumber=undefined&ResultsId=929efc77-8dc0-41b0-a837-62c9a02067ce&TotalCount=129`, {
            waitUntil: 'networkidle0',
        });

        const dtg_asig= await page.waitForFunction(() => {
            const dtg_asig = [...document.querySelectorAll('a')];
            return dtg_asig
        });

        //console.log(dtg_asig);

        let listaUrl = await dtg_asig.evaluate(els => els.map( e => {return {TEXT:e.textContent,URL:e.href}} ));

        //console.log(listaUrl)

        let foundLinkToCarrierDetail = listaUrl.find(x=>x.TEXT==item.CARRIER);

        //estraemos el id del carrier:

        let urlId = foundLinkToCarrierDetail.URL

        let indexStart = urlId.search("Details");


        const idCarrier = urlId.substring(indexStart+8);

        await page.goto(`https://magnavoz-us.digitalkcloud.com/Carriers/Interconnect/${idCarrier}`, {
            waitUntil: 'networkidle0',
        });

        const dtg_asig2 = await page.waitForFunction(() => {
            const dtg_asig2 = [...document.querySelectorAll('a')];
            return dtg_asig2
        });

        let listaUrl2 = await dtg_asig2.evaluate(els => els.map( e => {return {TEXT:e.textContent,URL:e.href}} ));

        console.log('item.INTERCONNECT==========>',item.INTERCONNECT)

        let foundLinkToCarrierDetail2 = listaUrl2.find(x=>x.TEXT == item.INTERCONNECT);

        //estraemos el id del carrier:

        let urlId2 = foundLinkToCarrierDetail2.URL

        let indexStart2 = urlId2.search("interconnectId=");

        const idInterconnect = urlId2.substring(indexStart2+15);

        console.log(idInterconnect)


        await page.goto(`https://magnavoz-us.digitalkcloud.com/Carriers/Interconnects/Services/${idCarrier}?interconnectId=${idInterconnect}`, {
            waitUntil: 'networkidle0',
        });

        const dtg_asig3 = await page.waitForFunction(() => {
            const dtg_asig3 = [...document.querySelectorAll('a')];
            return dtg_asig3
        });

        let listaUrl3 = await dtg_asig3.evaluate(els => els.map( e => {return {TEXT:e.textContent,URL:e.href}} ));

        console.log('SERVICE==========>',`cc ${item.INTERCONNECT}`)

        // console.log(listaUrl3)

      

        let res  = filterValuePart(listaUrl3, `ServiceDetails/${idCarrier}/${idInterconnect}?serviceId=`)

        console.log(res);

        //estraemos el id del carrier:

        let urlId3 = res[0].URL

        let indexStart3 = urlId3.search("serviceId=");

        const idService = urlId3.substring(indexStart3+10);

        console.log(idService)

        await page.goto(`https://magnavoz-us.digitalkcloud.com/Carriers/Interconnects/ServiceDetailsEdit/${idCarrier}/${idInterconnect}?serviceId=${idService}`, {
            waitUntil: 'networkidle0',
        });

        const dtg_select_value = await page.waitForFunction(() => {
            const dtg_select_value = [...document.querySelectorAll('option')];
            return dtg_select_value
        });

        let listaUrl4 = await dtg_select_value.evaluate(els => els.map( e => {return {TEXT:e.textContent.replace(/\n/g, '').trim(),VALUE:e.value}} ));

        let foundValue = listaUrl4.find(x=>x.TEXT==item.ROUTING);

        console.log(foundValue.VALUE)

        const LcrId = await page.waitForSelector('#LcrId', {
            visible: true,
            // timeout: 0
        });

        await LcrId.select(foundValue.VALUE); 
        
        const save = await page.waitForSelector('#SaveService', {
            visible: true,
            // timeout: 0
        });  

        // await save.click();

        //console.log(listaUrl4)

        await delay(10000)
        
    }


    process.exit(1);

   

  

}

function filterValuePart(arr, part) {
    return arr.filter(function (obj) {
        return Object.keys(obj)
            .some(function (k) {
                return obj[k].indexOf(part) !== -1;
            });
    });
};

init();

