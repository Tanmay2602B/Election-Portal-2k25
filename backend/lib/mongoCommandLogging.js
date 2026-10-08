const collectionCommandFields = {
    aggregate: 'aggregate',
    count: 'count',
    create: 'create',
    createIndexes: 'createIndexes',
    delete: 'delete',
    distinct: 'distinct',
    drop: 'drop',
    dropIndexes: 'dropIndexes',
    find: 'find',
    findAndModify: 'findAndModify',
    insert: 'insert',
    update: 'update',
};

function collectionFromCommand(event) {
    const field = collectionCommandFields[event.commandName];
    const collection = field && event.command?.[field];
    return typeof collection === 'string' ? collection : undefined;
}

export function attachMongoCommandLogging(client, logger = console) {
    if (!client || typeof client.on !== 'function') return;

    const commands = new Map();

    client.on('commandStarted', event => {
        const operation = {
            command: event.commandName,
            database: event.databaseName,
            collection: collectionFromCommand(event),
        };
        commands.set(event.requestId, operation);
        logger.log('[MongoDB]', JSON.stringify({
            event: 'command-started',
            ...operation,
            requestId: event.requestId,
        }));
    });

    client.on('commandSucceeded', event => {
        const operation = commands.get(event.requestId) || { command: event.commandName };
        commands.delete(event.requestId);
        logger.log('[MongoDB]', JSON.stringify({
            event: 'command-succeeded',
            ...operation,
            durationMs: event.duration,
            requestId: event.requestId,
        }));
    });

    client.on('commandFailed', event => {
        const operation = commands.get(event.requestId) || { command: event.commandName };
        commands.delete(event.requestId);
        logger.error('[MongoDB]', JSON.stringify({
            event: 'command-failed',
            ...operation,
            durationMs: event.duration,
            errorName: event.failure?.name,
            errorCode: event.failure?.code,
            requestId: event.requestId,
        }));
    });
}
