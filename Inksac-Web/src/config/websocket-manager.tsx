import { notifications } from "@mantine/notifications";
import type { WSCodes, WSMessage, WSType } from "../constants/types";

type MessageHandler = (message: WSMessage) => Promise<any> | void;
export type MessageHandlers = Partial<Record<WSType, MessageHandler>>;

type CloseHandler = (event?: CloseEvent) => void;
export type CloseHandlers = Partial<Record<WSCodes, CloseHandler>>;

export class WSManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private messageHandlers: MessageHandlers = {} as MessageHandlers;
  private closeHandlers: CloseHandlers = {} as CloseHandlers;
  private defaultCloseHandlers: CloseHandlers = {
    "1000": () => {
      return;
    },
    "1001": () => {
      return;
    },
    "1011": () => {
      this.reconnect();
      return;
    },
    "1006": () => {
      this.reconnect();
      return;
    },
    "1008": (event) => {
      console.error("Connection refused, ", event.reason);
      notifications.show({
        title: "Error",
        message: `Connection refused, ${event.reason}`,
        color: "red",
      });
    },
  };

  constructor(
    url: string,
    messageHandlers: MessageHandlers,
    closeHandlers?: CloseHandlers,
  ) {
    this.url = url;
    this.messageHandlers = messageHandlers;
    this.closeHandlers = { ...this.defaultCloseHandlers, ...closeHandlers };
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = (event) => {
      console.log("WS disconnected");
      this.handleClose(event);
    };

    this.ws.onerror = (error) => {
      console.error(error);
    };
  }

  send(message: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    this.ws?.close(1000);
  }

  isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private reconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000); //1 - 10 seconds
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  private async handleMessage(message: WSMessage) {
    const handler = this.messageHandlers[message.Mtype];
    if (handler) {
      const response = await handler(message);
      if (response) {
        return response;
      }
    } else {
      console.log("no handler for Mtype: ", message.Mtype);
    }
  }

  private handleClose(event: CloseEvent) {
    const handler = this.closeHandlers[event.code];
    if (handler) {
      handler(event);
    } else {
      this.reconnect();
    }
  }
}
