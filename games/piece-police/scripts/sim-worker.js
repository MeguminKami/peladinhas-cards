// Worker do simulador: corre uma fatia de rondas de um modo e devolve as métricas.
import { parentPort, workerData } from 'node:worker_threads';
import { runMode } from '../src/simulation.js';
import { seedState } from '../src/random.js';

const { mode, rounds, seed, desligar } = workerData;
const st = runMode(mode, rounds, seedState(seed), (done) => parentPort.postMessage({ type: 'progress', done }), desligar || []);
parentPort.postMessage({ type: 'done', stats: st.toJSON() });
