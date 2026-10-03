import { Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import { of, Subject, throwError } from "rxjs";
import { AuthService } from "../../core/services/auth";
import { AccountComponent } from "./account";

describe("AccountComponent", () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj("AuthService", [
      "getCurrentUser",
      "updateCurrentUser",
      "logout",
    ]);
    router = jasmine.createSpyObj("Router", ["navigate"]);
    translate = jasmine.createSpyObj("TranslateService", ["instant"]);
    translate.instant.and.returnValue("translated message");
  });

  it("keeps loading until the current user request resolves", () => {
    const userRequest = new Subject<{
      id: number;
      name: string;
      email: string;
      createdAt: string;
      updatedAt: string;
    }>();
    authService.getCurrentUser.and.returnValue(userRequest.asObservable());
    const component = new AccountComponent(authService, router, translate);

    component.ngOnInit();

    expect(component.isLoading()).toBeTrue();
    userRequest.next({
      id: 1,
      name: "Client",
      email: "client@example.com",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    expect(component.isLoading()).toBeFalse();
    expect(component.name).toBe("Client");
    expect(component.email).toBe("client@example.com");
  });

  it("reports a loading error and stops loading", () => {
    authService.getCurrentUser.and.returnValue(throwError(() => new Error("offline")));
    const component = new AccountComponent(authService, router, translate);

    component.ngOnInit();

    expect(component.errorMessage()).toBe("translated message");
    expect(component.isLoading()).toBeFalse();
    expect(translate.instant).toHaveBeenCalledWith("account.errors.load");
  });

  it("rejects incomplete or duplicate submissions", () => {
    const component = new AccountComponent(authService, router, translate);

    component.submit();
    component.name = "Client";
    component.email = "client@example.com";
    component.isSubmitting.set(true);
    component.submit();

    expect(authService.updateCurrentUser).not.toHaveBeenCalled();
  });

  it("submits trimmed account details and clears the password on success", () => {
    authService.updateCurrentUser.and.returnValue(
      of({
        id: 1,
        name: "Updated Client",
        email: "updated@example.com",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      }),
    );
    const component = new AccountComponent(authService, router, translate);
    component.name = "  Client  ";
    component.email = "  client@example.com  ";
    component.password = "new-password";

    component.submit();

    expect(authService.updateCurrentUser).toHaveBeenCalledWith({
      name: "Client",
      email: "client@example.com",
      password: "new-password",
    });
    expect(component.name).toBe("Updated Client");
    expect(component.email).toBe("updated@example.com");
    expect(component.password).toBe("");
    expect(component.message()).toBe("translated message");
    expect(component.isSubmitting()).toBeFalse();
  });

  it("maps invalid and unavailable save errors and resets submitting state", () => {
    const component = new AccountComponent(authService, router, translate);
    component.name = "Client";
    component.email = "client@example.com";
    authService.updateCurrentUser.and.returnValue(throwError(() => ({ status: 400 })));

    component.submit();

    expect(component.errorMessage()).toBe("translated message");
    expect(component.isSubmitting()).toBeFalse();

    authService.updateCurrentUser.and.returnValue(throwError(() => ({ status: 503 })));
    component.submit();

    expect(component.errorMessage()).toBe("translated message");
    expect(component.isSubmitting()).toBeFalse();
  });

  it("logs out and navigates to login", () => {
    const component = new AccountComponent(authService, router, translate);

    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(["/login"]);
  });
});
