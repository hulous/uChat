import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { vi } from "vitest";
import { AuthService } from "./auth";

describe("AuthenticationService", () => {
  let service: AuthService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    httpTestingController.verify();
    localStorage.clear();
  });

  it("posts credentials and stores the authentication response with its expiration timestamp", () => {
    const credentials = { email: "client@example.com", password: "secret" };
    const response = { token: "jwt-token", expiresIn: 3600 };
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    service.login(credentials).subscribe((loginResponse) => {
      expect(loginResponse).toEqual(response);
      expect(service.getToken()).toBe(response.token);
      expect(service.getEmail()).toBe(credentials.email);
      expect(JSON.parse(localStorage.getItem("uchat.authentication")!)).toEqual(
        {
          ...response,
          email: credentials.email,
          expiresAt: now + response.expiresIn,
        },
      );
    });

    const request = httpTestingController.expectOne("/api/auth/login");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual(credentials);
    request.flush(response);
  });

  it("reports an expired authentication as unauthenticated", () => {
    localStorage.setItem(
      "uchat.authentication",
      JSON.stringify({
        token: "jwt-token",
        expiresIn: 3600,
        email: "client@example.com",
        expiresAt: 1000,
      }),
    );

    expect(service.isAuthenticated()).toBeFalse();
  });

  it("reports a valid authentication as authenticated", () => {
    localStorage.setItem(
      "uchat.authentication",
      JSON.stringify({
        token: "jwt-token",
        email: "client@example.com",
        expiresAt: Date.now() + 3600,
      }),
    );

    expect(service.isAuthenticated()).toBeTruthy();
    expect(service.getToken()).toBe("jwt-token");
  });

  it("clears malformed persisted authentication data", () => {
    localStorage.setItem("uchat.authentication", "not-json");

    expect(service.getToken()).toBeNull();
    expect(service.getEmail()).toBeNull();
    expect(localStorage.getItem("uchat.authentication")).toBeNull();
  });

  it("posts registration details without changing authentication state", () => {
    const request = {
      name: "Client",
      email: "client@example.com",
      password: "secret123",
    };
    const response = { id: "user-1", name: request.name, email: request.email };

    service.register(request).subscribe((registrationResponse) => {
      expect(registrationResponse).toEqual(response);
    });

    const httpRequest = httpTestingController.expectOne("/api/auth/register");
    expect(httpRequest.request.method).toBe("POST");
    expect(httpRequest.request.body).toEqual(request);
    httpRequest.flush(response);

    expect(service.getToken()).toBeNull();
  });

  it("clears the stored authentication on logout", () => {
    localStorage.setItem(
      "uchat.authentication",
      JSON.stringify({
        token: "jwt-token",
        expiresIn: 3600,
        email: "client@example.com",
      }),
    );

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(service.getEmail()).toBeNull();
  });
});
