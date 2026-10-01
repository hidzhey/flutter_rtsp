import { QUEUE_DROP_MS, RequestTypeEnum } from '@/constant/serverWorker';

export interface IRequestItem {
    type: RequestTypeEnum;
    /** Sends the bytes. Called when this request reaches the front. */
    send: () => void;
}

/**
 * One request at a time, because the device answers that way: a reply carries
 * no id, so the only way to know what it belongs to is to have asked once.
 *
 * Same shape as the BC2 app's `core/requestQueue.ts`, trimmed to what this app
 * sends. A request that goes unanswered past the timeout is not retried here:
 * it calls back, and the worker decides whether that means a dead socket.
 */
export class RequestQueue {
    private queue: IRequestItem[] = [];

    private timeout: ReturnType<typeof setTimeout> | undefined;

    private readonly onTimeout: () => void;

    isRequestRunning = false;

    answerFor: IRequestItem | null = null;

    constructor(onTimeout: () => void) {
        this.onTimeout = onTimeout;
    }

    get length(): number {
        return this.queue.length;
    }

    /** Whether a request of this type is already waiting to be sent. */
    isInQueue(type: RequestTypeEnum): boolean {
        return this.queue.some(item => item.type === type);
    }

    push(item: IRequestItem): void {
        this.queue.push(item);
        this.tryToCallQueue();
    }

    tryToCallQueue(): void {
        if (this.isRequestRunning || this.queue.length === 0) return;

        const request = this.queue.shift() as IRequestItem;
        this.isRequestRunning = true;
        this.answerFor = request;

        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.onTimeout, QUEUE_DROP_MS);

        request.send();
    }

    /** An answer arrived. Frees the line and starts whatever is next. */
    resolve(): void {
        clearTimeout(this.timeout);
        this.timeout = undefined;
        this.answerFor = null;
        this.isRequestRunning = false;
        this.tryToCallQueue();
    }

    clear(): void {
        clearTimeout(this.timeout);
        this.timeout = undefined;
        this.queue = [];
        this.answerFor = null;
        this.isRequestRunning = false;
    }
}
