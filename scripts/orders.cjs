const { parseArgs } = require('node:util');
const { createOrderStore } = require('../backend/order-store.cjs');
const { createOrderMaintenance, readBackup, summarize } = require('../backend/order-maintenance.cjs');

const help = `注文データの管理

  npm run orders:status
  npm run orders:backup  -- [--output FILE]
  npm run orders:verify  -- --file FILE
  npm run orders:restore -- --file FILE --yes
  npm run orders:reset   -- --yes [--keep-counter]
  npm run orders:export  -- [--output FILE]

共通オプション: --data-dir DIR / --backup-dir DIR / --help
初期化・復元は変更前のデータを自動バックアップします。
--yes がない初期化・復元は現在のデータを変更しません。
`;

async function main(args = process.argv.slice(2)) {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
        help: { type: 'boolean', short: 'h' }, yes: { type: 'boolean' },
        'keep-counter': { type: 'boolean' }, 'data-dir': { type: 'string' },
        'backup-dir': { type: 'string' }, output: { type: 'string' }, file: { type: 'string' }
    } });
    if (values.help || positionals.length === 0) { console.log(help); return; }
    const [command] = positionals;
    if (positionals.length !== 1 || !['status', 'backup', 'verify', 'restore', 'reset', 'export'].includes(command)) {
        throw new Error('不明なコマンドです。--help を参照してください。');
    }
    for (const [option, allowed] of Object.entries({ output: ['backup', 'export'], file: ['verify', 'restore'], 'keep-counter': ['reset'], yes: ['reset', 'restore'] })) {
        if (values[option] !== undefined && !allowed.includes(command)) throw new Error(`${command} では --${option} を使用できません。`);
    }
    if (['restore', 'verify'].includes(command) && !values.file) throw new Error('--file でバックアップファイルを指定してください。');
    if (['reset', 'restore'].includes(command) && !values.yes) {
        throw new Error('初期化・復元を実行するには --yes を指定してください。変更前の自動バックアップも作成されます。');
    }
    if (command === 'verify') {
        const backup = readBackup(values.file);
        console.log(JSON.stringify({ file: values.file, valid: true, createdAt: backup.createdAt, ...summarize(backup.data) }, null, 2));
        return;
    }
    const store = createOrderStore({ dataDir: values['data-dir'] });
    const maintenance = createOrderMaintenance({ store, backupDir: values['backup-dir'] });
    const actions = {
        status: () => maintenance.status(), backup: () => maintenance.backup(values.output),
        restore: () => maintenance.restore(values.file), reset: () => maintenance.reset({ keepCounter: !!values['keep-counter'] }),
        export: () => maintenance.exportCsv(values.output)
    };
    console.log(JSON.stringify(await actions[command](), null, 2));
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { main };
