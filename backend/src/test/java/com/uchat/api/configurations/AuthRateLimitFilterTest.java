package com.uchat.api.configurations;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.uchat.api.services.RateLimiter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthRateLimitFilterTest {
  private int call(AuthRateLimitFilter filter, String method, String uri) throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
    request.setRemoteAddr("1.2.3.4");
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, new MockFilterChain());
    return response.getStatus();
  }

  @Test
  void limitsLogin() throws Exception {
    AuthRateLimitFilter filter = new AuthRateLimitFilter(new RateLimiter());
    for (int i = 0; i < AuthRateLimitFilter.LOGIN_LIMIT; i++) {
      assertEquals(200, call(filter, "POST", "/api/auth/login"));
    }
    assertEquals(429, call(filter, "POST", "/api/auth/login"));
    assertEquals(200, call(filter, "GET", "/api/auth/me"));
  }

  @Test
  void limitsRegister() throws Exception {
    AuthRateLimitFilter filter = new AuthRateLimitFilter(new RateLimiter());
    for (int i = 0; i < AuthRateLimitFilter.REGISTER_LIMIT; i++) {
      assertEquals(200, call(filter, "POST", "/api/auth/register"));
    }
    assertEquals(429, call(filter, "POST", "/api/auth/register"));
  }
}
