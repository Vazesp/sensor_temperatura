require('dotenv').config();

const express = require('express');
const mongoose = require ('mongoose');
const bodyParser = require ('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(require('cors')());

mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Conectado a MongoDB Atlas"))
.catch(err => console.error("Error en MongoDB:", err));

const SensorSchema = new mongoose.Schema({
    temperatura : Number,
    humedad : Number,
    hora : {type : Date, default : Date.now}
});

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
