import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { authGuard } from "./app-routing.module";
import { AuthService } from "./core/services/auth";

describe("authGuard", () => {
  it("allows authenticated users", () => {
    const authService = jasmine.createSpyObj("AuthService", [
      "isAuthenticated",
    ]);
    authService.isAuthenticated.and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });

    expect(
      TestBed.runInInjectionContext(() =>
        authGuard(
          {} as never,
          {
            url: "/chat",
          } as never,
        ),
      ),
    ).toBe(true);
  });

  it("redirects unauthenticated users with their return URL", () => {
    const authService = jasmine.createSpyObj("AuthService", [
      "isAuthenticated",
    ]);
    const router = jasmine.createSpyObj("Router", ["createUrlTree"]);
    const urlTree = {} as never;
    authService.isAuthenticated.and.returnValue(false);
    router.createUrlTree.and.returnValue(urlTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    expect(
      TestBed.runInInjectionContext(() =>
        authGuard(
          {} as never,
          {
            url: "/account",
          } as never,
        ),
      ),
    ).toBe(urlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(["/login"], {
      queryParams: { returnUrl: "/account" },
    });
  });
});
