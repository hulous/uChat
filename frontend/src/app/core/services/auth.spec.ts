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

  it("does not persist authentication when login fails", () => {
    service
      .login({ email: "client@example.com", password: "wrong" })
      .subscribe({
        error: (error) => expect(error.status).toBe(401),
      });

    const request = httpTestingController.expectOne("/api/auth/login");
    request.flush(
      { message: "Invalid credentials" },
      { status: 401, statusText: "Unauthorized" },
    );

    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem("uchat.authentication")).toBeNull();
  });

  it("posts registration details and returns the created user", () => {
    const registration = {
      name: "Client",
      email: "client@example.com",
      password: "secret",
    };
    const response = {
      id: 1,
      name: registration.name,
      email: registration.email,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    service
      .register(registration)
      .subscribe((user) => expect(user).toEqual(response));

    const request = httpTestingController.expectOne("/api/auth/register");
    expect(request.request.method).toBe("POST");
    expect(request.request.body).toEqual(registration);
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

  it("treats authentication expiring now as unauthenticated", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
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
    expect(service.getToken()).toBe("jwt-token");
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

    service
      .getCurrentUser()
      .subscribe((user) => expect(user).toEqual(response));

    const request = httpTestingController.expectOne("/api/auth/me");
    expect(request.request.method).toBe("GET");
    request.flush(response);
  });

  it("updates the current user", () => {
    const input = {
      name: "Updated",
      email: "updated@example.com",
      password: "new-password",
    };
    const response = { id: 1, ...input, createdAt: "", updatedAt: "" };

    service
      .updateCurrentUser(input)
      .subscribe((user) => expect(user).toEqual(response));

    const request = httpTestingController.expectOne("/api/auth/me");
    expect(request.request.method).toBe("PUT");
    expect(request.request.body).toEqual(input);
    request.flush(response);
  });

  it("does not replace stored authentication when the update has no credentials", () => {
    const existingAuthentication = {
      token: "existing-jwt-token",
      expiresIn: 3600,
      email: "client@example.com",
      expiresAt: Date.now() + 3600,
    };
    localStorage.setItem(
      "uchat.authentication",
      JSON.stringify(existingAuthentication),
    );
    const response = {
      id: 1,
      name: "Updated",
      email: "updated@example.com",
      createdAt: "",
      updatedAt: "",
    };

    service
      .updateCurrentUser({ name: "Updated", email: response.email })
      .subscribe((user) => expect(user).toEqual(response));

    const request = httpTestingController.expectOne("/api/auth/me");
    request.flush(response);

    expect(JSON.parse(localStorage.getItem("uchat.authentication")!)).toEqual(
      existingAuthentication,
    );
  });

  it("persists the refreshed token, email, and expiration when updating the current user returns new credentials", () => {
    const input = {
      name: "Updated",
      email: "updated@example.com",
      password: "new-password",
    };
    const response = {
      id: 1,
      name: input.name,
      email: input.email,
      createdAt: "",
      updatedAt: "",
      token: "refreshed-jwt-token",
      expiresIn: 3600,
    };
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    service
      .updateCurrentUser(input)
      .subscribe((user) => expect(user).toEqual(response));

    const request = httpTestingController.expectOne("/api/auth/me");
    request.flush(response);

    expect(service.getToken()).toBe(response.token);
    expect(service.getEmail()).toBe(response.email);
    expect(JSON.parse(localStorage.getItem("uchat.authentication")!)).toEqual({
      token: response.token,
      expiresIn: response.expiresIn,
      email: response.email,
      expiresAt: now + response.expiresIn,
    });
  });

  it("keeps the existing authentication when updating the current user fails", () => {
    const existingAuthentication = {
      token: "existing-jwt-token",
      expiresIn: 3600,
      email: "client@example.com",
      expiresAt: Date.now() + 3600,
    };
    localStorage.setItem(
      "uchat.authentication",
      JSON.stringify(existingAuthentication),
    );

    service
      .updateCurrentUser({ name: "Updated", email: "updated@example.com" })
      .subscribe({
        error: (error) => expect(error.status).toBe(422),
      });

    const request = httpTestingController.expectOne("/api/auth/me");
    request.flush(
      { message: "Validation failed" },
      { status: 422, statusText: "Unprocessable Entity" },
    );

    expect(JSON.parse(localStorage.getItem("uchat.authentication")!)).toEqual(
      existingAuthentication,
    );
  });
});
