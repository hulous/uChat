import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ChatComponent } from "./chat.component";
import { RoomsComponent } from "../rooms/rooms.component";
import { AddContactComponent } from "../contacts/add-contact.component";

const routes: Routes = [
  { path: "", component: ChatComponent },
  { path: "rooms", component: RoomsComponent },
  { path: "contacts/add", component: AddContactComponent },
  { path: "rooms/:roomId", component: ChatComponent },
  { path: ":conversationId", component: ChatComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChatRoutingModule {}
