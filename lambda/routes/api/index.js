const express = require('express');

const app = express();

const apiV1Routes = require('./api/v1');
const apiV2Routes = require('./api/v2');

app.use('/api/v1', apiV1Routes);
app.use('/api/v2', apiV2Routes);

module.exports = app;
