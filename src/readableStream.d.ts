// DO NOT REMOVE!! this makes the compiler happy
interface ReadableStream<R = any> {
	[Symbol.asyncIterator](): AsyncIterableIterator<R>;
}

