require('dotenv').config();

const express = require('express');
const mongoose = require ('mongoose');
const bodyParser = require ('body-parser');
const mqtt = require('mqtt');
const app = express();
const PORT = process.env.PORT || 3000;

const mqttClient = mqtt.connect("mqtt://mqtt.eclipseprojects.io");

app.use(bodyParser.json());
app.use(require('cors')());

mqttClient.on("connect", () => {
    console.log("Conectado al MQTT");
    mqttClient.subscribe("temperatura", (err) => {
        if(!err){
            console.log("Suscrito al topic");
        }
    });
});

mqttClient.on("message", async(topic, message)=>{
    const msg = message.toString().toLowerCase();
    console.log("Mensaje recibido:", msg);
    //Si en el mensaje mqtt aparece promedio y temperatura nos da el promedio de temperatura
    if(msg.includes("promedio") && msg.includes("temperatura")){
        const promedio = await Sensor.aggregate([
            {
                $match : {temperatura :{$ne : null}}
            },
            {
                $group : {
                    _id : null,
                    promedio : {$avg : "$temperatura"}
                }
            }
        ]);
        //Guardamos el valor de promedio, que tenga un valor promedio y redondeado a dos decimales 
        const valor = promedio[0]?.promedio?.toFixed(2) || "No hay datos";
        //Publicamos en el cliente mqtt con topic respuesta 
        mqttClient.publish("respuesta", `Promedio temperatura: ${valor} %`);
    }
    //Si en el mensaje mqtt aparece promedio y humedad nos da el promedio de humedad
    if(msg.includes("promedio") && msg.includes("humedad")){
        const promedio = await Sensor.aggregate([
            {
                $match : {humedad :{$ne : null}}
            },
            {
                $group : {
                    _id : null,
                    promedio : {$avg : "$humedad"}
                }
            }
        ]);
        //Guardamos el valor de promedio, que tenga un valor promedio y redondeado a dos decimales 
        const valor = promedio[0]?.promedio?.toFixed(2) || "No hay datos";
        mqttClient.publish("respuesta", `Promedio humedad: ${valor} %`);
    }
    //Cuando solo aparece promedio en el mensaje mqtt nso da los dos promedios
    if(msg.includes("promedio") && !msg.includes("temperatura") && !msg.includes("humedad")){
        const promedio = await Sensor.aggregate([
            {
                $match : {humedad :{$ne : null}, temperatura : {$ne : null}}
            },
            {
                $group : {
                    _id : null,
                    promedio_temperatura : {$avg : "$temperatura"},
                    promedio_humedad : {$avg : "$humedad"}
                }
            }
        ]);
        const temp = promedio[0]?.promedio_temperatura?.toFixed(2) || "No hay datos";
        const hum = promedio[0]?.promedio_humedad?.toFixed(2) || "No hay datos";
        mqttClient.publish("respuesta", `Promedio Temperatura: ${temp} ºC \n Promedio Humedad : ${hum} %`);
    }

    if(msg.includes("borrar") && (msg.includes("base de datos")|| msg.includes("database")||msg.includes("BBDD"))){
            Sensor.deleteMany({})
            .then(() => console.log("Base de datos borrada"))
            .catch((err) => console.log(err));
    }
    
    //Cuando el mensaje en el mqtt incluya actual/ahora y temperatura nos da la última temperatura
    if((msg.includes("actual")|| msg.includes("ahora")) && msg.includes("temperatura")){
        const datos = await Sensor.find({}, {_id: 0, temperatura : 1}).sort({hora : -1}).limit(1);

        const temp = datos[0]?.temperatura.toFixed(1) || "No hay datos";
        mqttClient.publish("respuesta", `Temperatura Actual: ${temp} ºC`);
    }
    //Cuando el mensaje en el mqtt incluya actual o ahora y humedad nos la última humedad guardada
    if((msg.includes("actual") || msg.includes("ahora")) && msg.includes("humedad")){
        const datos = await Sensor.find({}, {_id : 0, humedad : 1}).sort({hora : -1}).limit(1);
        
        const hum = datos[0]?.humedad?.toFixed(1) ||"No hay datos";
        mqttClient.publish("respuesta", `Humedad Actual: ${hum} %`);
    } 
})

//conectarnos al server de mongo
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true, //Si no existe se cr
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB Atlas")) //si lo hace pone esto
.catch(err => console.error("Error en MongoDB:", err));//si no esto

//Creacion del esquema que se guardará en el mongo
const SensorSchema = new mongoose.Schema({
    temperatura : Number,
    humedad : Number,
    hora : {type : Date, default : Date.now}
}, {versionKey : false});
//primer valor es el nombre del modelo, su esquema y el tercero donde lo guarda
const Sensor = mongoose.model('Sensor', SensorSchema, 'ns');

app.post('/api/datos', async (req, res) => {
    const {temperatura, humedad} = req.body;
    try{
        const nuevo = new Sensor({temperatura, humedad});
        await nuevo.save();
        res.status(201).send({mensaje: "Dato guardado"});
    }catch (error){
        res.status(500).send({error : "Error al guardar"});
    }
});

app.listen(PORT, () => console.log('Servidor en http://localhost:3000'));
