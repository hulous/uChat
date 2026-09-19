import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChatComponent } from "./chat.component";
import { RoomsComponent } from "./rooms.component";
import { ChatRoutingModule } from "./chat-routing.module";

@NgModule({
  imports: [CommonModule, FormsModule, ChatRoutingModule, ChatComponent, RoomsComponent],
})
export class ChatModule {}
