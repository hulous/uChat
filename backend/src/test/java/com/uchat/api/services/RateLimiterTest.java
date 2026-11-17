package com.uchat.api.services;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RateLimiterTest {
  private static final class MutableClock extends Clock {
    long now = 0;

    public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
    public Clock withZone(java.time.ZoneId zone) { return this; }
    public Instant instant() { return Instant.ofEpochMilli(now); }
  }

  @Test
  void blocksAfterLimitAndResetsAfterWindow() {
    MutableClock clock = new MutableClock();
    RateLimiter limiter = new RateLimiter(clock);
    Duration minute = Duration.ofMinutes(1);

    assertTrue(limiter.tryAcquire("a", "k", 2, minute));
    assertTrue(limiter.tryAcquire("a", "k", 2, minute));
    assertFalse(limiter.tryAcquire("a", "k", 2, minute));
    assertTrue(limiter.tryAcquire("a", "other", 2, minute));
    assertTrue(limiter.tryAcquire("b", "k", 2, minute));

    clock.now = 60_000;
    assertTrue(limiter.tryAcquire("a", "k", 2, minute));
  }
}
