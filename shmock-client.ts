#!/usr/bin/env -S bun --silent
import net from 'node:net';

const socketPath = '.shmocks/shmock.sock';

const socket = net.createConnection(socketPath, () => {
    socket.setEncoding('utf8');
    const argv = process.argv.slice();
    const runner = argv.shift();
    const command = argv.shift()!.split('/').pop();
    const invocation = JSON.stringify({
        command,
        args: argv,
    });
    socket.on('data', (data: string) => {
        data.split('\n').forEach((message) => {
            if (!message) {
                return;
            }
            const json = JSON.parse(message);
            switch (json.stream) {
                case 'stdout':
                    console.log(...json.args);
                    break;
                case 'stderr':
                    console.error(...json.args);
                    break;
            }
            if (json.exit !== undefined) {
                process.exit(json.exit);
            }
        });
    });
    socket.write(invocation);
});
