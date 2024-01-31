import { JoinEvent, config } from "@cargame/common";
import { socket } from "./socket";

const startCard = $("#start-card");
const startForm = $("#start-form");
const startButton = $("#start-button");
const usernameInput = $("#username-input");

startButton.prop("disabled", !usernameInput.val());
usernameInput.on("input", () =>
    startButton.prop("disabled", !usernameInput.val()),
);

startForm.on("submit", (event) => {
    console.info("Starting");

    let color = "pink";
    for (let i = 0; i < 5; i += 1) {
        const input = $(`#color-${i + 1}-input`);
        if (input.prop("checked")) {
            color = config.COLORS[i];
            break;
        }
    }

    const joinEvent: JoinEvent = {
        username: String(usernameInput.val()),
        color,
    };
    socket.emit("join", joinEvent);

    event.preventDefault();

    startCard.hide();
});

export const showStartCard = () => {
    startCard.show();
    usernameInput.trigger("focus");
};
