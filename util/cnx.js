const axios = require('axios');
const enviroment = "deveploment";
const url_production = "";
const url_development = "http://localhost:3001";
const URL_BASE = enviroment === "production" ? url_production : url_development;

const requestAll = async (method,params=[])=>{
    console.log("===============",URL_BASE + method,"=========")
    return await axios({
        headers: { 
            'Content-Type': 'application/json',
            //'Authorization': `Bearer ${Auth}`  || ''
        },
        method: 'post',
        url: URL_BASE + method,
        params: null,
        data: params || []
    })
    .then(response=>{return response.data})
    .catch(err=>{
            if(err.response){
                return {message:err.response}
                //return {status:false,error_code:err.response.status,message:err.response}
            }else if(err.request){
                throw {status:false,error_code:404}
            }
            
        });
}

module.exports = {   
    requestAll
};