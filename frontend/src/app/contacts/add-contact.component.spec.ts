import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { of, throwError } from "rxjs";
import { AddContactComponent } from "./add-contact.component";
import { ChatService } from "../core/services/chat.service";

describe("AddContactComponent", () => {
  let component: AddContactComponent;
  let chatService: jasmine.SpyObj<ChatService>;
  const contact = { id: 1, email: "friend@example.com", name: "Friend" };

  beforeEach(() => {
    chatService = jasmine.createSpyObj("ChatService", [
      "listContacts",
      "addContact",
      "removeContact",
    ]);
    chatService.listContacts.and.returnValue(of([contact]));
    TestBed.configureTestingModule({
      providers: [
        { provide: ChatService, useValue: chatService },
        {
          provide: Router,
          useValue: jasmine.createSpyObj("Router", ["navigate"]),
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AddContactComponent());
  });

  it("loads contacts on construction", async () => {
    await component.refreshContacts();

    expect(component.contacts()).toEqual([contact]);
  });

  it("adds a trimmed contact and refreshes the list", async () => {
    chatService.addContact.and.returnValue(of(contact));
    component.contactEmail = "  friend@example.com ";

    await component.addContact();

    expect(chatService.addContact).toHaveBeenCalledWith("friend@example.com");
    expect(component.contactEmail).toBe("");
  });

  it("removes a contact locally after the request succeeds", async () => {
    chatService.removeContact.and.returnValue(of(undefined));

    await component.removeContact(1);

    expect(chatService.removeContact).toHaveBeenCalledWith(1);
    expect(component.contacts()).toEqual([]);
  });

  it("reports add failures and resets the busy state", async () => {
    chatService.addContact.and.returnValue(
      throwError(() => new Error("failed")),
    );
    component.contactEmail = "friend@example.com";

    await component.addContact();

    expect(component.contactError()).toBe("contacts.error");
    expect(component.isAdding()).toBe(false);
  });
});
