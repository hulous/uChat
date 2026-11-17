package com.uchat.api.configurations;

import com.uchat.api.services.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
  static final int LOGIN_LIMIT = 10;
  static final int REGISTER_LIMIT = 5;
  static final Duration PERIOD = Duration.ofMinutes(1);

  private final RateLimiter rateLimiter;

  public AuthRateLimitFilter(RateLimiter rateLimiter) {
    this.rateLimiter = rateLimiter;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    return !"POST".equals(request.getMethod()) || limitFor(request.getRequestURI()) == 0;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String path = request.getRequestURI();
    if (!rateLimiter.tryAcquire(path, request.getRemoteAddr(), limitFor(path), PERIOD)) {
      response.setStatus(429);
      response.setHeader("Retry-After", String.valueOf(PERIOD.toSeconds()));
      response.setContentType("application/json");
      response.getWriter().write("{\"message\":\"Too many requests, please try again later\"}");
      return;
    }
    chain.doFilter(request, response);
  }

  private int limitFor(String path) {
    return switch (path) {
      case "/api/auth/login" -> LOGIN_LIMIT;
      case "/api/auth/register" -> REGISTER_LIMIT;
      default -> 0;
    };
  }
}
