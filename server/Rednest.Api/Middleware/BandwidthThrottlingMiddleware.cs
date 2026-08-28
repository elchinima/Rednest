namespace Rednest.Api.Middleware;

public class BandwidthThrottlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly long _maxBytesPerSecond;

    public BandwidthThrottlingMiddleware(RequestDelegate next, long maxBytesPerSecond = 1_048_576)
    {
        _next = next;
        _maxBytesPerSecond = maxBytesPerSecond;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Request.Body = new ThrottledStream(context.Request.Body, _maxBytesPerSecond);

        var originalBody = context.Response.Body;
        var throttledResponse = new ThrottledStream(originalBody, _maxBytesPerSecond);
        context.Response.Body = throttledResponse;

        try
        {
            await _next(context);
        }
        finally
        {
            context.Response.Body = originalBody;
        }
    }
}

internal class ThrottledStream : Stream
{
    private readonly Stream _innerStream;
    private readonly long _maxBytesPerSecond;
    private long _bytesTransferred;
    private readonly Stopwatch _stopwatch;

    public ThrottledStream(Stream innerStream, long maxBytesPerSecond)
    {
        _innerStream = innerStream;
        _maxBytesPerSecond = maxBytesPerSecond;
        _bytesTransferred = 0;
        _stopwatch = Stopwatch.StartNew();
    }

    public override bool CanRead => _innerStream.CanRead;
    public override bool CanSeek => _innerStream.CanSeek;
    public override bool CanWrite => _innerStream.CanWrite;
    public override long Length => _innerStream.Length;
    public override long Position
    {
        get => _innerStream.Position;
        set => _innerStream.Position = value;
    }

    public override void Flush() => _innerStream.Flush();
    public override Task FlushAsync(CancellationToken cancellationToken) => _innerStream.FlushAsync(cancellationToken);
    public override long Seek(long offset, SeekOrigin origin) => _innerStream.Seek(offset, origin);
    public override void SetLength(long value) => _innerStream.SetLength(value);

    public override int Read(byte[] buffer, int offset, int count)
    {
        Throttle(count).GetAwaiter().GetResult();
        var bytesRead = _innerStream.Read(buffer, offset, count);
        _bytesTransferred += bytesRead;
        return bytesRead;
    }

    public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        await Throttle(count);
        var bytesRead = await _innerStream.ReadAsync(buffer, offset, count, cancellationToken);
        _bytesTransferred += bytesRead;
        return bytesRead;
    }

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        await Throttle(buffer.Length);
        var bytesRead = await _innerStream.ReadAsync(buffer, cancellationToken);
        _bytesTransferred += bytesRead;
        return bytesRead;
    }

    public override void Write(byte[] buffer, int offset, int count)
    {
        Throttle(count).GetAwaiter().GetResult();
        _innerStream.Write(buffer, offset, count);
        _bytesTransferred += count;
    }

    public override async Task WriteAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        await Throttle(count);
        await _innerStream.WriteAsync(buffer, offset, count, cancellationToken);
        _bytesTransferred += count;
    }

    public override async ValueTask WriteAsync(ReadOnlyMemory<byte> buffer, CancellationToken cancellationToken = default)
    {
        await Throttle(buffer.Length);
        await _innerStream.WriteAsync(buffer, cancellationToken);
        _bytesTransferred += buffer.Length;
    }

    private async Task Throttle(int pendingBytes)
    {
        if (_maxBytesPerSecond <= 0)
            return;

        var elapsedSeconds = _stopwatch.Elapsed.TotalSeconds;
        if (elapsedSeconds < 0.001)
            return;

        var currentRate = (_bytesTransferred + pendingBytes) / elapsedSeconds;

        if (currentRate > _maxBytesPerSecond)
        {
            var requiredSeconds = (_bytesTransferred + pendingBytes) / (double)_maxBytesPerSecond;
            var delaySeconds = requiredSeconds - elapsedSeconds;

            if (delaySeconds > 0)
            {
                await Task.Delay(TimeSpan.FromSeconds(Math.Min(delaySeconds, 5)));
            }
        }
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
    }

    public override ValueTask DisposeAsync()
    {
        return base.DisposeAsync();
    }
}
