const config = {
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'bd_magnavoz'
}

const SP = {
    LISTAREMPRESAS:"SP_EMPRESAS_LISTAR",
    LISTARTELEFONO:"SP_TELEFONOS_LISTAR_POR_EMPRESA (?)"
}

const API = {
    WHATSAPP:{
        SEND:"/api/client/message",        
    }
}

module.exports = {
    API,
    SP,
    config
};