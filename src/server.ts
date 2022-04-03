require('dotenv').config();
import WebSocket from 'ws';
import fetch from 'node-fetch';
import isEqual from 'lodash.isequal';

const BLAZE_WS_URL = "wss://api-v2.blaze.com/replication/?EIO=3&transport=websocket"
const BOT_TELEGRAM_TOKEN = process.env.BOT_TELEGRAM_TOKEN;
let conectarWS = true;
let webSocket: WebSocket;
let webSocketHeartBeatTimeout: NodeJS.Timeout;
const sequenceCrashPoints:number[] = [];
let monitorarProximosJogos = 0;
let banca = Number.parseInt(process.env.BANCA_INICIAL || '100');
const STAKE_INICIAL = Number.parseInt(process.env.STAKE || '4');
let stake = STAKE_INICIAL;

import patterns from "./patterns.json";

export function wsForcarDesconectar() {
	conectarWS = false;
	webSocket.close();
}

export function wsConectar() {
	conectarWS = true;
	webSocket = new WebSocket(BLAZE_WS_URL)
	//Definindo metodo chamado apos a abertura da conexao
	const handleOpen = () => {
		if (webSocket.readyState == webSocket.OPEN) {
			webSocket.send(`420["cmd",{"id":"subscribe","payload":{"room":"crash"}}]`);
			heartbeat();
		}
		else { setTimeout(handleOpen, 5000); }
	}
	webSocket.onopen = handleOpen;

	//Definindo metodo chamado quando a conexao e fechada
	webSocket.onclose = function (event: any) {
		console.log("Websocket desconectado.", event);
		if (webSocketHeartBeatTimeout) {
			clearInterval(webSocketHeartBeatTimeout);
		}
		if (conectarWS) {
			console.log("Tentando reconectar... ", event);
			setTimeout(function () {
				wsConectar();
			}, 10000);
		}
	};

	//Definindo metodo chamado quando a conexao e fechada
	webSocket.onerror = function (event: any) {
		console.log("Erro na websocket. Tentando reconectar... ", event);
		enviarMsgTg("Erro na websocket. Tentando reconectar...");
		setTimeout(function () {
			wsConectar();
		}, 10000);
	};

	//Definindo metodo chamado apenas o recebimento de uma mensagem
	webSocket.onmessage = function (event) {
		if (event != null && event != undefined && event.data != null && event.data != undefined) {
			wsReceberMensagem(event.data);
		}
		else { console.log("Mensagem invalida recebida", event); }
	};
}

function wsReceberMensagem(valor: WebSocket.Data) {
	// var json = (typeof valor === "string") ? JSON.parse(valor) : valor;
	if(typeof valor === "string" && !valor.includes('crash.bet')) {
		const dataJson = parseMsg(valor);
		if(dataJson && dataJson.id === 'crash.update') {
			handleUpdate(dataJson);
		}
	}
}

const heartbeat = () => {
	clearInterval(webSocketHeartBeatTimeout);

	// Use `WebSocket#terminate()`, which immediately destroys the connection,
	// instead of `WebSocket#close()`, which waits for the close timer.
	// Delay should be equal to the interval at which your server
	// sends out pings plus a conservative assumption of the latency.
	webSocketHeartBeatTimeout = setInterval(() => {
		webSocket.send(2);
	}, 20000 + 1000);
}

function parseMsg(valor: string) {
	const regex = /(\d+)(?:\[(.*)\])?/gm;
	const matches = regex.exec(valor);
	if(!matches) return;
	const [,code, content] = matches;

	let codeNumber = parseInt(code);
	if(codeNumber === 0) { console.log('0:Handshake realizado')}
	else if(codeNumber === 40) { console.log('40:Iniciando Stream...')}
	else if(codeNumber === 430) { console.log('430:Conectado no crash...')}
	else if(codeNumber === 3) { }//console.log('3:Pong')}
	else if(codeNumber === 42) { }//console.log('42:crash events')}
	else { console.log(code, content); }

	if(content?.startsWith(`"data"`)) {
		const json = content.substring(7);
		return JSON.parse(json);
	}
}

function handleUpdate(data: any) {
	// console.log(data);
	if(data.payload.status === 'complete') {
		const crashPoint = parseInt(data.payload.crash_point.split(".")[0]);
		if(monitorarProximosJogos > 0) {
			if(crashPoint >= 2) {
				banca += stake * 2;
				stake = STAKE_INICIAL;
				enviaGreen();
				monitorarProximosJogos = 0;
			} else {
				monitorarProximosJogos--;
				if(monitorarProximosJogos == 0) { 
					enviaLost();
					stake = STAKE_INICIAL;
				}
				else { 
					stake *= 2;
					banca -= stake;
				}
			}
		}
		if(sequenceCrashPoints.unshift(crashPoint) > 3) {
			sequenceCrashPoints.splice(3, 1);
		}
		console.log(sequenceCrashPoints)
		if(patterns.some(p => isEqual(p, sequenceCrashPoints.slice(0,2) || isEqual(p, sequenceCrashPoints)))) {
			enviaJogada(crashPoint);
			banca -= stake;
			monitorarProximosJogos = 3;
		}
	}
}
async function enviaJogada(crashPoint: number) {
	const msg = `Entrar após o -> ${crashPoint}x\n🤑Auto retirar no 1.90x\n📌Realizar 2 MartinGales`;
	console.log(msg);
	enviarMsgTg(msg);
	enviarMsgTg(msg, '130499250');
}
async function enviaGreen() {
	const numMartinGales = (3-monitorarProximosJogos);
	const msg = `✅ <b>Green ${numMartinGales > 0 ? "após " + numMartinGales + " MartinGale": ""}!</b> 🤑💰`;
	console.log(msg);
	enviarMsgTg(msg + "\nBanca: " + banca);
	enviarMsgTg(msg, '130499250');
}
async function enviaLost() {
	const msg = `😪 LOSS! Bora recuperar 🚀`;
	console.log(msg);
	enviarMsgTg(msg + "\nBanca: " + banca);
	enviarMsgTg(msg, '130499250');
}

async function enviarMsgTg(mensagem: string, chatId: string='163786145') {
	const tgMsg = {
		chat_id: chatId,
		text: mensagem,
		parse_mode: 'html',
		disable_web_page_preview: true
	}
	const response = await fetch(`https://api.telegram.org/bot${BOT_TELEGRAM_TOKEN}/sendMessage`, {
		method:'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: JSON.stringify(tgMsg)
	});
	if(!response.ok) {
		console.error(await response.text());
	}
}

wsConectar();

