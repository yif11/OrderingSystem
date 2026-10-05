const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

let windowsApi;

function loadWindowsApi() {
    if (process.platform !== 'win32') {
        throw new Error('直接印刷には、NECプリンタを登録したWindowsが必要です。');
    }
    if (windowsApi) return windowsApi;

    const koffi = require('koffi');
    const spool = koffi.load('winspool.drv');
    const kernel = koffi.load('kernel32.dll');
    const documentInfo = koffi.struct('ORDER_DOC_INFO_1W', {
        pDocName: 'str16', pOutputFile: 'str16', pDatatype: 'str16'
    });
    windowsApi = {
        OpenPrinter: spool.func('int __stdcall OpenPrinterW(str16 name, _Out_ void **handle, void *defaults)'),
        StartDocPrinter: spool.func('__stdcall', 'StartDocPrinterW', 'uint32', ['void *', 'uint32', koffi.pointer(documentInfo)]),
        StartPagePrinter: spool.func('int __stdcall StartPagePrinter(void *handle)'),
        WritePrinter: spool.func('int __stdcall WritePrinter(void *handle, const void *data, uint32 length, _Out_ uint32 *written)'),
        EndPagePrinter: spool.func('int __stdcall EndPagePrinter(void *handle)'),
        EndDocPrinter: spool.func('int __stdcall EndDocPrinter(void *handle)'),
        AbortPrinter: spool.func('int __stdcall AbortPrinter(void *handle)'),
        ClosePrinter: spool.func('int __stdcall ClosePrinter(void *handle)'),
        GetLastError: kernel.func('uint32 __stdcall GetLastError()')
    };
    return windowsApi;
}

// Run all Win32 calls on one worker thread: GetLastError is thread-local and
// spooler calls can block. The HTTP server stays responsive during printing.
function writeRaw(data, printerName, documentName, api = loadWindowsApi()) {
    const check = (result, operation) => {
        if (!result) {
            const code = api.GetLastError();
            throw new Error(`${operation}: Windowsエラー ${code} (${printerName})`);
        }
        return result;
    };
    const handleOut = [null];
    check(api.OpenPrinter(printerName, handleOut, null), 'OpenPrinter');
    const handle = handleOut[0];
    let documentStarted = false;
    try {
        const jobId = check(api.StartDocPrinter(handle, 1, {
            pDocName: documentName, pOutputFile: null, pDatatype: 'RAW'
        }), 'StartDocPrinter');
        documentStarted = true;
        check(api.StartPagePrinter(handle), 'StartPagePrinter');
        let offset = 0;
        while (offset < data.length) {
            const written = [0];
            const chunk = data.subarray(offset, Math.min(offset + 65536, data.length));
            check(api.WritePrinter(handle, chunk, chunk.length, written), 'WritePrinter');
            if (written[0] <= 0 || written[0] > chunk.length) {
                throw new Error('WritePrinter: 印刷データを送信できませんでした。');
            }
            offset += written[0];
        }
        check(api.EndPagePrinter(handle), 'EndPagePrinter');
        check(api.EndDocPrinter(handle), 'EndDocPrinter');
        documentStarted = false;
        return { jobId, printerName, bytes: offset };
    } finally {
        try {
            if (documentStarted) api.AbortPrinter(handle);
        } finally {
            api.ClosePrinter(handle);
        }
    }
}

function submitRaw(data, printerName, documentName) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
            workerData: { type: 'print-order', data, printerName, documentName }
        });
        let reported = false;
        worker.once('message', (message) => {
            reported = true;
            if (message.error) reject(new Error(message.error));
            else resolve(message.result);
        });
        worker.once('error', reject);
        worker.once('exit', (code) => {
            if (!reported) reject(new Error(`印刷処理が終了しました (code ${code})。`));
        });
    });
}

if (!isMainThread && workerData?.type === 'print-order') {
    try {
        const result = writeRaw(Buffer.from(workerData.data), workerData.printerName, workerData.documentName);
        parentPort.postMessage({ result });
    } catch (error) {
        parentPort.postMessage({ error: error.message });
    }
}

module.exports = { loadWindowsApi, writeRaw, submitRaw };
