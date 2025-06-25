const express = require('express');
const mongoose = require ('mongoose');
const bodyParser = require ('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(require('cors')());

mongoose.connect('mongodb://localhost:27017/pruebas', {
    useNewUrlParser : true,
    useUnifiedTopology : true,
});

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

app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
