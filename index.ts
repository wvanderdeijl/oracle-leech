// tslint:disable-next-line:no-reference
/// <reference path="./types.d.ts" />

import oracledb from 'oracledb';
import promiseRetry from 'promise-retry';

import SegfaultHandler from 'segfault-handler';
SegfaultHandler.registerHandler('crash.log');

const config: oracledb.IConnectionAttributes = {
    connectString: 'oracle/EE.oracle.docker',
    password: 'oracle',
    user: 'system',
};

oracledb.autoCommit = true;

const cqn: oracledb.ISubscribeOptions = {
    callback: cqnCallback,
    qos: oracledb.SUBSCR_QOS_ROWIDS, // Return ROWIDs in the notification message
    sql: 'select * from demo',
};

// tslint:disable:no-console

runTest();

let deregister = () => { /* noop */ };

async function runTest() {
    const conn = await promiseRetry({ retries: 100 }, async (retry) => {
        console.log('trying to get connection...');
        try {
            return await oracledb.getConnection({ ...config, events: true });
        } catch (e) {
            retry(e);
            throw e;
        }
    });
    try {

        try {
            await conn.execute('drop table demo purge');
            console.log('dropped existing demo table');
        } catch { /* noop */ }

        await conn.execute(`
            create table demo (id constraint demo_pk primary key, txt)
            as select rownum, 'x' from xmltable('1 to 1000000')
        `);
        console.log('created demo table');

        await conn.subscribe('mysub', cqn);
        console.log('subscription created');
        deregister = () => { conn.unsubscribe('mysub'); };

    } catch (e) {
        console.error(e);
        throw e;
    } finally {
        await conn.close();
    }
}

function cqnCallback(message: oracledb.ISubscriptionMessage) {
    console.log(`>> callback of type ${message.type}`);
}

function terminate() {
    console.log('Unregister CQN...');
    deregister();
    console.log('Terminating...');
    process.exit(0);
}

process.on('SIGTERM', terminate);
process.on('SIGINT', terminate);

declare module 'oracledb' {

    interface IConnectionAttributes {
        /** Determines whether Oracle Client events mode should be enabled */
        events?: boolean;
    }

    interface IConnection {
        subscribe(name: string, options: ISubscribeOptions, callback: (err: any) => void): void;
        subscribe(name: string, options: ISubscribeOptions): IPromise<void>;
        unsubscribe(name: string, callback: (err: any) => void): void;
        unsubscribe(name: string): IPromise<void>;
    }

    interface ISubscribeOptions {
        /**
         * An array (bind by position) or object (bind by name) containing the bind values
         * to use in the sql property.
         */
        binds?: object | any[];
        /**
         * The notification callback that will be called whenever notifications are sent by the database.
         * It accepts one parameter which contains details of the notification.
         */
        callback?: (message: ISubscriptionMessage) => void;
        /**
         * An integer mask which currently, if set, can only contain the value
         * oracledb.SUBSCR_GROUPING_CLASS_TIME. If this value is set then notifications are grouped by
         * time into a single notification
         */
        groupingClass?: number;
        /**
         * Either oracledb.SUBSCR_GROUPING_TYPE_SUMMARY (the default) indicating notifications should be grouped
         * in a summary, or oracledb.SUBSCR_GROUPING_TYPE_LAST indicating the last notification in the group
         * should be sent.
         */
        groupingType?: number;
        /**
         * If groupingClass contains oracledb.SUBSCR_GROUPING_CLASS_TIME then groupingValue can be used to set
         * the number of seconds over which notifications will be grouped together, invoking callback once.
         * If groupingClass is not set, then groupingValue is ignored.
         */
        groupingValue?: number;
        /**
         * A string containing an IPv4 or IPv6 address on which the subscription should listen to receive
         * notifications. If not specified, then the Oracle Client library will select an IP address.
         */
        ipAddress?: string;
        /**
         * One of the oracledb.SUBSCR_NAMESPACE_AQ or oracledb.SUBSCR_NAMESPACE_DBCHANGE (the default) constants.
         *
         * You can use oracledb.SUBSCR_NAMESPACE_AQ to get notifications that Advanced Queuing messages are
         * available to be dequeued. Note Advanced Queuing enqueue and dequeue methods are not supported yet.
         */
        namespace?: number;
        /**
         * An integer mask containing one or more of the operation type oracledb.CQN_OPCODE_* constants to
         * indicate what types of database change should generation notifications
         */
        operations?: number;
        /**
         * The port number on which the subscription should listen to receive notifications. If not specified,
         * then the Oracle Client library will select a port number.
         */
        port?: number;
        /**
         * An integer mask containing one or more of the quality of service oracledb.CQN_QOS_* constants.
         */
        qos?: number;
        /**
         * The SQL query string to use for notifications
         */
        sql?: string;
        /**
         * The number of seconds the subscription should remain active. Once this length of time has been
         * reached, the subscription is automatically unregistered and a deregistration notification is sent.
         */
        timeout?: number;
    }

    type ISubscriptionMessage =
        ISubscriptionMessageAQ | ISubscriptionMessageDereg |
        ISubscriptionMessageObjChange | ISubscriptionMessageQueryChange;
    interface ISubscriptionMessageAQ {
        type: 100;
        /**
         * the name of the database which sent a notification. This property is only defined for CQN. It is
         * not defined when type is oracledb.SUBSCR_EVENT_TYPE_DEREG
         */
        dbName?: string;
        /**
         * a boolean indicating whether the subscription is registerd with the database. Will be false if
         * type is oracledb.SUBSCR_EVENT_TYPE_DEREG or if the subscription was created with the qos property
         * set to oracledb.SUBSCR_QOS_DEREG_NFY.
         */
        registered: boolean;
        /** a buffer containing the identifier of the transaction which spawned the notification. */
        txId: Buffer;
    }
    interface ISubscriptionMessageDereg {
        type: 5;
        /**
         * a boolean indicating whether the subscription is registerd with the database. Will be false if
         * type is oracledb.SUBSCR_EVENT_TYPE_DEREG or if the subscription was created with the qos property
         * set to oracledb.SUBSCR_QOS_DEREG_NFY.
         */
        registered: false;
        /** a buffer containing the identifier of the transaction which spawned the notification. */
        txId: Buffer;
    }
    interface ISubscriptionMessageObjChange {
        type: 6;
        /**
         * the name of the database which sent a notification. This property is only defined for CQN. It is
         * not defined when type is oracledb.SUBSCR_EVENT_TYPE_DEREG
         */
        dbName?: string;
        /**
         * a boolean indicating whether the subscription is registerd with the database. Will be false if
         * type is oracledb.SUBSCR_EVENT_TYPE_DEREG or if the subscription was created with the qos property
         * set to oracledb.SUBSCR_QOS_DEREG_NFY.
         */
        registered: boolean;
        /**
         * an array of objects specifying the tables which were affected by the notification. This is only
         * defined if type is oracledb.SUBSCR_EVENT_TYPE_OBJ_CHANGE.
         */
        tables: ITableChangeNotification[];
        /** a buffer containing the identifier of the transaction which spawned the notification. */
        txId: Buffer;
    }
    interface ISubscriptionMessageQueryChange {
        type: 7;
        /**
         * the name of the database which sent a notification. This property is only defined for CQN. It is
         * not defined when type is oracledb.SUBSCR_EVENT_TYPE_DEREG
         */
        dbName?: string;
        /**
         * an array of objects specifying the queries which were affected by the Query Change notification.
         * This is only defined if the type key is the value oracledb.SUBSCR_EVENT_TYPE_QUERY_CHANGE
         */
        queries: Array<{ tables: ITableChangeNotification[] }>;
        /**
         * a boolean indicating whether the subscription is registerd with the database. Will be false if
         * type is oracledb.SUBSCR_EVENT_TYPE_DEREG or if the subscription was created with the qos property
         * set to oracledb.SUBSCR_QOS_DEREG_NFY.
         */
        registered: boolean;
        /** a buffer containing the identifier of the transaction which spawned the notification. */
        txId: Buffer;
    }

    interface ITableChangeNotification {
        /** the name of the table which was modified in some way. */
        name: string;
        /** an integer mask composed of one or more values of the CQN_OPCODE_* constants */
        operation: number;
        /**
         * an array of objects specifying the rows which were changed. This will only be defined if the
         * qos quality of service used when creating the subscription indicated the desire for ROWIDs
         * and no summary grouping took place
         */
        rows?: IRowChangeNotification[];
    }

    interface IRowChangeNotification {
        /**
         * an integer which is one of oracledb.CQN_OPCODE_INSERT, oracledb.CQN_OPCODE_UPDATE,
         * oracledb.CQN_OPCODE_DELETE as described earlier
         */
        operation: number;
        /** a string containing the ROWID of the row that was affected */
        rowid: string;
    }

    // https://oracle.github.io/node-oracledb/doc/api.html#oracledbconstantssubscription

    // Constants for the Continuous Query Notification message.type

    /** Advanced Queuing notifications are being used */
    const SUBSCR_EVENT_TYPE_AQ = 100;
    /** A subscription has been closed or the timeout value has been reached */
    const SUBSCR_EVENT_TYPE_DEREG = 5;
    /** Object-level notications are being used (Database Change Notification) */
    const SUBSCR_EVENT_TYPE_OBJ_CHANGE = 6;
    /** Query-level notifications are being used (Continuous Query Notification) */
    const SUBSCR_EVENT_TYPE_QUERY_CHANGE = 7;

    // Constant for the Continuous Query Notification groupingClass

    /** Group notifications by time into a single notification */
    const SUBSCR_GROUPING_CLASS_TIME = 1;

    // Constants for the Continuous Query Notification groupingType

    /** A summary of the grouped notifications is sent */
    const SUBSCR_GROUPING_TYPE_SUMMARY = 1;
    /** The last notification in the group is sent */
    const SUBSCR_GROUPING_TYPE_LAST = 2;

    // Constants for the Continuous Query Notification qos Quality of Service

    /**
     * When best effort filtering for query result set changes is acceptable.
     * False positive notifications may be received. This behavior may be suitable for caching applications.
     */
    const SUBSCR_QOS_BEST_EFFORT = 16;
    /** The subscription will be automatically unregistered as soon as the first notification is received. */
    const SUBSCR_QOS_DEREG_NFY = 2;
    /**
     * Continuous Query Notification will be used instead of Database Change Notification. This means that
     * notifications are only sent if the result set of the registered query changes. By default no false
     * positive notifications are generated. Use oracledb.SUBSCR_QOS_BEST_EFFORT if this is not needed
     */
    const SUBSCR_QOS_QUERY = 8;
    /** Notifications are not lost in the event of database failure. */
    const SUBSCR_QOS_RELIABLE = 1;
    /** Notifications include the ROWIDs of the rows that were affected */
    const SUBSCR_QOS_ROWIDS = 4;

    // Constants for the Continuous Query Notification namespace

    /** For Advanced Queuing notifications. Note AQ enqueue and dequeue methods are not supported in node-oracledb */
    const SUBSCR_NAMESPACE_AQ = 1;
    /** For Continuous Query Notifications */
    const SUBSCR_NAMESPACE_DBCHANGE = 2;

    // https://oracle.github.io/node-oracledb/doc/api.html#-318-continuous-query-notification-constants

    /** Default. Used to request notification of all operations. */
    const CQN_OPCODE_ALL_OPS = 0;
    /**
     * Indicates that row information is not available. This occurs if the qos quality of service flags do
     * not specify the desire for ROWIDs, or if grouping has taken place and summary notifications are being sent.
     */
    const CQN_OPCODE_ALL_ROWS = 1;
    /** Set if the table was altered in the notifying transaction */
    const CQN_OPCODE_ALTER = 16;
    /** Set if the notifying transaction included deletes on the table */
    const CQN_OPCODE_DELETE = 8;
    /** Set if the table was dropped in the notifying transaction */
    const CQN_OPCODE_DROP = 32;
    /** Set if the notifying transaction included inserts on the table */
    const CQN_OPCODE_INSERT = 2;
    /** Set if the notifying transaction included updates on the table */
    const CQN_OPCODE_UPDATE = 4;
}
