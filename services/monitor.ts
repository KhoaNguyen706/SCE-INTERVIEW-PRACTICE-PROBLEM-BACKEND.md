const dotenv = require('dotenv');
dotenv.config();

type MonitorResult = {
    success: boolean;
    message?: string;
    intervalMs?: number;
}

const histories: Map<string, Array<any>> = new Map();
const intervals: Map<string, NodeJS.Timeout> = new Map();

function getFetch() {
    if (typeof (globalThis as any).fetch === 'function') return (globalThis as any).fetch;
    try {
        // Use node-fetch v2 via require for CommonJS compatibility
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('node-fetch');
    } catch (err) {
        throw new Error('fetch is not available. Install node-fetch or run on Node 18+');
    }
}

async function fetchAndStore(symbol: string) {
    const apiKey = process.env.FINNHUB_API_KEY || process.env.API_KEY || '';
    if (!apiKey) {
        console.error('FINNHUB_API_KEY not set in environment');
        return null;
    }

    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    try {
        const f = getFetch();
        const resp = await f(url);
        const data = await resp.json();
        console.log('finnhub response for', symbol, data);
        const record: any = {
            symbol,
            open: data.o,
            high: data.h,
            low: data.l,
            current: data.c,
            previousClose: data.pc,
            fetchedAt: data.t && typeof data.t === 'number' ? data.t : Date.now()
        };

        // If API returns all zeros or no useful data, mark a warning to help debugging
        if ((record.open === 0 && record.high === 0 && record.low === 0 && record.current === 0 && record.previousClose === 0) || (!data || Object.keys(data).length === 0)) {
            record.warning = 'empty-or-zero-data-from-finnhub';
        }

        const hist = histories.get(symbol) || [];
        hist.push(record);
        histories.set(symbol, hist);
        return record;
    } catch (err) {
        console.error('Error fetching data for', symbol, err);
        return null;
    }
}

function startMonitor(symbol: string, minutes: number, seconds: number): MonitorResult {
    if (!symbol || typeof symbol !== 'string' || minutes < 0 || seconds < 0) {
        return { success: false, message: 'Invalid input parameters.' };
    }

    const totalSeconds = (minutes * 60) + seconds;
    const intervalMs = Math.max(1000, totalSeconds * 1000);

    if (intervals.has(symbol)) {
        clearInterval(intervals.get(symbol)!);
    }

    if (!histories.has(symbol)) histories.set(symbol, []);

    fetchAndStore(symbol).catch(() => {});
    const handle = setInterval(() => {
        fetchAndStore(symbol).catch(() => {});
        console.log(`Monitoring ${symbol}...`);
    }, intervalMs);

    intervals.set(symbol, handle);
    console.log(`Monitoring ${symbol} every ${intervalMs}ms`);
    return { success: true, message: `Started monitoring ${symbol}`, intervalMs };
}

function getHistory(symbol: string) {
    return histories.get(symbol) || [];
}

async function refreshNow(symbol: string) {
    return await fetchAndStore(symbol);
}

function stopMonitor(symbol: string) {
    if (intervals.has(symbol)) {
        clearInterval(intervals.get(symbol)!);
        intervals.delete(symbol);
        return { success: true, message: `Stopped monitoring ${symbol}` };
    }
    return { success: false, message: `No active monitor for ${symbol}` };
}

function deleteHistory(symbol: string) {
    if (!symbol || typeof symbol !== 'string') return { success: false, message: 'symbol is required' };
    if (histories.has(symbol)) {
        histories.delete(symbol);
        return { success: true, message: `Deleted history for ${symbol}` };
    }
    return { success: false, message: `No history for ${symbol}` };
}

module.exports = { startMonitor, getHistory, refreshNow, stopMonitor, deleteHistory };