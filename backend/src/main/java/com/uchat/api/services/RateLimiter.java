package com.uchat.api.services;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/** In-memory fixed-window rate limiter keyed by action and client identity. */
@Component
public class RateLimiter {
  private record Window(long start, int count) {}

  private final Map<String, Window> windows = new ConcurrentHashMap<>();
  private final Clock clock;

  public RateLimiter() {
    this(Clock.systemUTC());
  }

  RateLimiter(Clock clock) {
    this.clock = clock;
  }

  public boolean tryAcquire(String action, String key, int limit, Duration period) {
    long now = clock.millis();
    long periodMs = period.toMillis();
    if (windows.size() > 10_000) {
      windows.values().removeIf(w -> now - w.start() >= periodMs);
    }
    boolean[] allowed = {false};
    windows.compute(
        action + ":" + key,
        (k, w) -> {
          if (w == null || now - w.start() >= periodMs) {
            allowed[0] = true;
            return new Window(now, 1);
          }
          if (w.count() < limit) {
            allowed[0] = true;
            return new Window(w.start(), w.count() + 1);
          }
          return w;
        });
    return allowed[0];
  }
}
