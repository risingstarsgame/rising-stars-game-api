/**
 * Compresses a JSON-serializable value using gzip and returns a Uint8Array.
 */
export async function gzipJson<T>(data: T): Promise<Uint8Array> {
    const jsonString = JSON.stringify(data);
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    writer.write(encoder.encode(jsonString));
    writer.close();
    const compressed = await new Response(stream.readable).arrayBuffer();
    return new Uint8Array(compressed);
}

/**
 * Decompresses a gzipped Uint8Array and parses it as JSON.
 */
export async function ungzipJson<T>(compressed: Uint8Array): Promise<T> {
    const decompressedStream = new DecompressionStream('gzip');
    const decompressed = await new Response(
        new Blob([compressed]).stream().pipeThrough(decompressedStream)
    ).arrayBuffer();
    const jsonString = new TextDecoder().decode(decompressed);
    return JSON.parse(jsonString) as T;
}