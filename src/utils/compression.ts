// Decompresses gzipped data and returns Uint8Array
export async function ungzipBlob(compressed: Uint8Array): Promise<Uint8Array> {
    const decompressedStream = new DecompressionStream('gzip');
    const decompressed = await new Response(
        new Blob([compressed]).stream().pipeThrough(decompressedStream)
    ).arrayBuffer();
    return new Uint8Array(decompressed);
}