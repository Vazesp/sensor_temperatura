require('dotenv').config();

const express = require('express');
const mongoose = require ('mongoose');
const bodyParser = require ('body-parser');
const mqtt = require('mqtt');
const app = express();
const PORT = process.env.PORT || 3000;

const mqttClient = mqtt.connect("mqtt.eclipseprojects.io");

app.use(bodyParser.json());
app.use(require('cors')());

mqttClient.on("connect", () => {
    console.log("Conectado al MQTT");
    mqttClient.subscribe("consulta", (err) => {
        if(!err){
            console.log("Suscrito al topic");
        }
    });
});

mqttClient.on("message", async(topic, message)=>{
    const msg = message.toString().toLowerCase();
    console.log("Mensaje recibido:", msg);

    if(msg.includes("promedio") && msg.includes("temperatura")){
        const promedio = await pruebas.aggregate([
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
        const valor = promedio[0]?.promedio?.toFixed(2) || "No hay datos";
        mqttClient.publish("temperatura", 'Promedio temperatura: ${valor} %');
    }

    if(msg.includes("promedio") && msg.includes("humedad")){
        const promedio = await pruebas.aggregate([
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
        const valor = promedio[0]?.promedio?.toFixed(2) || "No hay datos";
        mqttClient.publish("temperatura", 'Promedio humedad: ${valor} %');
    }

    if(msg.includes("promedio")){
        const promedio = await pruebas.aggregate([
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
        mqttClient.publish("temperatura", 'Promedio Temperatura: ${temp} ºC \n Promedio Humedad : ${hum} %');
    }
})

//conectarnos al server de mongo
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB Atlas")) //si lo hace pone esto
.catch(err => console.error("Error en MongoDB:", err));//si no esto

//Creacion del esquema que se guardará en el mongo
const SensorSchema = new mongoose.Schema({
    temperatura : Number,
    humedad : Number,
    hora : {type : Date, default : Date.now}
});
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
