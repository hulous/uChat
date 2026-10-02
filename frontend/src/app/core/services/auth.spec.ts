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

  it("clears corrupted stored authentication", () => {
    localStorage.setItem("uchat.authentication", "not-json");

    expect(service.getToken()).toBeNull();
    expect(service.getEmail()).toBeNull();
    expect(localStorage.getItem("uchat.authentication")).toBeNull();
  });

  it("reports a non-expired authentication as authenticated", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    localStorage.setItem(
      "uchat.authentication",
      JSON.stringify({
        token: "jwt-token",
        expiresIn: 3600,
        email: "client@example.com",
        expiresAt: 1001,
      }),
    );

    expect(service.isAuthenticated()).toBeTruthy();
    expect(service.getToken()).toBe("jwt-token");
    expect(service.getEmail()).toBe("client@example.com");
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

  it("loads the current user", () => {
    const response = {
      id: 1,
      name: "Client",
      email: "client@example.com",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    service.getCurrentUser().subscribe((user) => expect(user).toEqual(response));

    const request = httpTestingController.expectOne("/api/auth/me");
    expect(request.request.method).toBe("GET");
    request.flush(response);
  });

  it("updates the current user", () => {
    const input = { name: "Updated", email: "updated@example.com", password: "new-password" };
    const response = { id: 1, ...input, createdAt: "", updatedAt: "" };

    service.updateCurrentUser(input).subscribe((user) => expect(user).toEqual(response));

    const request = httpTestingController.expectOne("/api/auth/me");
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual(input);
    request.flush(response);
  });
});
