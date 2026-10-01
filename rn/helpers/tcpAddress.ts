import { ITcpAddress } from '@/interface/stream';

const ADDRESS_REGEX = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d+))?(.*)$/;

/** Splits `ip:port/path` into parts. Everything is null when it does not match. */
export const parseTcpAddress = (input: string): ITcpAddress => {
    const match = ADDRESS_REGEX.exec(input);
    if (!match) return { ip: null, port: null, path: null };

    return { ip: match[1], port: match[2] ?? null, path: match[3] ?? null };
};
