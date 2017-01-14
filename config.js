const path = require('path');
let privateConfig = {};

try {
    privateConfig = require('./privateConfig');
} catch(error) {}


const developmentConfig = {
    env: 'development',
    privateConfig
};

const productionConfig = {
    env: 'production',
    privateConfig
};

module.exports = {
    developmentConfig,
    productionConfig
};
