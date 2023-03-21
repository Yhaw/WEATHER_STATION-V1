const express = require('express');
const https = require('https');
const bodyParser = require('body-parser')
const pg  = require('pg');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors('*'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const THINGSPEAK_CHANNEL_ID = 2073550;
const THINGSPEAK_API_KEY = "GRN89P0Y03YSLXWS"; 

const config = {
    connectionString:"postgres://afrilogic_station:KZf3pRfUNOSRioBTtd4d3NGAZtiKZNhy@dpg-cgctruu4dad6fr78j8lg-a/weather_station1"
}
const pool =  new pg.Pool(config);


function fetchLatestData() {
    https.get(`https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds/last.json?api_key=${THINGSPEAK_API_KEY}`, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        const feed = JSON.parse(data);
  
        const temperature = feed.field1;
        const humidity = feed.field2;
        const rainfall = feed.field3;
        const wind_speed = feed.field4;
        const timestamp = new Date(feed.created_at);
  
        pool.query('INSERT INTO weather_data (temperature, humidity, rainfall, wind_speed, timestamp) VALUES ($1, $2, $3, $4, $5)', [temperature, humidity, rainfall, wind_speed, timestamp], (error, results) => {
          if (error) {
            console.error(error);
          } else {
            console.log('Data saved to database');
          }
        });
      });
    }).on('error', (err) => {
      console.error(err);
    });
  }
  
  setInterval(fetchLatestData, 21000);  
  app.get('/weather', (req, res) => {
    pool.query('SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 1', (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error retrieving data from database');
      } else {
        res.send(results.rows);
      }
    });
  });


  app.get('/weather_avg', (req, res) => {
    pool.query('SELECT AVG(temperature) AS avg_temperature, AVG(humidity) AS avg_humidity, AVG(wind_speed) AS avg_wind_speed FROM weather_data', (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error retrieving data from database');
      } else {
        res.send(results.rows[0]);
      }
    });
  });

app.get('/weather/summary', (req, res) => {
    pool.query('SELECT ROUND(MIN(temperature)::numeric, 2) AS min_temperature, ROUND(MAX(temperature)::numeric, 2) AS max_temperature, ROUND(MIN(humidity)::numeric, 2) AS min_humidity, ROUND(MAX(humidity)::numeric, 2) AS max_humidity, ROUND(MIN(wind_speed)::numeric, 2) AS min_wind_speed, ROUND(MAX(wind_speed)::numeric, 2) AS max_wind_speed FROM weather_data', (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error retrieving data from database');
      } else {
        res.json(results.rows[0]);
      }
    });
  });

  
  app.listen(port, () => {
    console.log(`Server is Running`);
  });


// CREATE TABLE weather_data (temperature FLOAT NOT NULL,humidity FLOAT NOT NULL,rainfall INT NOT NULL,wind_speed FLOAT NOT NULL,timestamp TIMESTAMP NOT NULL);