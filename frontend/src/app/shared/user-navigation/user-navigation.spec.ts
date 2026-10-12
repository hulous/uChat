import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth";
import { UserNavigationComponent } from "./user-navigation";

describe("UserNavigationComponent", () => {
  it("logs out and navigates to the login page", () => {
    const authService = jasmine.createSpyObj<AuthService>("AuthService", [
      "logout",
    ]);
    const router = jasmine.createSpyObj<Router>("Router", ["navigate"]);
    const component = new UserNavigationComponent(authService, router);

    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(["/login"]);
  });
});
