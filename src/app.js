
import https from 'https';
import http from 'http';
import config from './config';

const {privateConfig: {botToken, openWeatherMapApiKey}} = config;

const pollingTimeout = 5;

const requestMethods = {
    getUpdates: 'getUpdates',
    sendMessage: 'sendMessage'
};

let updateId = 0;

if (botToken) {
    getUpdates();
} else {
    console.info('No telegram bot token found');
}

function getUpdates() {

    const params = {
        timeout: pollingTimeout
    };

    if (updateId) {
        params.offset = updateId;
    }

    makeTelegramRequest(requestMethods.getUpdates, params).then(parseUpdates).catch(onUpdateError);
}

function makeTelegramRequest(methodName, params) {
    const keys = Object.keys(params);

    const query = keys.length ? '?' + keys.map(key => `${key}=${encodeURIComponent(params[key])}`).join('&') : '';

    const options = {
        hostname: 'api.telegram.org',
        path: `/bot${botToken}/${methodName}${query}`,
        port: 443,
        method: 'GET'
    };

    return makeRequest(options);
}

function makeRequest(options, useHttp) {

    return new Promise((resolve, reject) => {

        const protocol = useHttp ? http : https;

        const request = protocol.request(options, res => {

            let resultStr = '';

            res.on('data', chunk => resultStr += chunk.toString());

            res.on('end', () => {
                try {
                    resolve(JSON.parse(resultStr));
                } catch (error) {
                    reject(new Error('parse server response error'), 500);
                }
            });

        });

        request.on('error', error => reject(error, 500));

        request.end();
    });
}

function onUpdateError(error) {
    console.error(error);
    getUpdates();
}

function parseUpdates(data) {
    if (data.ok) {
        data.result.forEach(parseUpdate);
    } else {
        console.error(new Error(data.description));
    }
    getUpdates();
}

function parseUpdate(update) {

    const {message, update_id} = update;
    const {chat, text} = message;
    const {first_name: firstName, last_name: lastName, id: chatId} = chat;
    const fullName = getFullName(firstName, lastName);

    if (update_id >= updateId) {
        updateId = update_id + 1;
    }

    if (text) {
        return parseTextMessage(update);
    }

    console.log(`Bot message from ${fullName}: unsupported message type, chatId = ${chatId}`);

    sendMessage(chatId, 'Я пока не понимаю такие сообщения')
}

function parseTextMessage(update) {
    const {message} = update;
    const {chat, text} = message;
    const {first_name: firstName, last_name: lastName, id: chatId} = chat;
    const fullName = getFullName(firstName, lastName);


    console.log(`Bot message from ${fullName}: "${text}", chatId = ${chatId}`);

    switch (text) {
        case '/ruble':

            sendRate(chatId);

            break;

        case '/weather':

            sendWeather(chatId);

            break;

        default:

            sendMessage(chatId, 'Ура! Я скоро буду нормально работать!');
    }
}

function getFullName(firstName, lastName) {
    let name = firstName || '';

    if (lastName) {
        if (name) {
            name += ' ';
        }
        name += lastName;
    }

    return name;
}

function sendMessage(chat_id, text) {
    const params = {
        chat_id,
        text,
        parse_mode: 'HTML'
    };

    makeTelegramRequest(requestMethods.sendMessage, params)
        .then(data => {
            if (!data.ok) {
                console.error(new Error(data.description));
            }
        })
        .catch(error => console.error(error));
}

function sendRate(chatId) {
    var options = {
        hostname: 'query.yahooapis.com',
        port: 443,
        path: '/v1/public/yql?q=select+*+from+yahoo.finance.xchange+where+pair+=+"USDRUB,EURRUB"&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=',
        method: 'GET'
    };

    const processRateSend = function(data) {
        try {
            const rate = data.query.results.rate.reduce((result, rate) => Object.assign(result, {[rate.id]: rate}), {});

            const usd = Math.round((rate['USDRUB'].Rate) * 100) / 100;
            const eur = Math.round((rate['EURRUB'].Rate) * 100) / 100;

            sendMessage(chatId, `Доллар: <b>${usd}</b>,\nЕвро: <b>${eur}</b>`);
        } catch (error) {
            sendError(error);
        }
    };

    const sendError = error => sendMessage(chatId, `Ошибка при получении курса рубля:\n${error}`);

    makeRequest(options).then(processRateSend, sendError);
}

function sendWeather(chatId) {
    var options = {
        hostname: 'api.openweathermap.org',
        port: 80,
        path: `/data/2.5/weather?q=Moscow&units=metric&APPID=${openWeatherMapApiKey}`,
        method: 'GET'
    };

    const processWeatherSend = function(data) {
        try {
            const {main} = data;
            const {temp, pressure, humidity} = main;
            const pressureMmhg = Math.round(pressure * 0.75);

            const tempText = `Температура: <b>${temp}</b> °`;
            const pressureText = `Атмосферное давление: <b>${pressureMmhg}</b> мм`;
            const humidityText = `Влажность: <b>${humidity}</b> %`

            sendMessage(chatId, `Погода в Москве:\n${tempText}\n${humidityText}\n${pressureText}`);
        } catch (error) {
            sendError(error);
        }
    };

    const sendError = error => sendMessage(chatId, `Ошибка при получении погоды:\n${error}`);

    makeRequest(options, true).then(processWeatherSend, sendError);
}
