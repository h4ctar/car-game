import { io } from "socket.io-client";
import { myId } from "./id";

export const socket = io({
    query: { id: myId },
});

socket.on("disconnect", () => {
    console.error("Socked disconnected");

    socket.close();

    $("#disconnected-modal").show();
});
